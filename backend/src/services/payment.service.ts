import prisma from '../lib/db';
import { PaymentFactory } from './payment/PaymentFactory';
import { BetflixService } from './betflix.service';
import { Decimal } from '@prisma/client/runtime/library';
import { LineNotifyService } from './line-notify.service';
import { AlertService } from './alert.service';

export class PaymentService {

    /**
     * Create a deposit request (Payin)
     */
    static async createAutoDeposit(userId: number, amount: number, gatewayCode?: string) {
        // 1. Validate Amount
        if (amount <= 0) throw new Error('Invalid amount');

        // Check Feature Toggle: auto_deposit
        const autoDepositFeature = await prisma.siteFeature.findUnique({ where: { key: 'auto_deposit' } });
        if (autoDepositFeature && !autoDepositFeature.isEnabled) {
            throw new Error('Auto deposit is disabled'); // Or localized message
        }

        // 2. Get Provider
        let provider;
        if (gatewayCode) {
            provider = await PaymentFactory.getProvider(gatewayCode);
        } else {
            provider = await PaymentFactory.getDefaultProvider();
        }

        if (!provider) {
            throw new Error('Payment gateway not available');
        }

        // 3. Get User
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        // 4. Create Transaction Record (PENDING)
        // We need a reference ID BEFORE calling the provider, so we use a placeholder or generate one first.
        const referenceId = `PAYIN_${Date.now()}_${userId}`;

        // Find gateway ID and validate config
        const gateway = await prisma.paymentGateway.findUnique({ where: { code: provider.code } });
        if (!gateway) {
            throw new Error('Payment gateway configuration not found');
        }
        if (!gateway.isActive) {
            throw new Error('Payment gateway is not active');
        }

        let gatewayConfig: any = {};
        try {
            gatewayConfig = JSON.parse(gateway.config);
        } catch (e) {
            console.error("Failed to parse gateway config", e);
        }

        if (gatewayConfig.canDeposit === false) {
            throw new Error('Deposit is temporarily disabled for this channel');
        }

        const transaction = await prisma.transaction.create({
            data: {
                userId,
                type: 'DEPOSIT',
                amount,
                balanceBefore: user.balance,
                balanceAfter: user.balance, // No change yet
                status: 'PENDING',
                // channel: 'auto', // Removed as it's not in schema
                subType: 'QRCODE', // or 'promptpay'
                paymentGatewayId: gateway?.id,
                referenceId: referenceId,
                note: `Auto Deposit via ${provider.code.toUpperCase()}`
            }
        });

        // 5. Call Provider to get QR
        const result = await provider.createPayin(amount, user, referenceId);

        if (!result.success) {
            // Update to FAILED
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'FAILED',
                    note: result.message || 'Provider Error',
                    rawResponse: JSON.stringify(result.rawResponse)
                }
            });
            throw new Error(result.message || 'Failed to create payment at provider');
        }

        // 6. Update Transaction with QR and External ID
        await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                externalId: result.transactionId,
                qrCode: result.qrCode,
                rawResponse: JSON.stringify(result.rawResponse)
            }
        });

        return {
            transactionId: transaction.id,
            referenceId: referenceId,
            qrCode: result.qrCode,
            amount: result.amount || amount,
            expiredAt: new Date(Date.now() + 15 * 60 * 1000) // 15 mins expiry estimation
        };
    }

    /**
     * Create a withdrawal request (Payout)
     */
    static async createWithdraw(userId: number, amount: number) {
        // 1. Validate Amount
        if (amount <= 0) throw new Error('Invalid amount');

        // 2. Get User
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');
        if (Number(user.balance) < amount) throw new Error('Insufficient balance');

        // 3. Get Bank Account (User's)
        if (!user.bankAccount || !user.bankName) {
            throw new Error('User bank account not found');
        }

        // ============================================
        // STEP A: หัก balance ใน DB ก่อน (Atomic) — ป้องกัน double-spend
        // ============================================
        const transaction = await prisma.$transaction(async (tx) => {
            // เช็ค balance อีกครั้งใน transaction (pessimistic)
            const freshUser = await tx.user.findUnique({ where: { id: userId } });
            if (!freshUser || Number(freshUser.balance) < amount) {
                throw new Error('ยอดเงินไม่เพียงพอ');
            }

            // หัก balance ทันที
            await tx.user.update({
                where: { id: userId },
                data: { balance: { decrement: amount } }
            });

            return await tx.transaction.create({
                data: {
                    userId,
                    type: 'WITHDRAW',
                    amount: new Decimal(amount),
                    balanceBefore: freshUser.balance,
                    balanceAfter: new Decimal(Number(freshUser.balance) - amount),
                    status: 'PENDING',
                    note: 'Withdraw Request',
                    paymentGatewayId: null
                }
            });
        });

        // ============================================
        // STEP B: ถอนจาก Game Wallet (Betflix) — หลัง DB หักแล้ว
        // ถ้าล้มเหลว → refund คืน DB
        // ============================================
        if (user.betflixUsername) {
            const success = await BetflixService.transfer(user.betflixUsername, -amount, `WDING_${transaction.id}`);
            if (!success) {
                // Betflix ล้มเหลว → คืนเงินใน DB
                await this.refundTransaction(transaction.id, userId, amount, 'ถอนจาก Game Wallet ล้มเหลว — คืนเงินอัตโนมัติ');
                throw new Error('ไม่สามารถถอนเงินออกจากเกมได้ (Game Wallet Error) — เงินถูกคืนแล้ว');
            }
        } else {
            console.warn(`User ${user.username} has no betflix wallet, withdrawing local balance only.`);
        }

        // Notify Admins via LINE
        LineNotifyService.notifyWithdraw(user.username, amount).catch(err => console.error('[LineNotify] Error:', err));

        // 5. Check Auto Withdraw Condition
        // Logic: Auto Feature ON + Gateway Auto ON + Gateway Withdraw ON
        let shouldAutoWithdraw = false;
        let activeGateway = null;

        // Check Global Feature Toggle: auto_withdraw
        const autoWithdrawFeature = await prisma.siteFeature.findUnique({ where: { key: 'auto_withdraw' } });
        const isAutoWithdrawEnabled = autoWithdrawFeature ? autoWithdrawFeature.isEnabled : true; // Default to true if missing? Or false? Better safe than sorry, maybe false if strictly controlled. But for back-compat? User asked for splitting.

        if (isAutoWithdrawEnabled) {
            try {
                const gateways = await prisma.paymentGateway.findMany({ where: { isActive: true } });
                for (const gateway of gateways) {
                    try {
                        const config = JSON.parse(gateway.config);
                        const canWithdraw = config.canWithdraw !== false;
                        const isAuto = config.isAutoWithdraw === true;

                        if (canWithdraw && isAuto) {
                            shouldAutoWithdraw = true;
                            activeGateway = gateway;
                            break;
                        }
                    } catch (e) { continue; }
                }
            } catch (error) {
                console.error('Error checking auto withdraw config', error);
            }
        }

        // 6. If Auto Withdraw is OFF, stop here.
        if (!shouldAutoWithdraw || !activeGateway) {
            return {
                success: true,
                message: 'สร้างรายการถอนเงินสำเร็จ รอตรวจสอบ',
                transactionId: transaction.id,
                status: 'PENDING'
            };
        }

        // 7. If Auto Withdraw is ON, proceed to convert to Payout
        try {
            // Update Gateway ID
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    paymentGatewayId: activeGateway.id,
                    note: 'Auto Withdraw Request'
                }
            });

            const provider = await PaymentFactory.getProvider(activeGateway.code);
            if (!provider) throw new Error('Provider not found');

            // Call Provider Payout
            const referenceId = `PAYOUT_${transaction.id}`;
            await prisma.transaction.update({ where: { id: transaction.id }, data: { referenceId } });

            const result = await provider.createPayout(amount, user, referenceId);

            if (result.success) {
                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        externalId: result.transactionId,
                        rawResponse: JSON.stringify(result.rawResponse)
                    }
                });
            } else {
                // Provider Rejected -> Refund EVERYTHING
                await this.refundTransaction(transaction.id, userId, amount, `Auto Withdraw Failed: ${result.message}`);

                return {
                    success: false,
                    message: `ทำรายการไม่สำเร็จ: ${result.message || 'Provider Rejected'}`,
                    transactionId: transaction.id,
                    status: 'FAILED'
                };
            }

            return {
                success: true,
                message: 'ดำเนินการถอนเงินสำเร็จ (รอเงินเข้าบัญชี)',
                transactionId: transaction.id,
                status: 'PENDING'
            };

        } catch (error: any) {
            console.error('Auto Withdraw Error:', error);
            // If we are unsure if provider called, we keep PENDING.
            // If we know it failed (e.g. factory error), we could refund, but safer to let admin Check.
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { note: `Auto Error: ${error.message}. Waiting Manual.` }
            });

            return {
                success: true,
                message: 'สร้างรายการถอนเงินสำเร็จ (ระบบถอนอัตโนมัติขัดข้อง รอตรวจสอบ)',
                transactionId: transaction.id,
                status: 'PENDING'
            };
        }
    }

    // Helper to Refund
    static async refundTransaction(transactionId: number, userId: number, amount: number, note: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });

        // 1. Refund Betflix
        if (user?.betflixUsername) {
            await BetflixService.transfer(user.betflixUsername, amount, `REFUND_${transactionId}`);
        }

        // 2. Refund Local & Update Status
        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { balance: { increment: amount } }
            }),
            prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    status: 'FAILED',
                    note: note
                }
            })
        ]);
    }

    /**
     * Process Webhook from Provider
     */
    static async processWebhook(gatewayCode: string, payload: any, headers: any, clientIp?: string) {
        // ... (Existing code) ...
        // 1. Get Provider
        const provider = await PaymentFactory.getProvider(gatewayCode);
        if (!provider) throw new Error(`Provider ${gatewayCode} not found`);

        // 2. Verify Webhook (pass client IP for provider-specific verification)
        if (!provider.verifyWebhook(payload, clientIp)) {
            const errorMsg = `Invalid Webhook from [${gatewayCode}] IP: ${clientIp || 'unknown'}`;
            console.error(errorMsg);

            // Create security alert for invalid webhook
            await AlertService.createAlert({
                type: 'WARNING',
                title: '⚠️ INVALID WEBHOOK RECEIVED',
                message: `Webhook verification failed for gateway [${gatewayCode}]. Client IP: ${clientIp}. ` +
                    `This may indicate a security issue or misconfiguration.`,
                actionUrl: `/admin/transactions`,
                actionRequired: false,  // Warning only, doesn't need immediate action
                metadata: {
                    gateway: gatewayCode,
                    clientIp: clientIp,
                    timestamp: new Date().toISOString(),
                    payload: payload  // Store payload for investigation
                }
            });

            throw new Error(errorMsg);
        }

        // 3. Process Payload
        const result = await provider.processWebhook(payload);

        // 4. Find Transaction
        const transaction = await prisma.transaction.findFirst({
            where: {
                OR: [
                    { referenceId: result.transactionId },
                    { externalId: result.externalId }
                ]
            },
            include: { user: true }
        });

        if (!transaction) {
            console.error(`Transaction not found for webhook: ${JSON.stringify(result)}`);

            // Create alert - transaction not found could indicate orphaned webhook
            await AlertService.createAlert({
                type: 'CRITICAL',
                title: '⚠️ WEBHOOK TRANSACTION NOT FOUND',
                message: `Webhook received from [${gatewayCode}] but matching transaction not found. ` +
                    `Reference ID: ${result.transactionId}. This may indicate a missing or stale transaction.`,
                actionUrl: `/admin/transactions`,
                actionRequired: false,
                metadata: {
                    gateway: gatewayCode,
                    referenceId: result.transactionId,
                    externalId: result.externalId,
                    timestamp: new Date().toISOString()
                }
            });

            return { success: false, message: 'Transaction not found' };
        }

        if (transaction.status === 'COMPLETED' || transaction.status === 'APPROVED' || transaction.status === 'PROCESSING') {
            return { success: true, message: 'Already processed or currently processing' };
        }

        // ============================================
        // PREVENT DOUBLE CREDIT: Atomic Optimistic Lock
        // ============================================
        // We update status from PENDING -> PROCESSING
        // If count === 0, another request already locked it.
        const lockUpdate = await prisma.transaction.updateMany({
            where: {
                id: transaction.id,
                status: 'PENDING'
            },
            data: {
                status: 'PROCESSING'
            }
        });

        if (lockUpdate.count === 0) {
            console.warn(`[Webhook] Duplicate concurrent request ignored for tx ${transaction.id}`);
            return { success: true, message: 'Already being processed by another request' };
        }

        // 5. Handle Status Change
        if (result.txStatus === 'SUCCESS') {
            const typeUpper = transaction.type.toUpperCase();

            // If DEPOSIT -> Betflix Transfer & Increment Balance
            if (typeUpper === 'DEPOSIT') {
                const amount = result.amount || Number(transaction.amount);

                // 2. Transfer to Betflix (Game Wallet) FIRST
                let betflixSuccess = false;
                let betflixError = '';

                if (transaction.user) {
                    const betflixResult = await BetflixService.ensureAndTransfer(
                        transaction.userId,
                        transaction.user.phone,
                        transaction.user.betflixUsername,
                        amount,
                        `PAYMENT_${transaction.id}`
                    );
                    betflixSuccess = betflixResult.success;
                    betflixError = betflixResult.error || '';
                }

                if (betflixSuccess) {
                    // Success: Update User Balance & Transaction Status
                    await prisma.user.update({
                        where: { id: transaction.userId },
                        data: { balance: { increment: amount } }
                    });

                    const updatedUser = await prisma.user.findUnique({ where: { id: transaction.userId } });

                    await prisma.transaction.update({
                        where: { id: transaction.id },
                        data: {
                            status: 'COMPLETED',
                            balanceAfter: updatedUser?.balance,
                            externalId: result.externalId || transaction.externalId,
                            rawResponse: JSON.stringify(result.rawResponse)
                        }
                    });

                    // Notify Admins via LINE
                    LineNotifyService.notifyDeposit(
                        transaction.user?.username || 'Unknown',
                        amount,
                        transaction.subType || 'Automatic'
                    ).catch(err => console.error('[LineNotify] Error:', err));

                    // ============================================
                    // TRIGGER STREAK BONUS CHECK
                    // ============================================
                    PaymentService.processStreakBonus(transaction.userId).catch(err => console.error('[Streak Bonus Error]:', err));
                } else {
                    // Betflix Failed: Mark Transaction as FAILED (UserBalance NOT incremented)
                    await prisma.transaction.update({
                        where: { id: transaction.id },
                        data: {
                            status: 'FAILED',
                            note: (transaction.note || '') + ` | Betflix Error: ${betflixError}`,
                            rawResponse: JSON.stringify(result.rawResponse)
                        }
                    });
                }
            }
            // If WITHDRAW -> Balance was already deducted. Just update status.
            else if (typeUpper === 'WITHDRAW') {
                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: 'COMPLETED',
                        externalId: result.externalId || transaction.externalId,
                        rawResponse: JSON.stringify(result.rawResponse)
                    }
                });
            }

        } else if (result.txStatus === 'FAILED') {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'FAILED',
                    note: result.message,
                    rawResponse: JSON.stringify(result.rawResponse)
                }
            });

            // If WITHDRAW -> Refund Balance
            if (transaction.type.toUpperCase() === 'WITHDRAW') {
                const amount = Number(transaction.amount);
                await prisma.user.update({
                    where: { id: transaction.userId },
                    data: { balance: { increment: amount } }
                });
            }
        }

        return { success: true };
    }

    /**
     * Process Streak Bonus
     * Checks if the user's recent deposits qualify for a daily streak bonus.
     */
    static async processStreakBonus(userId: number) {
        try {
            // 1. Get Settings ordered by day
            const settings = await prisma.streakSetting.findMany({
                where: { isActive: true },
                orderBy: { day: 'asc' }
            });

            if (settings.length === 0) return;

            const minDeposit = Number(settings[0].minDeposit) || 100;
            const maxDay = settings[settings.length - 1].day;

            // 2. Fetch deposits for the last X days + 1 (to be safe)
            const daysToLookBack = maxDay + 2;
            const LookBackDate = new Date();
            LookBackDate.setDate(LookBackDate.getDate() - daysToLookBack);

            const transactions = await prisma.transaction.findMany({
                where: {
                    userId,
                    type: 'DEPOSIT',
                    status: 'COMPLETED',
                    createdAt: { gte: LookBackDate }
                },
                select: {
                    amount: true,
                    createdAt: true
                },
                orderBy: { createdAt: 'desc' }
            });

            // 3. Group by Date
            const dailyDeposits: Record<string, number> = {};
            transactions.forEach(tx => {
                const dateStr = tx.createdAt.toISOString().split('T')[0];
                dailyDeposits[dateStr] = (dailyDeposits[dateStr] || 0) + Number(tx.amount);
            });

            // 4. Calculate Current Streak ending TODAY
            let currentStreak = 0;
            const today = new Date().toISOString().split('T')[0];

            // If they haven't met the minimum today, they can't get today's bonus yet.
            if ((dailyDeposits[today] || 0) < minDeposit) {
                return;
            }

            currentStreak = 1;
            let checkDate = new Date();
            checkDate.setDate(checkDate.getDate() - 1);

            for (let i = 1; i < maxDay; i++) {
                const dateStr = checkDate.toISOString().split('T')[0];
                if ((dailyDeposits[dateStr] || 0) >= minDeposit) {
                    currentStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }

            // Cap at max day config
            if (currentStreak > maxDay) currentStreak = maxDay;

            // 5. Does this day have a bonus config?
            const matchedSetting = settings.find(s => s.day === currentStreak);
            if (!matchedSetting || Number(matchedSetting.bonusAmount) <= 0) return;

            const bonusAmount = Number(matchedSetting.bonusAmount);

            // 6. Prevent Double Claim (Check if already received bonus for TODAY)
            // We use transaction note or a specific type, but best is to check a BONUS transaction today
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

            const existingBonus = await prisma.transaction.findFirst({
                where: {
                    userId,
                    type: 'BONUS',
                    note: {
                        contains: `Streak Day ${currentStreak}`
                    },
                    createdAt: {
                        gte: startOfToday
                    }
                }
            });

            if (existingBonus) return; // Already claimed

            // 7. Award the Bonus -> MUST go to BonusBalance and apply Turnover!
            const turnoverMultiplier = matchedSetting.turnoverMultiplier || 1;
            const requiredTurnover = bonusAmount * turnoverMultiplier;

            await prisma.$transaction(async (tx) => {
                const updatedUser = await tx.user.update({
                    where: { id: userId },
                    data: {
                        bonusBalance: { increment: bonusAmount }
                        // If you have a totalTurnover requirement field on the user in your actual setup, append it here.
                        // e.g. requiredTurnover: { increment: requiredTurnover }
                    }
                });

                await tx.transaction.create({
                    data: {
                        userId,
                        type: 'BONUS',
                        amount: new Decimal(bonusAmount),
                        balanceBefore: new Decimal(Number(updatedUser.bonusBalance) - bonusAmount), // This is BonusBalance technically now
                        balanceAfter: updatedUser.bonusBalance,
                        status: 'COMPLETED',
                        note: `Streak Day ${currentStreak} Bonus (Turnover x${turnoverMultiplier})`,
                    }
                });
            });

            console.log(`[Streak] Awarded day ${currentStreak} bonus of ${bonusAmount} to user ${userId}`);

        } catch (error) {
            console.error('[Streak Calculation Error]', error);
        }
    }
}

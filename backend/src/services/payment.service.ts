import prisma from '../lib/db';
import { PaymentFactory } from './payment/PaymentFactory';
import { BetflixService } from './betflix.service';
import { Decimal } from '@prisma/client/runtime/library';
import { LineNotifyService } from './line-notify.service';
import { TelegramNotifyService } from './telegram-notify.service';
import { AlertService } from './alert.service';
import { DepositBonusService } from './deposit-bonus.service.js';
import { PromotionSelectionService } from './promotion-selection.service.js';
import { TurnoverService } from './turnover.service.js';

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

        const selectedPromotion = await PromotionSelectionService.getSelectedPromotion(userId);
        if (selectedPromotion && amount < selectedPromotion.minDeposit) {
            throw new Error('SELECTED_PROMOTION_MIN_DEPOSIT_NOT_MET');
        }

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

        await PromotionSelectionService.bindSelectedPromotionToTransaction(
            userId,
            transaction.id,
            Number(result.amount || amount),
            'interactive'
        );

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

        const turnoverRemaining = TurnoverService.getRemaining(user);
        if (turnoverRemaining > 0) {
            throw new Error(`ท่านยังทำเทิร์นไม่ครบ (ขาดอีก ${turnoverRemaining.toLocaleString()} บาท)`);
        }

        // Check Turnover
        const currentTurnover = Number(user.currentTurnover || 0);
        const turnoverLimit = Number(user.turnoverLimit || 0);
        if (turnoverLimit > 0 && currentTurnover < turnoverLimit) {
            const missing = turnoverLimit - currentTurnover;
            throw new Error(`ท่านยังทำเทิร์นไม่ครบ (ขาดอีก ${missing.toLocaleString()} บาท)`);
        }

        // 3. Get Bank Account (User's)
        if (!user.bankAccount || !user.bankName) {
            throw new Error('User bank account not found');
        }

        // ============================================
        // STEP A: หัก balance ใน DB ก่อน (Atomic Optimistic Lock) — ป้องกัน double-spend
        // ============================================
        const transaction = await prisma.$transaction(async (tx) => {
            // เช็ค balance และหักเงินทันทีโดยใช้เงื่อนไข (Optimistic Concurrency Control)
            // วิธีนี้ Database จะหา Record ที่เงินพอเท่านั้น ถ้าไม่พอ `count` จะเป็น 0 ทันที 
            // ลดความเสี่ยงจาก Race condition 100%
            const updateResult = await tx.user.updateMany({
                where: {
                    id: userId,
                    balance: { gte: amount } // เช็คระดับ DB ว่ายอดต้องมากกว่าหรือเท่ากับที่ขอถอน
                },
                data: { balance: { decrement: amount } }
            });

            if (updateResult.count === 0) {
                throw new Error('ยอดเงินไม่เพียงพอ หรือมีการทำรายการซ้อนทับกัน');
            }

            // เนื่องจาก updateMany ไม่คืนค่า object ที่อัปเดต ต้องดึงค่าเพื่อทำ log
            const freshUser = await tx.user.findUnique({ where: { id: userId } });

            return await tx.transaction.create({
                data: {
                    userId,
                    type: 'WITHDRAW',
                    amount: new Decimal(amount),
                    balanceBefore: new Decimal(Number(freshUser!.balance) + amount), // ย้อนค่าก่อนหัก
                    balanceAfter: freshUser!.balance,
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
        // Notify Admins via Telegram
        TelegramNotifyService.notifyWithdraw(user.username, amount).catch(err => console.error('[Telegram] Error:', err));

        // 5. Check Auto Withdraw Condition
        // Logic: Auto Feature ON + Gateway Auto ON + Gateway Withdraw ON
        let shouldAutoWithdraw = false;
        let activeGateway = null;

        // Check Global Feature Toggle: auto_withdraw
        const autoWithdrawFeature = await prisma.siteFeature.findUnique({ where: { key: 'auto_withdraw' } });
        const isAutoWithdrawEnabled = autoWithdrawFeature ? autoWithdrawFeature.isEnabled : false;

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

        // --- NEW RULE: TrueMoney ALWAYS goes to manual review (PENDING) ---
        if (
            shouldAutoWithdraw &&
            user.bankName &&
            user.bankName.toUpperCase() === 'TRUEMONEY'
        ) {
            console.log(`[Withdraw] User ${user.username} is using TrueMoney. Bypassing Auto-Withdraw to force manual review.`);
            shouldAutoWithdraw = false;
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

        let requiresManualReconcile = false;

        try {
            if (result.txStatus === 'SUCCESS') {
                const typeUpper = transaction.type.toUpperCase();

                if (typeUpper === 'DEPOSIT') {
                    const amount = result.amount || Number(transaction.amount);

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

                    if (!betflixSuccess) {
                        await prisma.transaction.update({
                            where: { id: transaction.id },
                            data: {
                                status: 'FAILED',
                                note: (transaction.note || '') + ` | Betflix Error: ${betflixError}`,
                                rawResponse: JSON.stringify(result.rawResponse),
                                externalId: result.externalId || transaction.externalId
                            }
                        });

                        return { success: true };
                    }

                    requiresManualReconcile = true;

                    await prisma.$transaction(async (tx) => {
                        const updatedUser = await tx.user.update({
                            where: { id: transaction.userId },
                            data: { balance: { increment: amount } }
                        });

                        await tx.transaction.update({
                            where: { id: transaction.id },
                            data: {
                                status: 'COMPLETED',
                                balanceAfter: updatedUser.balance,
                                externalId: result.externalId || transaction.externalId,
                                rawResponse: JSON.stringify(result.rawResponse)
                            }
                        });
                    });

                    requiresManualReconcile = false;

                    LineNotifyService.notifyDeposit(
                        transaction.user?.username || 'Unknown',
                        amount,
                        transaction.subType || 'Automatic'
                    ).catch(err => console.error('[LineNotify] Error:', err));

                    TelegramNotifyService.notifyDeposit(
                        transaction.user?.username || 'Unknown',
                        amount,
                        transaction.subType || 'Automatic'
                    ).catch(err => console.error('[Telegram] Error:', err));

                    DepositBonusService.applyPostDepositBenefits(transaction.id).catch(err => console.error('[Deposit Bonus Error]:', err));
                } else if (typeUpper === 'WITHDRAW') {
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
                await prisma.$transaction(async (tx) => {
                    if (transaction.type.toUpperCase() === 'WITHDRAW') {
                        const amount = Number(transaction.amount);
                        await tx.user.update({
                            where: { id: transaction.userId },
                            data: { balance: { increment: amount } }
                        });
                    }

                    await tx.transaction.update({
                        where: { id: transaction.id },
                        data: {
                            status: 'FAILED',
                            note: result.message,
                            rawResponse: JSON.stringify(result.rawResponse),
                            externalId: result.externalId || transaction.externalId
                        }
                    });
                });
            } else {
                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: 'PENDING',
                        note: result.message || 'Waiting provider confirmation',
                        rawResponse: JSON.stringify(result.rawResponse),
                        externalId: result.externalId || transaction.externalId
                    }
                });
            }

            return { success: true };
        } catch (error: any) {
            console.error(`[Webhook] Processing failed for tx ${transaction.id}:`, error);

            if (requiresManualReconcile) {
                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: 'FAILED',
                        note: `${transaction.note || ''} | Manual reconcile required after Betflix transfer: ${error.message}`,
                    }
                }).catch(() => {});

                await AlertService.createAlert({
                    type: 'CRITICAL',
                    title: 'Deposit Reconciliation Required',
                    message: `Deposit transaction #${transaction.id} transferred to game wallet but local finalization failed. Manual review is required.`,
                    actionUrl: `/admin/transactions`,
                    actionRequired: true,
                    metadata: {
                        gateway: gatewayCode,
                        transactionId: transaction.id,
                        userId: transaction.userId,
                        error: error.message,
                        timestamp: new Date().toISOString(),
                    }
                }).catch(alertError => console.error('[AlertService] Reconcile alert error:', alertError));

                return {
                    success: false,
                    message: 'Deposit requires manual reconciliation'
                };
            }

            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'PENDING',
                    note: `${transaction.note || ''} | Webhook retry pending: ${error.message}`,
                }
            }).catch(() => {});

            throw error;
        }
    }

    static async processStreakBonus(userId: number) {
        await DepositBonusService.processStreakBonus(userId);
    }
}

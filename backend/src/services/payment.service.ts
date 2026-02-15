import prisma from '../lib/db';
import { PaymentFactory } from './payment/PaymentFactory';
import { BetflixService } from './betflix.service';
import { Decimal } from '@prisma/client/runtime/library';

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
                    status: 'failed',
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
        // BETFLIX SYNC: Deduct from Game Wallet First
        // ============================================
        if (user.betflixUsername) {
            const success = await BetflixService.transfer(user.betflixUsername, -amount, `WDING_${Date.now()}`);
            if (!success) {
                throw new Error('ไม่สามารถถอนเงินออกจากเกมได้ (Game Wallet Error)');
            }
        } else {
            // Check if system allows withdrawing without game wallet? 
            // Usually no, but for safety in dev we might allow. 
            // In Production "Single Wallet" implies user MUST have betflix wallet.
            // We will proceed but log warning.
            console.warn(`User ${user.username} has no betflix wallet, withdrawing local balance only.`);
        }

        // 4. Create Transaction (PENDING) & Deduct Local Balance
        // We deduct balance immediately to prevent double spend
        const transaction = await prisma.$transaction(async (tx) => {
            // Deduct User Balance (Sync with Game)
            await tx.user.update({
                where: { id: userId },
                data: { balance: { decrement: amount } }
            });

            return await tx.transaction.create({
                data: {
                    userId,
                    type: 'WITHDRAW',
                    amount: new Decimal(amount),
                    balanceBefore: user.balance,
                    balanceAfter: new Decimal(Number(user.balance) - amount),
                    status: 'PENDING',
                    note: 'Withdraw Request',
                    paymentGatewayId: null // Pending assignment
                }
            });
        });

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
    static async processWebhook(gatewayCode: string, payload: any, headers: any) {
        // ... (Existing code) ...
        // 1. Get Provider
        const provider = await PaymentFactory.getProvider(gatewayCode);
        if (!provider) throw new Error(`Provider ${gatewayCode} not found`);

        // 2. Verify Signature
        if (!provider.verifyWebhook(payload, headers)) {
            throw new Error('Invalid Webhook Signature');
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
            return { success: false, message: 'Transaction not found' };
        }

        if (transaction.status === 'success' || transaction.status === 'approved') {
            return { success: true, message: 'Already processed' };
        }

        // 5. Handle Status Change
        if (result.txStatus === 'SUCCESS') {
            const typeUpper = transaction.type.toUpperCase();

            // If DEPOSIT -> Betflix Transfer & Increment Balance
            if (typeUpper === 'DEPOSIT') {
                const amount = result.amount || Number(transaction.amount);

                // 2. Transfer to Betflix (Game Wallet) FIRST (Like AUTO_SMS)
                let betflixSuccess = false;
                let betflixError = '';

                if (transaction.user?.betflixUsername) {
                    try {
                        console.log(`[Payment] Auto-transferring ${amount} to Betflix for ${transaction.user.username}`);
                        betflixSuccess = await BetflixService.transfer(
                            transaction.user.betflixUsername,
                            amount,
                            `PAYMENT_${transaction.id}`
                        );
                    } catch (err: any) {
                        console.error('[Payment] Betflix transfer error:', err);
                        betflixError = err.message;
                    }
                } else {
                    betflixSuccess = true; // No game ID, treat as system only success
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
}

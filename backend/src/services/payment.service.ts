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
    static async createWithdraw(userId: number, amount: number, bankAccountId: number) {
        // 1. Validate Amount
        if (amount <= 0) throw new Error('Invalid amount');

        // 2. Get User
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');
        if (Number(user.balance) < amount) throw new Error('Insufficient balance');

        // 3. Get Bank Account (User's)
        // In this project, User model has bankName and bankAccount
        if (!user.bankAccount || !user.bankName) {
            throw new Error('User bank account not found');
        }

        // 4. Check Auto Withdraw Condition
        // Logic: Auto ON + Withdraw ON = Auto API
        // Any other combination = Manual (Pending)
        let shouldAutoWithdraw = false;
        let activeGateway = null;

        try {
            // Find the first active gateway (usually bibpay)
            // We prioritize the one that supports withdrawal if multiple exist, but for now just get first active
            const gateways = await prisma.paymentGateway.findMany({ where: { isActive: true } });

            for (const gateway of gateways) {
                try {
                    const config = JSON.parse(gateway.config);
                    // Check if this gateway supports auto withdraw
                    const canWithdraw = config.canWithdraw !== false; // Default true
                    const isAuto = config.isAutoWithdraw === true;   // Default false

                    if (canWithdraw && isAuto) {
                        shouldAutoWithdraw = true;
                        activeGateway = gateway;
                        break; // Found one, use it
                    }
                } catch (e) { continue; }
            }
        } catch (error) {
            console.error('Error checking auto withdraw config', error);
        }

        // 5. Create Transaction (PENDING)
        // We deduct balance immediately to prevent double spend
        const transaction = await prisma.transaction.create({
            data: {
                userId,
                type: 'WITHDRAW',
                amount: new Decimal(amount),
                balanceBefore: user.balance,
                balanceAfter: new Decimal(Number(user.balance) - amount),
                status: 'PENDING',
                note: shouldAutoWithdraw ? 'Auto Withdraw Request' : 'Manual Withdraw Request',
                paymentGatewayId: activeGateway?.id || null
            }
        });

        // Deduct User Balance
        await prisma.user.update({
            where: { id: userId },
            data: { balance: { decrement: amount } }
        });

        // 6. If Auto Withdraw is OFF, stop here.
        if (!shouldAutoWithdraw || !activeGateway) {
            return {
                success: true,
                message: 'สร้างรายการถอนเงินสำเร็จ รอตรวจสอบ (Manual)',
                transactionId: transaction.id,
                status: 'PENDING'
            };
        }

        // 7. If Auto Withdraw is ON, proceed to convert to Payout
        try {
            // Get Provider Instance from Factory
            const provider = await PaymentFactory.getProvider(activeGateway.code);

            if (!provider) {
                return {
                    success: true,
                    message: 'สร้างรายการถอนเงินสำเร็จ (Auto provider not found)',
                    transactionId: transaction.id,
                    status: 'PENDING'
                };
            }

            // Call Provider Payout
            const referenceId = `PAYOUT_${transaction.id}`;
            await prisma.transaction.update({ where: { id: transaction.id }, data: { referenceId } });

            // Note: provider.createPayout implementation usually expects (amount, user, refId)
            const result = await provider.createPayout(amount, user, referenceId);

            if (result.success) {
                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        externalId: result.transactionId,
                        rawResponse: JSON.stringify(result.rawResponse)
                        // Status remains pending until webhook confirms 'success'
                    }
                });
            } else {
                // Provider rejected request -> Mark as Failed and Refund
                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: 'FAILED',
                        note: `Auto Withdraw Failed: ${result.message || 'Provider Rejected'}`,
                        rawResponse: JSON.stringify(result.rawResponse)
                    }
                });
                // Refund
                await prisma.user.update({
                    where: { id: userId },
                    data: { balance: { increment: amount } }
                });
                // We return failure here so user knows immediate fail
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
                status: 'PENDING' // API called, waiting for webhook/bank
            };

        } catch (error: any) {
            console.error('Auto Withdraw Error:', error);
            // If error occurs during auto-process (e.g. network connectivity), 
            // we keep it as PENDING for manual review rather than failing/refunding immediately, 
            // unless we are sure it failed.
            // But if we throw, the user sees error 500.
            // We should swallow error and return PENDING with note.

            // However, if we didn't get a result from provider, we don't know if it went through.
            // Safest is to flag it for admin.
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

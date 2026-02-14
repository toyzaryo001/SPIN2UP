import prisma from '../lib/db';
import { PaymentFactory } from './payment/PaymentFactory';
import { BetflixService } from './betflix.service';

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
        // For simplicity, we assume we have the user's bank details stored in User model or passed in
        // In this project, User model has bankName and bankAccount
        if (!user.bankAccount || !user.bankName) {
            throw new Error('User bank account not found');
        }

        // 4. Check 'auto' feature toggle
        const autoFeature = await prisma.siteFeature.findUnique({ where: { key: 'auto' } });
        const isAutoWithdraw = autoFeature?.isEnabled ?? true; // Default to true if not found? Or user said "If close auto..." implied default might be ON.

        // 5. Create Transaction (PENDING)
        // We deduct balance immediately to prevent double spend
        const transaction = await prisma.transaction.create({
            data: {
                userId,
                type: 'WITHDRAW',
                amount,
                balanceBefore: user.balance,
                balanceAfter: Number(user.balance) - amount,
                status: 'PENDING', // Always start as pending
                note: isAutoWithdraw ? 'Auto Withdraw Request' : 'Manual Withdraw Request',
                paymentGatewayId: null // Pending until assigned
            }
        });

        // Deduct User Balance
        await prisma.user.update({
            where: { id: userId },
            data: { balance: { decrement: amount } }
        });

        // 6. If Auto Withdraw is OFF, stop here.
        if (!isAutoWithdraw) {
            return {
                success: true,
                message: 'Withdraw request submitted for review',
                transactionId: transaction.id,
                status: 'PENDING'
            };
        }

        // 7. If Auto Withdraw is ON, proceed to convert to Payout
        try {
            // Get Default Provider
            const provider = await PaymentFactory.getDefaultProvider();
            if (!provider) {
                // Should we fail or just leave as pending?
                // User requirement: "If open withdrawal and open auto... system will auto withdraw"
                // If no provider, fallback to manual (pending).
                return {
                    success: true,
                    message: 'Withdraw request submitted (No provider available for auto)',
                    transactionId: transaction.id,
                    status: 'PENDING'
                };
            }

            // Update Transaction with Gateway
            const gateway = await prisma.paymentGateway.findUnique({ where: { code: provider.code } });
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { paymentGatewayId: gateway?.id }
            });

            // Call Provider Payout
            // We use transaction ID as reference
            const referenceId = `PAYOUT_${transaction.id}`;
            await prisma.transaction.update({ where: { id: transaction.id }, data: { referenceId } });

            const result = await provider.createPayout(amount, user, referenceId);

            if (result.success) {
                // If provider says success immediately (some do)
                // Note via Webhook usually updates final status
                // But if the API call was successful, we keep it as pending (waiting for webhook) or update if result says completed
                // BibPay usually is PENDING then Webhook.
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
                        status: 'failed',
                        note: result.message || 'Provider Rejected',
                        rawResponse: JSON.stringify(result.rawResponse)
                    }
                });
                // Refund
                await prisma.user.update({
                    where: { id: userId },
                    data: { balance: { increment: amount } }
                });
                throw new Error(result.message || 'Payout failed');
            }

            return {
                success: true,
                message: 'Auto withdraw initiated',
                transactionId: transaction.id,
                status: 'PENDING' // API called, waiting for webhook
            };

        } catch (error: any) {
            console.error('Auto Withdraw Error:', error);
            // If error occurs during auto-process, keep as PENDING or FAILED?
            // User might want to retry manually.
            // Let's keep it PENDING if it was an internal error, but maybe update note.
            // Actually, if we already deducted money, safe to leave as PENDING for admin check.
            return {
                success: true,
                message: 'Withdraw request submitted (Auto process failed, pending manual review)',
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

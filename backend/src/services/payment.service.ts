import prisma from '../lib/db';
import { PaymentFactory } from './payment/PaymentFactory';

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

        // Find gateway ID for relation
        const gateway = await prisma.paymentGateway.findUnique({ where: { code: provider.code } });

        const transaction = await prisma.transaction.create({
            data: {
                userId,
                type: 'deposit',
                amount,
                balanceBefore: user.balance,
                balanceAfter: user.balance, // No change yet
                status: 'pending',
                channel: 'auto',
                subType: 'qrcode', // or 'promptpay'
                paymentGatewayId: gateway?.id,
                referenceId: referenceId,
                description: `Auto Deposit via ${provider.code.toUpperCase()}`
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
     * Process Webhook from Provider
     */
    static async processWebhook(gatewayCode: string, payload: any, headers: any) {
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
        // We assume transactionId in result is OUR referenceId, or we try to search by externalId
        const transaction = await prisma.transaction.findFirst({
            where: {
                OR: [
                    { referenceId: result.transactionId }, // Ideally verifyWebhook result returns standardized ID
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
            const amount = result.amount || Number(transaction.amount);

            // Start Transaction for atomic balance update
            await prisma.$transaction(async (tx) => {
                // Update Transaction
                await tx.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: 'success',
                        balanceAfter: { increment: amount }, // Logic check: actually we should fetch user balance first
                        externalId: result.externalId || transaction.externalId,
                        rawResponse: JSON.stringify(result.rawResponse)
                    }
                });

                // Credit User
                // Update user logic here (call Seamless wallet if needed, or local balance)
                // For now, updating local balance as per requirement fallback
                const updatedUser = await tx.user.update({
                    where: { id: transaction.userId },
                    data: { balance: { increment: amount } }
                });

                // Update transaction balance snapshot
                await tx.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        balanceBefore: updatedUser.balance.sub(amount), // approx
                        balanceAfter: updatedUser.balance
                    }
                });

                // TODO: Trigger Game Wallet Deposit if configured
            });

        } else if (result.txStatus === 'FAILED') {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'failed',
                    note: result.message,
                    rawResponse: JSON.stringify(result.rawResponse)
                }
            });
        }

        return { success: true };
    }
}

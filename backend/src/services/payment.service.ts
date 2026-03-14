import prisma from '../lib/db';
import { PaymentFactory } from './payment/PaymentFactory';
import { Decimal } from '@prisma/client/runtime/library';
import { LineNotifyService } from './line-notify.service';
import { TelegramNotifyService } from './telegram-notify.service';
import { AlertService } from './alert.service';
import { DepositBonusService } from './deposit-bonus.service.js';
import { PromotionSelectionService } from './promotion-selection.service.js';
import { TurnoverService } from './turnover.service.js';
import { AgentWalletService } from './agent-wallet.service.js';

export class PaymentService {
    private static normalizeCheckedTransaction(rawResult: any) {
        const data = rawResult?.data?.transaction || rawResult?.data || {};
        const status = String(data.status || '').toLowerCase();

        let txStatus: 'SUCCESS' | 'FAILED' | 'PENDING' = 'PENDING';
        if (status === 'completed' || status === 'success') {
            txStatus = 'SUCCESS';
        } else if (['failed', 'fail', 'timeout', 'expired'].includes(status)) {
            txStatus = 'FAILED';
        }

        return {
            success: Boolean(rawResult?.status),
            txStatus,
            transactionId: data.refferend || data.reference || data.referenceId || '',
            externalId: data.transactionId || data.transaction_id,
            amount: Number(data.depositAmount || data.amount || 0),
            message: data.message || rawResult?.message || rawResult?.msg,
            rawResponse: rawResult
        };
    }

    private static async processTransactionResult(
        transaction: any,
        result: {
            txStatus: 'SUCCESS' | 'FAILED' | 'PENDING';
            externalId?: string;
            amount?: number;
            message?: string;
            rawResponse?: any;
        },
        gatewayCode: string
    ) {
        let requiresManualReconcile = false;

        try {
            if (result.txStatus === 'SUCCESS') {
                const typeUpper = String(transaction.type || '').toUpperCase();

                if (typeUpper === 'DEPOSIT') {
                    const amount = result.amount || Number(transaction.amount);

                    await AgentWalletService.creditMainAgent(
                        transaction.userId,
                        amount,
                        `PAYMENT_${transaction.id}`,
                        `Deposit transaction ${transaction.id}`,
                        transaction.id
                    );

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

                    DepositBonusService.applyPostDepositBenefits(transaction.id)
                        .catch(err => console.error('[Deposit Bonus Error]:', err));
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
                if (String(transaction.type || '').toUpperCase() === 'WITHDRAW') {
                    await this.refundTransaction(
                        transaction.id,
                        transaction.userId,
                        Number(transaction.amount),
                        result.message || 'Withdraw failed'
                    );
                } else {
                    await prisma.transaction.update({
                        where: { id: transaction.id },
                        data: {
                            status: 'FAILED',
                            note: result.message,
                            rawResponse: JSON.stringify(result.rawResponse),
                            externalId: result.externalId || transaction.externalId
                        }
                    });
                }
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
                        note: `${transaction.note || ''} | Manual reconcile required after agent credit: ${error.message}`,
                    }
                }).catch(() => {});

                await AlertService.createAlert({
                    type: 'CRITICAL',
                    title: 'Deposit Reconciliation Required',
                    message: `Deposit transaction #${transaction.id} transferred to agent wallet but local finalization failed. Manual review is required.`,
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

    static async createAutoDeposit(userId: number, amount: number, gatewayCode?: string) {
        if (amount <= 0) throw new Error('Invalid amount');

        const autoDepositFeature = await prisma.siteFeature.findUnique({ where: { key: 'auto_deposit' } });
        if (autoDepositFeature && !autoDepositFeature.isEnabled) {
            throw new Error('Auto deposit is disabled');
        }

        const provider = gatewayCode
            ? await PaymentFactory.getProvider(gatewayCode)
            : await PaymentFactory.getDefaultProvider();

        if (!provider) {
            throw new Error('Payment gateway not available');
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        const selectedPromotion = await PromotionSelectionService.getSelectedPromotion(userId);
        if (selectedPromotion && amount < selectedPromotion.minDeposit) {
            throw new Error('SELECTED_PROMOTION_MIN_DEPOSIT_NOT_MET');
        }

        const referenceId = `PAYIN_${Date.now()}_${userId}`;
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
        } catch (error) {
            console.error('Failed to parse gateway config', error);
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
                balanceAfter: user.balance,
                status: 'PENDING',
                subType: 'QRCODE',
                paymentGatewayId: gateway.id,
                referenceId,
                note: `Auto Deposit via ${provider.code.toUpperCase()}`
            }
        });

        const result = await provider.createPayin(amount, user, referenceId);

        if (!result.success) {
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
            referenceId,
            qrCode: result.qrCode,
            amount: result.amount || amount,
            expiredAt: new Date(Date.now() + 15 * 60 * 1000)
        };
    }

    static async createWithdraw(userId: number, amount: number) {
        if (amount <= 0) throw new Error('Invalid amount');

        let user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        const syncedBalance = await AgentWalletService.syncLocalBalanceFromAgents(userId)
            .catch(() => Number(user?.balance || 0));
        if (syncedBalance !== Number(user.balance)) {
            user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) throw new Error('User not found');
        }

        if (Number(user.balance) < amount) throw new Error('Insufficient balance');

        const turnoverRemaining = TurnoverService.getRemaining(user);
        if (turnoverRemaining > 0) {
            throw new Error(`ท่านยังทำเทิร์นไม่ครบ (ขาดอีก ${turnoverRemaining.toLocaleString()} บาท)`);
        }

        if (!user.bankAccount || !user.bankName) {
            throw new Error('User bank account not found');
        }

        const transaction = await prisma.$transaction(async (tx) => {
            const updateResult = await tx.user.updateMany({
                where: {
                    id: userId,
                    balance: { gte: amount }
                },
                data: { balance: { decrement: amount } }
            });

            if (updateResult.count === 0) {
                throw new Error('ยอดเงินไม่เพียงพอ หรือมีรายการซ้อนทับกัน');
            }

            const freshUser = await tx.user.findUnique({ where: { id: userId } });

            return tx.transaction.create({
                data: {
                    userId,
                    type: 'WITHDRAW',
                    amount: new Decimal(amount),
                    balanceBefore: new Decimal(Number(freshUser!.balance) + amount),
                    balanceAfter: freshUser!.balance,
                    status: 'PENDING',
                    note: 'Withdraw Request',
                    paymentGatewayId: null
                }
            });
        });

        try {
            await AgentWalletService.pullFundsForWithdrawal(
                userId,
                amount,
                `WDING_${transaction.id}`,
                transaction.id
            );
        } catch (error: any) {
            await this.refundTransaction(
                transaction.id,
                userId,
                amount,
                `Withdraw pull failed: ${error.message}`
            );
            throw new Error(`ไม่สามารถดึงเครดิตจากกระดานเกมได้ (${error.message})`);
        }

        LineNotifyService.notifyWithdraw(user.username, amount).catch(err => console.error('[LineNotify] Error:', err));
        TelegramNotifyService.notifyWithdraw(user.username, amount).catch(err => console.error('[Telegram] Error:', err));

        let shouldAutoWithdraw = false;
        let activeGateway: any = null;

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
                    } catch {
                        continue;
                    }
                }
            } catch (error) {
                console.error('Error checking auto withdraw config', error);
            }
        }

        if (
            shouldAutoWithdraw &&
            user.bankName &&
            user.bankName.toUpperCase() === 'TRUEMONEY'
        ) {
            console.log(`[Withdraw] User ${user.username} is using TrueMoney. Bypassing Auto-Withdraw to force manual review.`);
            shouldAutoWithdraw = false;
        }

        if (!shouldAutoWithdraw || !activeGateway) {
            return {
                success: true,
                message: 'สร้างรายการถอนเงินสำเร็จ รอตรวจสอบ',
                transactionId: transaction.id,
                status: 'PENDING'
            };
        }

        try {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    paymentGatewayId: activeGateway.id,
                    note: 'Auto Withdraw Request'
                }
            });

            const provider = await PaymentFactory.getProvider(activeGateway.code);
            if (!provider) throw new Error('Provider not found');

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

    static async refundTransaction(transactionId: number, userId: number, amount: number, note: string) {
        const pulls = await AgentWalletService.getPulledFundsForTransaction(transactionId);
        if (pulls.length > 0) {
            await AgentWalletService.refundPulledFunds(
                pulls,
                `REFUND_${transactionId}`,
                note,
                transactionId
            );
        }

        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { balance: { increment: amount } }
            }),
            prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    status: 'FAILED',
                    note
                }
            })
        ]);
    }

    static async getDepositStatus(userId: number, transactionId: number) {
        let transaction = await prisma.transaction.findFirst({
            where: {
                id: transactionId,
                userId,
                type: 'DEPOSIT'
            },
            include: {
                user: true,
                paymentGateway: true
            }
        });

        if (!transaction) {
            throw new Error('Deposit transaction not found');
        }

        if (transaction.status === 'PENDING' && transaction.referenceId && transaction.paymentGateway?.code) {
            const provider = await PaymentFactory.getProvider(transaction.paymentGateway.code);

            if (provider?.checkTransactionStatus) {
                try {
                    const checkedResult = await provider.checkTransactionStatus(transaction.referenceId);
                    const normalizedResult = this.normalizeCheckedTransaction(checkedResult);

                    if (normalizedResult.success) {
                        const lockUpdate = await prisma.transaction.updateMany({
                            where: {
                                id: transaction.id,
                                status: 'PENDING'
                            },
                            data: {
                                status: 'PROCESSING'
                            }
                        });

                        if (lockUpdate.count > 0) {
                            await this.processTransactionResult(transaction, normalizedResult, transaction.paymentGateway.code);
                        }
                    }
                } catch (error) {
                    console.error(`[Deposit Status Check] Failed for tx ${transaction.id}:`, error);
                }

                transaction = await prisma.transaction.findFirst({
                    where: {
                        id: transactionId,
                        userId,
                        type: 'DEPOSIT'
                    },
                    include: {
                        user: true,
                        paymentGateway: true
                    }
                });
            }
        }

        if (!transaction) {
            throw new Error('Deposit transaction not found');
        }

        return {
            id: transaction.id,
            status: transaction.status,
            amount: Number(transaction.amount),
            balanceAfter: Number(transaction.balanceAfter || 0),
            referenceId: transaction.referenceId,
            externalId: transaction.externalId,
            note: transaction.note,
            updatedAt: transaction.updatedAt
        };
    }

    static async processWebhook(gatewayCode: string, payload: any, headers: any, clientIp?: string) {
        const provider = await PaymentFactory.getProvider(gatewayCode);
        if (!provider) throw new Error(`Provider ${gatewayCode} not found`);

        if (!provider.verifyWebhook(payload, clientIp)) {
            const errorMsg = `Invalid Webhook from [${gatewayCode}] IP: ${clientIp || 'unknown'}`;
            console.error(errorMsg);

            await AlertService.createAlert({
                type: 'WARNING',
                title: 'Invalid webhook received',
                message: `Webhook verification failed for gateway [${gatewayCode}]. Client IP: ${clientIp}. This may indicate a security issue or misconfiguration.`,
                actionUrl: `/admin/transactions`,
                actionRequired: false,
                metadata: {
                    gateway: gatewayCode,
                    clientIp,
                    timestamp: new Date().toISOString(),
                    payload
                }
            });

            throw new Error(errorMsg);
        }

        const result = await provider.processWebhook(payload);

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

            await AlertService.createAlert({
                type: 'CRITICAL',
                title: 'Webhook transaction not found',
                message: `Webhook received from [${gatewayCode}] but matching transaction not found. Reference ID: ${result.transactionId}.`,
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

        if (['COMPLETED', 'APPROVED', 'PROCESSING'].includes(transaction.status)) {
            return { success: true, message: 'Already processed or currently processing' };
        }

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

        return this.processTransactionResult(transaction, result, gatewayCode);
    }
}

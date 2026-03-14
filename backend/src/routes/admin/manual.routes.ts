import { Router } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../lib/db.js';
import { AuthRequest, requirePermission } from '../../middlewares/auth.middleware.js';
import { DepositBonusService } from '../../services/deposit-bonus.service.js';
import { TurnoverService } from '../../services/turnover.service.js';
import { AgentWalletService } from '../../services/agent-wallet.service.js';
import { PaymentService } from '../../services/payment.service.js';
import { LineNotifyService } from '../../services/line-notify.service.js';
import { TelegramNotifyService } from '../../services/telegram-notify.service.js';

const router = Router();

const resolveWithdrawNotifyMethod = (bankName?: string | null, gatewayCode?: string | null) => {
    if (gatewayCode) {
        return `Payment (${String(gatewayCode).toUpperCase()})`;
    }

    if (String(bankName || '').toUpperCase() === 'TRUEMONEY') {
        return 'TrueWallet';
    }

    return bankName ? `Bank (${bankName})` : 'Bank';
};

router.post('/deposit', async (req: AuthRequest, res) => {
    try {
        const { userId, amount, subType, note, turnoverAmount } = req.body;

        if (!userId || !amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' });
        }

        const isBonus = typeof subType === 'string' && subType.startsWith('bonus');
        const normalizedTurnoverAmount = Number(turnoverAmount || 0);
        const requiredPermission = 'deposit';

        const admin = await prisma.admin.findUnique({
            where: { id: req.user!.userId },
            include: { role: true }
        });

        if (!admin?.isSuperAdmin) {
            let permissions: any = {};
            try {
                permissions = JSON.parse(admin?.role?.permissions || '{}');
            } catch {
                permissions = {};
            }

            if (permissions.manual?.[requiredPermission]?.manage !== true) {
                return res.status(403).json({
                    success: false,
                    message: `ไม่มีสิทธิ์: manual.${requiredPermission}.manage`
                });
            }
        }

        const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }

        const balanceBefore = isBonus ? user.bonusBalance : user.balance;
        const balanceAfter = Number(balanceBefore) + Number(amount);

        if (!isBonus) {
            try {
                await AgentWalletService.creditMainAgent(
                    user.id,
                    Number(amount),
                    `MANUAL_${Date.now()}`,
                    'Manual credit'
                );
            } catch (error: any) {
                return res.status(502).json({
                    success: false,
                    message: error.message || 'เติมเงินเข้ากระดานหลักไม่สำเร็จ'
                });
            }
        }

        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            if (isBonus) {
                await tx.user.update({
                    where: { id: user.id },
                    data: { bonusBalance: new Prisma.Decimal(balanceAfter) }
                });
            } else {
                await tx.user.update({
                    where: { id: user.id },
                    data: { balance: new Prisma.Decimal(balanceAfter) }
                });
            }

            await tx.transaction.create({
                data: {
                    userId: user.id,
                    type: isBonus ? 'BONUS' : 'MANUAL_ADD',
                    subType: subType || 'credit',
                    amount: new Prisma.Decimal(amount),
                    balanceBefore,
                    balanceAfter: new Prisma.Decimal(balanceAfter),
                    status: 'COMPLETED',
                    note: note || `เติม${isBonus ? 'โบนัส' : 'เครดิต'}โดยแอดมิน`,
                    adminId: req.user!.userId,
                },
            });

            if (isBonus && normalizedTurnoverAmount > 0) {
                await TurnoverService.addManualRequirement(user.id, normalizedTurnoverAmount, tx);
            }

            await tx.editLog.create({
                data: {
                    targetType: 'Transaction',
                    targetId: user.id,
                    field: 'MANUAL_DEPOSIT',
                    oldValue: String(balanceBefore),
                    newValue: String(balanceAfter),
                    adminId: req.user!.userId,
                },
            });
        });

        LineNotifyService.notifyManualCredit(
            user.username,
            Number(amount),
            user.fullName || null,
            note || null
        ).catch(err => console.error('[LineNotify] Manual credit error:', err));

        TelegramNotifyService.notifyManualCredit(
            user.username,
            Number(amount),
            user.fullName || null,
            note || null
        ).catch(err => console.error('[Telegram] Manual credit error:', err));

        return res.json({
            success: true,
            message: 'เติมเงินสำเร็จ',
            data: {
                newBalance: balanceAfter,
                turnoverAmount: isBonus ? normalizedTurnoverAmount : 0
            }
        });
    } catch (error) {
        console.error('Manual deposit error:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

router.post('/deduct', requirePermission('manual', 'withdraw', 'manage'), async (req: AuthRequest, res) => {
    try {
        const { userId, amount, subType, note } = req.body;

        if (!userId || !amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' });
        }

        const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }

        const isBonus = typeof subType === 'string' && subType.startsWith('bonus');
        const balanceBefore = isBonus ? user.bonusBalance : user.balance;

        if (Number(balanceBefore) < amount) {
            return res.status(400).json({ success: false, message: 'ยอดเงินไม่เพียงพอ' });
        }

        const balanceAfter = Number(balanceBefore) - Number(amount);

        if (!isBonus) {
            try {
                await AgentWalletService.pullFundsForWithdrawal(
                    user.id,
                    Number(amount),
                    `DEDUCT_${Date.now()}`
                );
            } catch (error: any) {
                return res.status(500).json({ success: false, message: error.message || 'ดึงเงินจากกระดานเกมไม่สำเร็จ' });
            }
        }

        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            if (isBonus) {
                await tx.user.update({
                    where: { id: user.id },
                    data: { bonusBalance: new Prisma.Decimal(balanceAfter) }
                });
            } else {
                await tx.user.update({
                    where: { id: user.id },
                    data: { balance: new Prisma.Decimal(balanceAfter) }
                });
            }

            await tx.transaction.create({
                data: {
                    userId: user.id,
                    type: 'MANUAL_DEDUCT',
                    subType: subType || 'credit',
                    amount: new Prisma.Decimal(amount),
                    balanceBefore,
                    balanceAfter: new Prisma.Decimal(balanceAfter),
                    status: 'COMPLETED',
                    note: note || 'ลดเครดิตโดยแอดมิน',
                    adminId: req.user!.userId,
                },
            });

            await tx.editLog.create({
                data: {
                    targetType: 'Transaction',
                    targetId: user.id,
                    field: 'MANUAL_DEDUCT',
                    oldValue: String(balanceBefore),
                    newValue: String(balanceAfter),
                    adminId: req.user!.userId,
                },
            });
        });

        LineNotifyService.notifyManualDeduct(
            user.username,
            Number(amount),
            user.fullName || null,
            note || null
        ).catch(err => console.error('[LineNotify] Manual deduct error:', err));

        TelegramNotifyService.notifyManualDeduct(
            user.username,
            Number(amount),
            user.fullName || null,
            note || null
        ).catch(err => console.error('[Telegram] Manual deduct error:', err));

        return res.json({ success: true, message: 'ลดเครดิตสำเร็จ', data: { newBalance: balanceAfter } });
    } catch (error) {
        console.error('Manual deduct error:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

router.post('/approve-withdrawal', requirePermission('manual', 'withdrawals', 'manage'), async (req: AuthRequest, res) => {
    try {
        const { transactionId, mode, gatewayCode } = req.body;

        const transaction = await prisma.transaction.findUnique({
            where: { id: Number(transactionId) },
            include: { user: true, paymentGateway: true },
        });

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'ไม่พบรายการ' });
        }

        if (transaction.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'รายการนี้ถูกดำเนินการแล้ว' });
        }

        const admin = await prisma.admin.findUnique({
            where: { id: req.user!.userId },
            select: { username: true, fullName: true }
        });
        const adminName = admin?.fullName || admin?.username || `Admin #${req.user!.userId}`;

        if (mode === 'auto') {
            const { PaymentFactory } = require('../../services/payment/PaymentFactory');
            const code = gatewayCode || 'bibpay';
            const provider = await PaymentFactory.getProvider(code);

            if (!provider) {
                return res.status(400).json({ success: false, message: `Payment Provider ${code} not found` });
            }

            const refId = `PAYOUT_ADMIN_${transaction.id}`;
            await prisma.transaction.update({ where: { id: transaction.id }, data: { referenceId: refId } });

            const result = await provider.createPayout(Number(transaction.amount), transaction.user, refId);

            if (result.success) {
                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: 'COMPLETED',
                        externalId: result.transactionId,
                        rawResponse: JSON.stringify(result.rawResponse),
                        adminId: req.user!.userId,
                        note: (transaction.note || '') + ' [Auto-Approved]'
                    },
                });

                TelegramNotifyService.notifyWithdrawApproved({
                    username: transaction.user.username,
                    fullName: transaction.user.fullName || null,
                    amount: Number(transaction.amount),
                    bankName: transaction.user.bankName || null,
                    bankAccount: transaction.user.bankAccount || null,
                    method: resolveWithdrawNotifyMethod(transaction.user.bankName, code),
                    transactionId: transaction.id,
                    adminName,
                    note: `Auto payout via ${code.toUpperCase()}`
                }).catch(err => console.error('[Telegram] Withdraw approve notify error:', err));

                return res.json({ success: true, message: 'ทำรายการถอนอัตโนมัติสำเร็จ' });
            }

            return res.status(400).json({
                success: false,
                message: `ทำรายการถอนอัตโนมัติไม่สำเร็จ: ${result.message}`,
                details: result.rawResponse
            });
        }

        await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                status: 'COMPLETED',
                adminId: req.user!.userId,
                note: (transaction.note || '') + ' [Manual-Approved]'
            },
        });

        TelegramNotifyService.notifyWithdrawApproved({
            username: transaction.user.username,
            fullName: transaction.user.fullName || null,
            amount: Number(transaction.amount),
            bankName: transaction.user.bankName || null,
            bankAccount: transaction.user.bankAccount || null,
            method: resolveWithdrawNotifyMethod(transaction.user.bankName),
            transactionId: transaction.id,
            adminName,
            note: 'Manual approved'
        }).catch(err => console.error('[Telegram] Withdraw approve notify error:', err));

        return res.json({ success: true, message: 'อนุมัติสำเร็จ (Manual)' });
    } catch (error: any) {
        console.error('Approve withdrawal error:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
    }
});

router.post('/reject-withdrawal', requirePermission('manual', 'withdrawals', 'manage'), async (req: AuthRequest, res) => {
    try {
        const { transactionId, note, refund } = req.body;

        const transaction = await prisma.transaction.findUnique({
            where: { id: Number(transactionId) },
            include: { user: true, paymentGateway: true }
        });

        if (!transaction || transaction.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'รายการไม่ถูกต้อง' });
        }

        const admin = await prisma.admin.findUnique({
            where: { id: req.user!.userId },
            select: { username: true, fullName: true }
        });
        const adminName = admin?.fullName || admin?.username || `Admin #${req.user!.userId}`;
        const shouldRefund = refund !== false;

        if (shouldRefund) {
            const amount = Number(transaction.amount);

            await PaymentService.refundTransaction(
                transaction.id,
                transaction.userId,
                amount,
                note || 'Manual withdrawal rejected'
            );

            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 'REJECTED', note, adminId: req.user!.userId }
            });

            TelegramNotifyService.notifyWithdrawRejected({
                username: transaction.user.username,
                fullName: transaction.user.fullName || null,
                amount: Number(transaction.amount),
                bankName: transaction.user.bankName || null,
                bankAccount: transaction.user.bankAccount || null,
                method: resolveWithdrawNotifyMethod(transaction.user.bankName, transaction.paymentGateway?.code || null),
                transactionId: transaction.id,
                adminName,
                note: note || 'Manual withdrawal rejected',
                refunded: true
            }).catch(err => console.error('[Telegram] Withdraw reject notify error:', err));

            return res.json({ success: true, message: 'ปฏิเสธและคืนยอดเงินสำเร็จ' });
        }

        await prisma.transaction.update({
            where: { id: Number(transactionId) },
            data: { status: 'REJECTED', note, adminId: req.user!.userId },
        });

        TelegramNotifyService.notifyWithdrawRejected({
            username: transaction.user.username,
            fullName: transaction.user.fullName || null,
            amount: Number(transaction.amount),
            bankName: transaction.user.bankName || null,
            bankAccount: transaction.user.bankAccount || null,
            method: resolveWithdrawNotifyMethod(transaction.user.bankName, transaction.paymentGateway?.code || null),
            transactionId: transaction.id,
            adminName,
            note: note || 'Manual withdrawal rejected',
            refunded: false
        }).catch(err => console.error('[Telegram] Withdraw reject notify error:', err));

        return res.json({ success: true, message: 'ปฏิเสธสำเร็จ (ไม่คืนยอด)' });
    } catch (error) {
        console.error('Reject withdrawal error:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

router.post('/approve-deposit', requirePermission('manual', 'deposit', 'manage'), async (req: AuthRequest, res) => {
    try {
        const { transactionId } = req.body;

        const transaction = await prisma.transaction.findUnique({
            where: { id: Number(transactionId) },
            include: { user: true },
        });

        if (!transaction || transaction.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'รายการไม่ถูกต้อง' });
        }

        const newBalance = Number(transaction.user.balance) + Number(transaction.amount);

        try {
            await AgentWalletService.creditMainAgent(
                transaction.userId,
                Number(transaction.amount),
                `DEP_${transaction.id}`,
                `Manual approve deposit ${transaction.id}`,
                transaction.id
            );
        } catch (error: any) {
            return res.status(502).json({
                success: false,
                message: error.message || 'เติมเงินเข้ากระดานหลักไม่สำเร็จ'
            });
        }

        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            await tx.user.update({
                where: { id: transaction.userId },
                data: { balance: new Prisma.Decimal(newBalance) },
            });

            await tx.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'COMPLETED',
                    balanceAfter: new Prisma.Decimal(newBalance),
                    adminId: req.user!.userId
                },
            });
        });

        DepositBonusService.applyPostDepositBenefits(transaction.id).catch(err => {
            console.error('[Approve Deposit Bonus Error]:', err);
        });

        return res.json({ success: true, message: 'อนุมัติสำเร็จ' });
    } catch (error) {
        console.error('Approve deposit error:', error);
        return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

export default router;

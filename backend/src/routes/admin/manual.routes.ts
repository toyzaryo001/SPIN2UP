import { Router } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../lib/db.js';
import { AuthRequest, requirePermission } from '../../middlewares/auth.middleware.js';
import { BetflixService } from '../../services/betflix.service.js';
import { DepositBonusService } from '../../services/deposit-bonus.service.js';
import { TurnoverService } from '../../services/turnover.service.js';

const router = Router();

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
            const result = await BetflixService.ensureAndTransfer(
                user.id,
                user.phone,
                user.betflixUsername,
                Number(amount),
                `MANUAL_${Date.now()}`
            );

            if (!result.success) {
                const status = result.betflixUsername ? 502 : 400;
                return res.status(status).json({
                    success: false,
                    message: result.error || 'เติมเงินเข้ากระเป๋าเกมไม่สำเร็จ'
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

        if (!isBonus && user.betflixUsername) {
            const success = await BetflixService.transfer(
                user.betflixUsername,
                -Number(amount),
                `DEDUCT_${Date.now()}`
            );
            if (!success) {
                return res.status(500).json({ success: false, message: 'ดึงเงินจากกระเป๋าเกมไม่สำเร็จ' });
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
            include: { user: true },
        });

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'ไม่พบรายการ' });
        }

        if (transaction.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'รายการนี้ถูกดำเนินการแล้ว' });
        }

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
            include: { user: true }
        });

        if (!transaction || transaction.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: 'รายการไม่ถูกต้อง' });
        }

        const shouldRefund = refund !== false;

        if (shouldRefund) {
            const amount = Number(transaction.amount);

            if (transaction.user.betflixUsername) {
                await BetflixService.transfer(transaction.user.betflixUsername, amount, `REFUND_${transaction.id}`);
            }

            await prisma.$transaction([
                prisma.user.update({
                    where: { id: transaction.userId },
                    data: { balance: { increment: amount } }
                }),
                prisma.transaction.update({
                    where: { id: transaction.id },
                    data: { status: 'REJECTED', note, adminId: req.user!.userId }
                })
            ]);

            return res.json({ success: true, message: 'ปฏิเสธและคืนยอดเงินสำเร็จ' });
        }

        await prisma.transaction.update({
            where: { id: Number(transactionId) },
            data: { status: 'REJECTED', note, adminId: req.user!.userId },
        });

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

        const betflixResult = await BetflixService.ensureAndTransfer(
            transaction.userId,
            transaction.user.phone,
            transaction.user.betflixUsername,
            Number(transaction.amount),
            `DEP_${transaction.id}`
        );

        if (!betflixResult.success) {
            const status = betflixResult.betflixUsername ? 502 : 400;
            return res.status(status).json({
                success: false,
                message: betflixResult.error || 'เติมเงินเข้ากระเป๋าเกมไม่สำเร็จ'
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

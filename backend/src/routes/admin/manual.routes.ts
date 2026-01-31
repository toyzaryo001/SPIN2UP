import { Router } from 'express';
import prisma from '../../lib/db.js';
import { AuthRequest, requirePermission } from '../../middlewares/auth.middleware.js';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { BetflixService } from '../../services/betflix.service.js';

const router = Router();

// POST /api/admin/manual/deposit - เติมเงินมือ (ต้องมีสิทธิ์ add_credit หรือ add_bonus ตาม subType)
router.post('/deposit', async (req: AuthRequest, res) => {
    try {
        const { userId, amount, subType, note } = req.body;
        // subType: 'credit' | 'bonus'

        if (!userId || !amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' });
        }

        // Dynamic permission check based on subType
        const isBonus = subType === 'bonus';
        const requiredPermission = isBonus ? 'add_bonus' : 'add_credit';

        // Check permission manually
        const admin = await prisma.admin.findUnique({
            where: { id: req.user!.userId },
            include: { role: true }
        });

        if (!admin?.isSuperAdmin) {
            let permissions: any = {};
            try {
                permissions = JSON.parse(admin?.role?.permissions || '{}');
            } catch (e) { }

            if (permissions.manual?.[requiredPermission] !== true) {
                return res.status(403).json({
                    success: false,
                    message: `ไม่มีสิทธิ์: manual.${requiredPermission}`
                });
            }
        }

        const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }

        const balanceBefore = isBonus ? user.bonusBalance : user.balance;
        const balanceAfter = Number(balanceBefore) + Number(amount);

        // Betflix Deposit
        if (!isBonus && user.betflixUsername) {
            const success = await BetflixService.transfer(user.betflixUsername, Number(amount), `MANUAL_${Date.now()}`);
            if (!success) return res.status(500).json({ success: false, message: 'เติมเงินเข้ากระเป๋า Betflix ไม่สำเร็จ' });
        }

        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // Update balance
            if (isBonus) {
                await tx.user.update({ where: { id: user.id }, data: { bonusBalance: new Decimal(balanceAfter) } });
            } else {
                await tx.user.update({ where: { id: user.id }, data: { balance: new Decimal(balanceAfter) } });
            }

            // Create transaction
            await tx.transaction.create({
                data: {
                    userId: user.id,
                    type: isBonus ? 'BONUS' : 'MANUAL_ADD',
                    subType: subType || 'credit',
                    amount: new Decimal(amount),
                    balanceBefore: balanceBefore,
                    balanceAfter: new Decimal(balanceAfter),
                    status: 'COMPLETED',
                    note: note || `เติม${isBonus ? 'โบนัส' : 'เครดิต'}โดยแอดมิน`,
                    adminId: req.user!.userId,
                },
            });

            // Log
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

        res.json({ success: true, message: 'เติมเงินสำเร็จ', data: { newBalance: balanceAfter } });
    } catch (error) {
        console.error('Manual deposit error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/manual/deduct - ลดเครดิต (ต้องมีสิทธิ์ deduct)
router.post('/deduct', requirePermission('manual', 'deduct'), async (req: AuthRequest, res) => {
    try {
        const { userId, amount, subType, note } = req.body;

        if (!userId || !amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' });
        }

        const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }

        const isBonus = subType === 'bonus';
        const balanceBefore = isBonus ? user.bonusBalance : user.balance;

        if (Number(balanceBefore) < amount) {
            return res.status(400).json({ success: false, message: 'ยอดเงินไม่เพียงพอ' });
        }

        const balanceAfter = Number(balanceBefore) - Number(amount);

        // Betflix Deduct
        if (!isBonus && user.betflixUsername) {
            const success = await BetflixService.transfer(user.betflixUsername, -Number(amount), `DEDUCT_${Date.now()}`);
            if (!success) return res.status(500).json({ success: false, message: 'ดึงเงินจากกระเป๋า Betflix ไม่สำเร็จ' });
        }

        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            if (isBonus) {
                await tx.user.update({ where: { id: user.id }, data: { bonusBalance: new Decimal(balanceAfter) } });
            } else {
                await tx.user.update({ where: { id: user.id }, data: { balance: new Decimal(balanceAfter) } });
            }

            await tx.transaction.create({
                data: {
                    userId: user.id,
                    type: 'MANUAL_DEDUCT',
                    subType: subType || 'credit',
                    amount: new Decimal(amount),
                    balanceBefore: balanceBefore,
                    balanceAfter: new Decimal(balanceAfter),
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

        res.json({ success: true, message: 'ลดเครดิตสำเร็จ', data: { newBalance: balanceAfter } });
    } catch (error) {
        console.error('Manual deduct error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/manual/approve-withdrawal - อนุมัติถอน (ต้องมีสิทธิ์ approve_withdraw)
router.post('/approve-withdrawal', requirePermission('manual', 'approve_withdraw'), async (req: AuthRequest, res) => {
    try {
        const { transactionId } = req.body;

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

        const newBalance = Number(transaction.user.balance) - Number(transaction.amount);

        // Betflix Deduct (Withdraw)
        if (transaction.user.betflixUsername) {
            const success = await BetflixService.transfer(transaction.user.betflixUsername, -Number(transaction.amount), `WD_${transaction.id}`);
            if (!success) return res.status(500).json({ success: false, message: 'ดึงเงินจากกระเป๋า Betflix ไม่สำเร็จ' });
        } else {
            // If direct wallet, maybe we should fail if no betflix user? 
            return res.status(400).json({ success: false, message: 'ผู้ใช้ยังไม่ได้เชื่อมต่อ Betflix' });
        }

        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            await tx.user.update({
                where: { id: transaction.userId },
                data: { balance: new Decimal(newBalance) },
            });

            await tx.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'COMPLETED',
                    balanceAfter: new Decimal(newBalance),
                    adminId: req.user!.userId,
                },
            });
        });

        res.json({ success: true, message: 'อนุมัติสำเร็จ' });
    } catch (error) {
        console.error('Approve withdrawal error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/manual/reject-withdrawal - ปฏิเสธถอน (ต้องมีสิทธิ์ reject_withdraw)
router.post('/reject-withdrawal', requirePermission('manual', 'reject_withdraw'), async (req: AuthRequest, res) => {
    try {
        const { transactionId, note } = req.body;

        await prisma.transaction.update({
            where: { id: Number(transactionId) },
            data: { status: 'REJECTED', note, adminId: req.user!.userId },
        });

        res.json({ success: true, message: 'ปฏิเสธสำเร็จ' });
    } catch (error) {
        console.error('Reject withdrawal error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/manual/approve-deposit - อนุมัติฝาก (ต้องมีสิทธิ์ approve_deposit)
router.post('/approve-deposit', requirePermission('manual', 'approve_deposit'), async (req: AuthRequest, res) => {
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

        // Betflix Deposit
        if (transaction.user.betflixUsername) {
            const success = await BetflixService.transfer(transaction.user.betflixUsername, Number(transaction.amount), `DEP_${transaction.id}`);
            if (!success) return res.status(500).json({ success: false, message: 'เติมเงินเข้ากระเป๋า Betflix ไม่สำเร็จ' });
        } else {
            return res.status(400).json({ success: false, message: 'ผู้ใช้ยังไม่ได้เชื่อมต่อ Betflix' });
        }

        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            await tx.user.update({
                where: { id: transaction.userId },
                data: { balance: new Decimal(newBalance) },
            });

            await tx.transaction.update({
                where: { id: transaction.id },
                data: { status: 'COMPLETED', balanceAfter: new Decimal(newBalance), adminId: req.user!.userId },
            });
        });

        res.json({ success: true, message: 'อนุมัติสำเร็จ' });
    } catch (error) {
        console.error('Approve deposit error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

export default router;

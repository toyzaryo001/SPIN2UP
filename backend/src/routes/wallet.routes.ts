import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware.js';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentService } from '../services/payment.service.js';

const router = Router();

// GET /api/wallet - ดูยอดเงิน
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            select: { balance: true, bonusBalance: true },
        });

        res.json({
            success: true,
            data: {
                balance: user?.balance || 0,
                bonusBalance: user?.bonusBalance || 0,
                totalBalance: Number(user?.balance || 0) + Number(user?.bonusBalance || 0),
            },
        });
    } catch (error) {
        console.error('Get wallet error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/wallet/me - ดูข้อมูลผู้ใช้รวมถึงบัญชีธนาคาร
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            select: {
                id: true,
                username: true,
                fullName: true,
                phone: true,
                bankName: true,
                bankAccount: true,
                balance: true,
                bonusBalance: true,
                status: true,
            },
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }

        res.json({
            success: true,
            user: user,
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/wallet/deposit - ฝากเงิน (สร้างรายการรอ)
router.post('/deposit', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { amount, slipImage } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'จำนวนเงินไม่ถูกต้อง' });
        }

        const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }

        const transaction = await prisma.transaction.create({
            data: {
                userId: req.user!.userId,
                type: 'DEPOSIT',
                amount: new Decimal(amount),
                balanceBefore: user.balance,
                balanceAfter: user.balance, // ยังไม่เพิ่ม รอ Admin อนุมัติ
                status: 'PENDING',
                slipImage: slipImage || null,
            },
        });

        res.status(201).json({
            success: true,
            message: 'สร้างรายการฝากเงินสำเร็จ รอตรวจสอบ',
            data: { transactionId: transaction.id },
        });
    } catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/wallet/withdraw - ถอนเงิน (สร้างรายการรอ)
// POST /api/wallet/withdraw - ถอนเงิน (สร้างรายการรอ)
router.post('/withdraw', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { amount, bankAccountId } = req.body;
        const userId = req.user!.userId;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'จำนวนเงินไม่ถูกต้อง' });
        }

        if (!bankAccountId) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุบัญชีธนาคาร' });
        }

        const result = await PaymentService.createWithdraw(userId, amount, bankAccountId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.status(201).json(result);
    } catch (error: any) {
        console.error('Withdraw error:', error);
        res.status(500).json({ success: false, message: error.message || 'เกิดข้อผิดพลาดในการทำรายการ' });
    }
});

// GET /api/wallet/transactions - ประวัติธุรกรรม
router.get('/transactions', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { page = 1, limit = 20, type } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where: any = { userId: req.user!.userId };
        if (type) {
            where.type = type;
        }

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: Number(limit),
                skip,
            }),
            prisma.transaction.count({ where }),
        ]);

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            },
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

export default router;

import { Router } from 'express';
import prisma from '../../lib/db.js';

const router = Router();

// GET /api/admin/transactions - รายการธุรกรรมทั้งหมด
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, type, status, userId, startDate, endDate, adminId } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {};
        if (type && type !== 'all') where.type = type;
        if (status && status !== 'all') where.status = status;
        if (userId) where.userId = Number(userId);

        // Filter for manual transactions (adminId is not null)
        if (adminId === 'true') {
            where.adminId = { not: null };
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate as string);
            if (endDate) {
                // Frontend already sends endDate with correct time (23:59:59 in local TZ, converted to ISO)
                // Do NOT call setHours again — that would shift UTC time and include next-day records
                where.createdAt.lte = new Date(endDate as string);
            }
        }

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                include: { user: { select: { username: true, fullName: true, phone: true } } },
                orderBy: { createdAt: 'desc' },
                take: Number(limit),
                skip,
            }),
            prisma.transaction.count({ where }),
        ]);

        // Summary
        const summary = await prisma.transaction.aggregate({
            where,
            _sum: { amount: true },
            _count: true,
        });

        res.json({
            success: true,
            data: {
                transactions,
                summary: { totalAmount: summary._sum.amount || 0, count: summary._count },
                pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
            },
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/admin/transactions/pending-withdrawals - รายการรอถอน
router.get('/pending-withdrawals', async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany({
            where: { type: 'WITHDRAW', status: 'PENDING' },
            include: { user: { select: { username: true, fullName: true, phone: true, bankName: true, bankAccount: true } } },
            orderBy: { createdAt: 'asc' },
        });

        res.json({ success: true, data: transactions });
    } catch (error) {
        console.error('Get pending withdrawals error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

export default router;

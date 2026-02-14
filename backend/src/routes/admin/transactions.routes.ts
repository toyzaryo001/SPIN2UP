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
        // Summary
        // If status is not specifically filtered, only sum COMPLETED transactions for the amount
        // But keep count of all matching transactions
        const startValues = {
            _sum: { amount: 0 },
            _count: 0
        };

        let summary;

        if (!where.status) {
            // Case: No status filter (All statuses shown in list)
            // We want Total Amount = Only COMPLETED
            // We want Count = All (to match list pagination)

            // 1. Get Sum of COMPLETED
            const completedSum = await prisma.transaction.aggregate({
                where: { ...where, status: 'COMPLETED' },
                _sum: { amount: true }
            });

            // 2. Count is already in 'total' variable from above
            summary = {
                _sum: { amount: completedSum._sum.amount || 0 },
                _count: total
            };

        } else {
            // Case: Status filter applied (e.g. user filtered for PENDING)
            // Respect the filter for both Sum and Count
            summary = await prisma.transaction.aggregate({
                where,
                _sum: { amount: true },
                _count: true,
            });
        }

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

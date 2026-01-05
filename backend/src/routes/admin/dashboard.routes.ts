import { Router } from 'express';
import prisma from '../../lib/db.js';
import { requirePermission } from '../../middlewares/auth.middleware.js';

const router = Router();

// GET /api/admin/dashboard - ข้อมูล Dashboard (ต้องมีสิทธิ์ดู reports)
router.get('/', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Get last 7 days range
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        // Summary Stats
        const [totalUsers, newUsersToday, depositToday, withdrawToday, recentUsers, recentTransactions] = await Promise.all([
            // Total users
            prisma.user.count(),
            // New users today
            prisma.user.count({
                where: { createdAt: { gte: today, lte: todayEnd } }
            }),
            // Deposit today
            prisma.transaction.aggregate({
                where: { type: 'DEPOSIT', status: 'COMPLETED', createdAt: { gte: today, lte: todayEnd } },
                _sum: { amount: true },
                _count: true
            }),
            // Withdraw today
            prisma.transaction.aggregate({
                where: { type: 'WITHDRAW', status: 'COMPLETED', createdAt: { gte: today, lte: todayEnd } },
                _sum: { amount: true },
                _count: true
            }),
            // Recent users (last 10)
            prisma.user.findMany({
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: { id: true, username: true, fullName: true, balance: true, createdAt: true }
            }),
            // Recent transactions (last 10)
            prisma.transaction.findMany({
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: { user: { select: { username: true, fullName: true } } }
            })
        ]);

        // Get 7-day chart data
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const dateEnd = new Date(date);
            dateEnd.setHours(23, 59, 59, 999);

            const [dayDeposit, dayWithdraw, dayNewUsers] = await Promise.all([
                prisma.transaction.aggregate({
                    where: { type: 'DEPOSIT', status: 'COMPLETED', createdAt: { gte: date, lte: dateEnd } },
                    _sum: { amount: true }
                }),
                prisma.transaction.aggregate({
                    where: { type: 'WITHDRAW', status: 'COMPLETED', createdAt: { gte: date, lte: dateEnd } },
                    _sum: { amount: true }
                }),
                prisma.user.count({
                    where: { createdAt: { gte: date, lte: dateEnd } }
                })
            ]);

            chartData.push({
                date: date.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' }),
                deposit: Number(dayDeposit._sum.amount || 0),
                withdraw: Number(dayWithdraw._sum.amount || 0),
                newUsers: dayNewUsers
            });
        }

        const depositAmount = Number(depositToday._sum.amount || 0);
        const withdrawAmount = Number(withdrawToday._sum.amount || 0);

        res.json({
            success: true,
            data: {
                summary: {
                    totalUsers,
                    newUsersToday,
                    totalDeposit: depositAmount,
                    depositCount: depositToday._count,
                    totalWithdraw: withdrawAmount,
                    withdrawCount: withdrawToday._count,
                    profit: depositAmount - withdrawAmount
                },
                chartData,
                recentUsers,
                recentTransactions
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

export default router;

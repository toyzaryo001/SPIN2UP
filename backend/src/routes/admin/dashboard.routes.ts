import { Router } from 'express';
import prisma from '../../lib/db.js';
import { requirePermission } from '../../middlewares/auth.middleware.js';

const router = Router();

// GET /api/admin/dashboard - ข้อมูล Dashboard
router.get('/', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Parse date range (default: today)
        let filterStart: Date;
        let filterEnd: Date;

        if (startDate && endDate) {
            filterStart = new Date(startDate as string);
            filterStart.setHours(0, 0, 0, 0);
            filterEnd = new Date(endDate as string);
            filterEnd.setHours(23, 59, 59, 999);
        } else {
            // Default to today
            filterStart = new Date();
            filterStart.setHours(0, 0, 0, 0);
            filterEnd = new Date();
            filterEnd.setHours(23, 59, 59, 999);
        }

        // Month range (current month)
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date();
        monthEnd.setHours(23, 59, 59, 999);

        // Get last 7 days range for chart
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        // ============ DAILY STATS (Based on filter) ============
        const [
            totalUsers,
            newUsersInRange,
            depositInRange,
            withdrawInRange,
            bonusInRange,
            recentUsers,
            recentTransactions
        ] = await Promise.all([
            // Total users (all time)
            prisma.user.count(),
            // New users in date range
            prisma.user.count({
                where: { createdAt: { gte: filterStart, lte: filterEnd } }
            }),
            // Deposit in range
            prisma.transaction.aggregate({
                where: { type: 'DEPOSIT', status: 'COMPLETED', createdAt: { gte: filterStart, lte: filterEnd } },
                _sum: { amount: true },
                _count: true
            }),
            // Withdraw in range
            prisma.transaction.aggregate({
                where: { type: 'WITHDRAW', status: 'COMPLETED', createdAt: { gte: filterStart, lte: filterEnd } },
                _sum: { amount: true },
                _count: true
            }),
            // Bonus in range
            prisma.transaction.aggregate({
                where: { type: 'BONUS', status: 'COMPLETED', createdAt: { gte: filterStart, lte: filterEnd } },
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

        // First deposits from new users in range (สมัครฝาก)
        const newUserIds = await prisma.user.findMany({
            where: { createdAt: { gte: filterStart, lte: filterEnd } },
            select: { id: true }
        });
        const newUserIdList = newUserIds.map(u => u.id);

        let firstDepositAmount = 0;
        let firstDepositCount = 0;
        if (newUserIdList.length > 0) {
            const firstDeposits = await prisma.transaction.aggregate({
                where: {
                    type: 'DEPOSIT',
                    status: 'COMPLETED',
                    userId: { in: newUserIdList },
                    createdAt: { gte: filterStart, lte: filterEnd }
                },
                _sum: { amount: true },
                _count: true
            });
            firstDepositAmount = Number(firstDeposits._sum.amount || 0);
            firstDepositCount = firstDeposits._count;
        }

        // Active users (deposited AND bet in range) - ต้องผ่าน 2 เงื่อนไข
        const depositUserIds = await prisma.transaction.findMany({
            where: {
                type: 'DEPOSIT',
                status: 'COMPLETED',
                createdAt: { gte: filterStart, lte: filterEnd }
            },
            select: { userId: true },
            distinct: ['userId']
        });
        const depositUserIdSet = new Set(depositUserIds.map(d => d.userId));

        const betUserIds = await prisma.transaction.findMany({
            where: {
                type: 'BET',
                createdAt: { gte: filterStart, lte: filterEnd }
            },
            select: { userId: true },
            distinct: ['userId']
        });
        const betUserIdSet = new Set(betUserIds.map(b => b.userId));

        // Intersection: users who both deposited AND bet
        const activeUserIds = [...depositUserIdSet].filter(id => betUserIdSet.has(id));
        const activeUserCount = activeUserIds.length;

        // Returning customers (registered before filter start, deposited in range)
        const returningCustomers = await prisma.transaction.findMany({
            where: {
                type: 'DEPOSIT',
                status: 'COMPLETED',
                createdAt: { gte: filterStart, lte: filterEnd },
                user: {
                    createdAt: { lt: filterStart }
                }
            },
            select: { userId: true },
            distinct: ['userId']
        });
        const returningCustomerCount = returningCustomers.length;

        // ============ MONTHLY STATS ============
        const [monthDeposit, monthWithdraw, monthBonus] = await Promise.all([
            prisma.transaction.aggregate({
                where: { type: 'DEPOSIT', status: 'COMPLETED', createdAt: { gte: monthStart, lte: monthEnd } },
                _sum: { amount: true },
                _count: true
            }),
            prisma.transaction.aggregate({
                where: { type: 'WITHDRAW', status: 'COMPLETED', createdAt: { gte: monthStart, lte: monthEnd } },
                _sum: { amount: true },
                _count: true
            }),
            prisma.transaction.aggregate({
                where: { type: 'BONUS', status: 'COMPLETED', createdAt: { gte: monthStart, lte: monthEnd } },
                _sum: { amount: true },
                _count: true
            })
        ]);

        // ============ CHART DATA (7 days) ============
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

        // Calculate totals
        const depositAmount = Number(depositInRange._sum.amount || 0);
        const withdrawAmount = Number(withdrawInRange._sum.amount || 0);
        const bonusAmount = Number(bonusInRange._sum.amount || 0);
        const monthDepositAmount = Number(monthDeposit._sum.amount || 0);
        const monthWithdrawAmount = Number(monthWithdraw._sum.amount || 0);
        const monthBonusAmount = Number(monthBonus._sum.amount || 0);

        res.json({
            success: true,
            data: {
                // Filter info
                filterRange: {
                    start: filterStart.toISOString(),
                    end: filterEnd.toISOString()
                },
                // Daily/Range Summary
                summary: {
                    totalUsers,
                    newUsersInRange,
                    totalDeposit: depositAmount,
                    depositCount: depositInRange._count,
                    totalWithdraw: withdrawAmount,
                    withdrawCount: withdrawInRange._count,
                    totalBonus: bonusAmount,
                    bonusCount: bonusInRange._count,
                    profit: depositAmount - withdrawAmount - bonusAmount,
                    // New stats
                    firstDepositAmount,
                    firstDepositCount,
                    activeUserCount,
                    returningCustomerCount
                },
                // Monthly Summary
                monthlySummary: {
                    deposit: monthDepositAmount,
                    depositCount: monthDeposit._count,
                    withdraw: monthWithdrawAmount,
                    withdrawCount: monthWithdraw._count,
                    bonus: monthBonusAmount,
                    bonusCount: monthBonus._count,
                    profit: monthDepositAmount - monthWithdrawAmount - monthBonusAmount
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

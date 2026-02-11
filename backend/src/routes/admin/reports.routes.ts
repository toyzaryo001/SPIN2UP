import { Router } from 'express';
import prisma from '../../lib/db.js';
import { Prisma } from '@prisma/client';
import { requirePermission } from '../../middlewares/auth.middleware.js';

const router = Router();

interface DepositReportItem {
    id: string;
    originalId: number;
    date: Date;
    amount: number;
    type: string;
    subType: string | null;
    status: string;
    username: string;
    fullName: string | null | undefined;
    channel: string | null;
    admin: string | null;
    source: string;
    rawMessage: string | null;
}

// Helper: สร้าง date range
function getDateRange(preset: string, startDate?: string, endDate?: string) {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
        case 'today':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'yesterday':
            start.setDate(start.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            end.setDate(end.getDate() - 1);
            end.setHours(23, 59, 59, 999);
            break;
        case '3days':
            start.setDate(start.getDate() - 2);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case '7days':
        case 'week':
            start.setDate(start.getDate() - 6);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case '1month':
        case 'month':
        case '30days':
            start.setDate(start.getDate() - 29);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'custom':
            if (startDate) start = new Date(startDate);
            if (endDate) {
                end = new Date(endDate);
                // end.setHours(23, 59, 59, 999); // REMOVED: Trust the client provided end date time
            }
            break;
        default:
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
    }

    return { start, end };
}

// Helper: สร้างรายงานรายวัน
async function getDailyData(start: Date, end: Date, getData: (date: Date) => Promise<any>) {
    const days: any[] = [];
    const current = new Date(start);

    while (current <= end) {
        const dayStart = new Date(current);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(current);
        dayEnd.setHours(23, 59, 59, 999);

        const data = await getData(dayStart);
        days.push({
            date: dayStart.toISOString().split('T')[0],
            ...data,
        });

        current.setDate(current.getDate() + 1);
    }

    return days;
}

// GET /api/admin/reports/new-users - 4.1 รายงานสมัครใหม่ (ต้องมีสิทธิ์ดู)
router.get('/new-users', requirePermission('reports', 'new_users', 'view'), async (req, res) => {
    try {
        const { preset = 'today', startDate, endDate } = req.query;
        const { start, end } = getDateRange(preset as string, startDate as string, endDate as string);

        const dailyData = await getDailyData(start, end, async (date) => {
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);

            const users = await prisma.user.findMany({
                where: { createdAt: { gte: date, lte: dayEnd } },
                select: { id: true, username: true, fullName: true, phone: true, createdAt: true },
            });

            return { count: users.length, users };
        });

        const totalCount = dailyData.reduce((sum, d) => sum + d.count, 0);

        res.json({ success: true, data: { dailyData, summary: { totalCount } } });
    } catch (error) {
        console.error('Report new users error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/admin/reports/new-users-deposit - 4.2 สมัครใหม่+ฝากในวัน (ต้องมีสิทธิ์ดู)
router.get('/new-users-deposit', requirePermission('reports', 'new_users_deposit', 'view'), async (req, res) => {
    try {
        const { preset = 'today', startDate, endDate } = req.query;
        const { start, end } = getDateRange(preset as string, startDate as string, endDate as string);

        const dailyData = await getDailyData(start, end, async (date) => {
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);

            // ผู้ใช้ที่สมัครในวันนั้น
            const newUsers = await prisma.user.findMany({
                where: { createdAt: { gte: date, lte: dayEnd } },
                select: { id: true, username: true, fullName: true },
            });

            // ตรวจสอบว่าใครฝากเงินในวันเดียวกัน
            const usersWithDeposit = [];
            for (const user of newUsers) {
                const deposit = await prisma.transaction.findFirst({
                    where: {
                        userId: user.id,
                        type: 'DEPOSIT',
                        status: 'COMPLETED',
                        createdAt: { gte: date, lte: dayEnd },
                    },
                });
                if (deposit) {
                    usersWithDeposit.push({ ...user, firstDeposit: deposit.amount });
                }
            }

            return { count: usersWithDeposit.length, users: usersWithDeposit };
        });

        const totalCount = dailyData.reduce((sum, d) => sum + d.count, 0);

        res.json({ success: true, data: { dailyData, summary: { totalCount } } });
    } catch (error) {
        console.error('Report new users deposit error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/admin/reports/deposits - 4.3 รายงานฝากเงิน (ต้องมีสิทธิ์ดู)
router.get('/deposits', requirePermission('reports', 'deposits', 'view'), async (req, res) => {
    try {
        const { preset = 'today', startDate, endDate } = req.query;
        const { start, end } = getDateRange(preset as string, startDate as string, endDate as string);

        const dailyData = await getDailyData(start, end, async (date) => {
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);

            const result = await prisma.transaction.aggregate({
                where: { type: 'DEPOSIT', status: 'COMPLETED', createdAt: { gte: date, lte: dayEnd } },
                _sum: { amount: true },
                _count: true,
            });

            return { count: result._count, amount: result._sum.amount || 0 };
        });

        const totalCount = dailyData.reduce((sum, d) => sum + d.count, 0);
        const totalAmount = dailyData.reduce((sum, d) => sum + Number(d.amount), 0);

        res.json({ success: true, data: { dailyData, summary: { totalCount, totalAmount } } });
    } catch (error) {
        console.error('Report deposits error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/admin/reports/withdrawals - 4.4 รายงานถอนเงิน (ต้องมีสิทธิ์ดู)
router.get('/withdrawals', requirePermission('reports', 'withdrawals', 'view'), async (req, res) => {
    try {
        const { preset = 'today', startDate, endDate } = req.query;
        const { start, end } = getDateRange(preset as string, startDate as string, endDate as string);

        const dailyData = await getDailyData(start, end, async (date) => {
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);

            const result = await prisma.transaction.aggregate({
                where: { type: 'WITHDRAW', status: 'COMPLETED', createdAt: { gte: date, lte: dayEnd } },
                _sum: { amount: true },
                _count: true,
            });

            return { count: result._count, amount: result._sum.amount || 0 };
        });

        const totalCount = dailyData.reduce((sum, d) => sum + d.count, 0);
        const totalAmount = dailyData.reduce((sum, d) => sum + Number(d.amount), 0);

        res.json({ success: true, data: { dailyData, summary: { totalCount, totalAmount } } });
    } catch (error) {
        console.error('Report withdrawals error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/admin/reports/bonus - 4.5 รายงานโบนัส (ต้องมีสิทธิ์ดู)
router.get('/bonus', requirePermission('reports', 'bonus', 'view'), async (req, res) => {
    try {
        const { preset = 'today', startDate, endDate } = req.query;
        const { start, end } = getDateRange(preset as string, startDate as string, endDate as string);

        const dailyData = await getDailyData(start, end, async (date) => {
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);

            const result = await prisma.transaction.aggregate({
                where: { type: 'BONUS', status: 'COMPLETED', createdAt: { gte: date, lte: dayEnd } },
                _sum: { amount: true },
                _count: true,
            });

            return { count: result._count, amount: result._sum.amount || 0 };
        });

        const totalCount = dailyData.reduce((sum, d) => sum + d.count, 0);
        const totalAmount = dailyData.reduce((sum, d) => sum + Number(d.amount), 0);

        res.json({ success: true, data: { dailyData, summary: { totalCount, totalAmount } } });
    } catch (error) {
        console.error('Report bonus error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/admin/reports/profit-loss - 4.6 กำไรขาดทุน (ต้องมีสิทธิ์ดู)
router.get('/profit-loss', requirePermission('reports', 'profit', 'view'), async (req, res) => {
    try {
        const { preset = 'today', startDate, endDate } = req.query;
        const { start, end } = getDateRange(preset as string, startDate as string, endDate as string);

        const dailyData = await getDailyData(start, end, async (date) => {
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);

            const [deposits, withdrawals, bonus, bets, wins] = await Promise.all([
                prisma.transaction.aggregate({
                    where: { type: 'DEPOSIT', status: 'COMPLETED', createdAt: { gte: date, lte: dayEnd } },
                    _sum: { amount: true },
                }),
                prisma.transaction.aggregate({
                    where: { type: 'WITHDRAW', status: 'COMPLETED', createdAt: { gte: date, lte: dayEnd } },
                    _sum: { amount: true },
                }),
                prisma.transaction.aggregate({
                    where: { type: 'BONUS', status: 'COMPLETED', createdAt: { gte: date, lte: dayEnd } },
                    _sum: { amount: true },
                }),
                prisma.transaction.aggregate({
                    where: { type: 'BET', status: 'COMPLETED', createdAt: { gte: date, lte: dayEnd } },
                    _sum: { amount: true },
                }),
                prisma.transaction.aggregate({
                    where: { type: 'WIN', status: 'COMPLETED', createdAt: { gte: date, lte: dayEnd } },
                    _sum: { amount: true },
                }),
            ]);

            const depositAmount = Number(deposits._sum.amount || 0);
            const withdrawAmount = Number(withdrawals._sum.amount || 0);
            const bonusAmount = Number(bonus._sum.amount || 0);
            const betAmount = Number(bets._sum.amount || 0);
            const winAmount = Number(wins._sum.amount || 0);
            const profit = depositAmount - withdrawAmount - bonusAmount;
            const gameProfit = betAmount - winAmount;

            return { deposit: depositAmount, withdraw: withdrawAmount, bonus: bonusAmount, bet: betAmount, win: winAmount, profit, gameProfit };
        });

        const totalProfit = dailyData.reduce((sum, d) => sum + d.profit, 0);
        const totalGameProfit = dailyData.reduce((sum, d) => sum + d.gameProfit, 0);

        res.json({ success: true, data: { dailyData, summary: { totalProfit, totalGameProfit } } });
    } catch (error) {
        console.error('Report profit-loss error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/admin/reports/inactive-users - 4.7 ยูสไม่ออนไลน์ (ต้องมีสิทธิ์ดู)
router.get('/inactive-users', requirePermission('reports', 'inactive_users', 'view'), async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - Number(days));

        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { lastLoginAt: { lt: cutoffDate } },
                    { lastLoginAt: null },
                ],
                status: 'ACTIVE',
            },
            select: {
                id: true,
                username: true,
                fullName: true,
                phone: true,
                lastLoginAt: true,
                balance: true,
            },
            orderBy: { lastLoginAt: 'asc' },
        });

        res.json({ success: true, data: { users, count: users.length } });
    } catch (error) {
        console.error('Report inactive users error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/admin/reports/user-win-lose/:userId - 4.8 ชนะ-แพ้รายบุคคล (ต้องมีสิทธิ์ดู)
router.get('/user-win-lose/:userId', requirePermission('reports', 'win_lose', 'view'), async (req, res) => {
    try {
        const { preset = '7days', startDate, endDate } = req.query;
        const { start, end } = getDateRange(preset as string, startDate as string, endDate as string);
        const userId = Number(req.params.userId);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, fullName: true },
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }

        const dailyData = await getDailyData(start, end, async (date) => {
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);

            const [bets, wins] = await Promise.all([
                prisma.transaction.aggregate({
                    where: { userId, type: 'BET', createdAt: { gte: date, lte: dayEnd } },
                    _sum: { amount: true },
                    _count: true,
                }),
                prisma.transaction.aggregate({
                    where: { userId, type: 'WIN', createdAt: { gte: date, lte: dayEnd } },
                    _sum: { amount: true },
                    _count: true,
                }),
            ]);

            const betAmount = Number(bets._sum.amount || 0);
            const winAmount = Number(wins._sum.amount || 0);

            return {
                betCount: bets._count,
                betAmount,
                winCount: wins._count,
                winAmount,
                profit: betAmount - winAmount,
            };
        });

        const totalBet = dailyData.reduce((sum, d) => sum + d.betAmount, 0);
        const totalWin = dailyData.reduce((sum, d) => sum + d.winAmount, 0);

        res.json({
            success: true,
            data: {
                user,
                dailyData,
                summary: { totalBet, totalWin, profit: totalBet - totalWin },
            },
        });
    } catch (error) {
        console.error('Report user win-lose error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/admin/reports/all-deposits - รายการฝากเงินทั้งหมด (รวม Auto, Manual, Bonus, Cashback และ SMS ที่ไม่ Match)
router.get('/all-deposits', requirePermission('reports', 'view_deposits'), async (req, res) => {
    try {
        const { preset = 'today', startDate, endDate } = req.query;
        const { start, end } = getDateRange(preset as string, startDate as string, endDate as string);

        // 1. Fetch Valid Transactions
        const transactions = await prisma.transaction.findMany({
            where: {
                type: { in: ['DEPOSIT', 'MANUAL_ADD', 'BONUS', 'CASHBACK'] },
                createdAt: { gte: start, lte: end }
            },
            include: {
                user: { select: { username: true, fullName: true, phone: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // 2. Fetch Unmatched SMS Logs (Safely)
        // Note: Casting to any because SmsWebhookLog might not be in generated client yet
        let smsLogs = [];
        try {
            smsLogs = await (prisma as any).smsWebhookLog.findMany({
                where: {
                    status: { in: ['NO_MATCH', 'PARSE_FAILED', 'BETFLIX_FAILED'] },
                    createdAt: { gte: start, lte: end }
                },
                orderBy: { createdAt: 'desc' }
            });
        } catch (smsError) {
            console.warn('Failed to fetch SMS logs, possibly schema mismatch or missing table:', smsError);
            // Ignore error and proceed with empty smsLogs to show at least transactions
            smsLogs = [];
        }

        // 3. Merge & Normalize Data
        const mergedData: DepositReportItem[] = [
            ...transactions.map(t => ({
                id: `tx_${t.id}`,
                originalId: t.id,
                date: t.createdAt,
                amount: Number(t.amount),
                type: t.type, // DEPOSIT, MANUAL_ADD, BONUS, CASHBACK
                subType: t.subType,
                status: t.status,
                username: t.user?.username || 'Unknown',
                fullName: t.user?.fullName,
                channel: t.type === 'DEPOSIT' && t.subType === 'AUTO_SMS' ? 'Auto SMS' :
                    t.type === 'MANUAL_ADD' ? 'Manual' :
                        t.type === 'BONUS' ? 'Bonus' :
                            t.type === 'CASHBACK' ? 'Cashback' : t.type,
                admin: t.adminId ? `Admin #${t.adminId}` : 'System',
                source: 'TRANSACTION',
                rawMessage: null
            })),
            ...smsLogs.map((log: any) => {
                // Try to extract name from message if simple parse didn't work
                return {
                    id: `sms_${log.id}`,
                    originalId: log.id,
                    date: log.createdAt,
                    amount: Number(log.amount || 0),
                    type: 'SMS_UNMATCHED',
                    subType: null,
                    status: 'PENDING_REVIEW', // Display as "รอตรวจสอบ"
                    username: log.sourceName || 'Unknown', // From SMS
                    fullName: log.rawMessage.substring(0, 50) + '...', // Show part of message as detail?
                    channel: 'Auto SMS (Unmatched)',
                    admin: 'System',
                    source: 'SMS_LOG',
                    rawMessage: log.rawMessage
                };
            })
        ];

        // 4. Sort Merged Data by Date Descending
        mergedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // 5. Calculate Summary
        const totalAmount = transactions
            .filter(t => t.status === 'COMPLETED')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const totalUnmatchedAmount = smsLogs.reduce((sum: number, log: any) => sum + Number(log.amount || 0), 0);

        res.json({
            success: true,
            data: {
                transactions: mergedData, // We call it 'transactions' to fit frontend expect
                summary: {
                    totalAmount,
                    totalCount: transactions.length,
                    unmatchedCount: smsLogs.length,
                    unmatchedAmount: totalUnmatchedAmount
                }
            }
        });

    } catch (error) {
        console.error('Report all-deposits error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

export default router;

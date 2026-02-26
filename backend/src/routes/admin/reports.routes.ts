import { Router } from 'express';
import prisma from '../../lib/db';
import { requirePermission } from '../../middlewares/auth.middleware';
import { BetflixService } from '../../services/betflix.service';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

const router = Router();

dayjs.extend(utc);
dayjs.extend(timezone);

// Helper: สร้าง date range (UTC+7 Support)
function getDateRange(preset: string, startDate?: string, endDate?: string) {
    // Current time in BKK (UTC+7)
    const now = dayjs().utcOffset(7);
    let start = now.clone();
    let end = now.clone();

    switch (preset) {
        case 'today':
            start = now.startOf('day');
            end = now.endOf('day');
            break;
        case 'yesterday':
            start = now.subtract(1, 'day').startOf('day');
            end = now.subtract(1, 'day').endOf('day');
            break;
        case '3days':
            start = now.subtract(2, 'day').startOf('day');
            end = now.endOf('day');
            break;
        case '7days':
        case 'week':
            start = now.subtract(6, 'day').startOf('day');
            end = now.endOf('day');
            break;
        case '1month':
        case 'month':
        case '30days':
            start = now.subtract(29, 'day').startOf('day');
            end = now.endOf('day');
            break;
        case 'custom':
            if (startDate) start = dayjs(startDate).utcOffset(7).startOf('day');
            if (endDate) {
                end = dayjs(endDate).utcOffset(7).endOf('day');
            }
            break;
        default:
            start = now.startOf('day');
            end = now.endOf('day');
    }

    return { start: start.toDate(), end: end.toDate() };
}

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

// Helper: สร้างรายงานรายวัน
async function getDailyData(start: Date, end: Date, getData: (date: Date) => Promise<any>) {
    const days: any[] = [];
    const current = new Date(start);
    // clone end date to avoid modification if passed by reference (though here it's Date object)
    const endDate = new Date(end);

    while (current <= endDate) {
        const dayStart = new Date(current);
        dayStart.setHours(0, 0, 0, 0);

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
                where: { type: { in: ['DEPOSIT', 'MANUAL_ADD'] }, status: 'COMPLETED', createdAt: { gte: date, lte: dayEnd } },
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
                where: { type: { in: ['WITHDRAW', 'MANUAL_DEDUCT'] }, status: 'COMPLETED', createdAt: { gte: date, lte: dayEnd } },
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
                    where: { type: { in: ['DEPOSIT', 'MANUAL_ADD'] }, status: 'COMPLETED', createdAt: { gte: date, lte: dayEnd } },
                    _sum: { amount: true },
                }),
                prisma.transaction.aggregate({
                    where: { type: { in: ['WITHDRAW', 'MANUAL_DEDUCT'] }, status: 'COMPLETED', createdAt: { gte: date, lte: dayEnd } },
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

        // Ensure accurate filtering matching Start/End Date Range exactly by timezone
        // The default dayjs object parses startDate/End into properly adjusted UTC boundary


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

        // 2. Normalize Data (Transaction Only)
        const mergedData: DepositReportItem[] = transactions.map(t => ({
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
        }));

        const totalCount = transactions.length;
        const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);

        res.json({
            success: true,
            data: {
                transactions: mergedData,
                summary: { totalCount, totalAmount },
                pagination: { page: 1, limit: transactions.length, totalPages: 1, total: transactions.length }
            }
        });
    } catch (error) {
        console.error('Report all-deposits error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/admin/reports/win-lose - รายงานแพ้-ชนะทั้งหมด (Betflix + Nexus)
router.get('/win-lose', requirePermission('reports', 'win_lose', 'view'), async (req, res) => {
    try {
        const { preset = 'today', startDate, endDate, page = 1, limit = 20, search } = req.query;
        const { start, end } = getDateRange(preset as string, startDate as string, endDate as string);

        // Format dates
        const startStr = dayjs(start).utcOffset(7).format('YYYY-MM-DD');
        const endStr = dayjs(end).utcOffset(7).format('YYYY-MM-DD');
        const nexusStartStr = dayjs(start).utcOffset(7).format('YYYY-MM-DD HH:mm:ss');
        const nexusEndStr = dayjs(end).utcOffset(7).format('YYYY-MM-DD HH:mm:ss');

        // Build search filter
        const searchFilter = search ? {
            OR: [
                { username: { contains: search as string } },
                { fullName: { contains: search as string } },
            ],
        } : {};

        // ========== 1. BetFlix Users ==========
        const betflixUsersPromise = prisma.user.findMany({
            where: {
                betflixUsername: { not: null },
                status: { not: 'DELETED' },
                ...searchFilter,
            },
            select: { id: true, username: true, fullName: true, betflixUsername: true },
            orderBy: { createdAt: 'desc' },
        });

        // ========== 2. Nexus Users (from UserExternalAccount) ==========
        const nexusAgent = await prisma.agentConfig.findUnique({ where: { code: 'NEXUS' } });
        const nexusUsersPromise = nexusAgent ? prisma.userExternalAccount.findMany({
            where: { agentId: nexusAgent.id },
            include: {
                user: {
                    select: { id: true, username: true, fullName: true, status: true },
                },
            },
        }).then(accounts => accounts.filter(a => {
            if (a.user.status === 'DELETED') return false;
            if (!search) return true;
            const s = (search as string).toLowerCase();
            return (a.user.username?.toLowerCase().includes(s) || a.user.fullName?.toLowerCase().includes(s));
        })) : Promise.resolve([]);

        const [betflixUsers, nexusAccounts] = await Promise.all([betflixUsersPromise, nexusUsersPromise]);

        // ========== 3. Fetch BetFlix reports (batch of 5) ==========
        const betflixResults = new Map<number, { turnover: number; winloss: number }>();
        const batchSize = 5;

        for (let i = 0; i < betflixUsers.length; i += batchSize) {
            const batch = betflixUsers.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(async (user) => {
                    try {
                        const report = await BetflixService.getReportSummary(
                            user.betflixUsername!,
                            startStr,
                            endStr
                        );
                        if (report) {
                            return {
                                userId: user.id,
                                turnover: Number(report.turnover || 0),
                                winloss: Number(report.winloss || 0),
                            };
                        }
                        return null;
                    } catch {
                        return null;
                    }
                })
            );
            for (const r of batchResults) {
                if (r) betflixResults.set(r.userId, { turnover: r.turnover, winloss: r.winloss });
            }
        }

        // ========== 4. Fetch Nexus game logs (batch of 5) ==========
        const nexusResults = new Map<number, { turnover: number; winloss: number }>();

        if (nexusAgent && nexusAccounts.length > 0) {
            const { NexusProvider } = await import('../../services/agents/NexusProvider');
            const nexus = new NexusProvider();

            for (let i = 0; i < nexusAccounts.length; i += batchSize) {
                const batch = nexusAccounts.slice(i, i + batchSize);
                const batchResults = await Promise.all(
                    batch.map(async (account) => {
                        try {
                            const log = await nexus.getGameLog(
                                account.externalUsername,
                                nexusStartStr,
                                nexusEndStr
                            );
                            if (log && (log.totalBet > 0 || log.totalWin > 0)) {
                                const turnover = log.totalBet;
                                const winloss = log.totalWin - log.totalBet; // win-bet = player profit (negative = house wins)
                                return {
                                    userId: account.userId,
                                    turnover,
                                    winloss,
                                };
                            }
                            return null;
                        } catch {
                            return null;
                        }
                    })
                );
                for (const r of batchResults) {
                    if (r) nexusResults.set(r.userId, { turnover: r.turnover, winloss: r.winloss });
                }
            }
        }

        // ========== 5. Merge results per userId ==========
        const allUserIds = new Set<number>();
        const userInfoMap = new Map<number, { username: string; fullName: string | null }>();

        for (const u of betflixUsers) {
            allUserIds.add(u.id);
            userInfoMap.set(u.id, { username: u.username || '', fullName: u.fullName });
        }
        for (const a of nexusAccounts) {
            allUserIds.add(a.userId);
            if (!userInfoMap.has(a.userId)) {
                userInfoMap.set(a.userId, { username: a.user.username || '', fullName: a.user.fullName });
            }
        }

        const mergedResults: any[] = [];
        for (const userId of allUserIds) {
            const bf = betflixResults.get(userId);
            const nx = nexusResults.get(userId);

            const turnover = (bf?.turnover || 0) + (nx?.turnover || 0);
            const winloss = (bf?.winloss || 0) + (nx?.winloss || 0);

            if (turnover === 0 && winloss === 0) continue; // Skip zero activity

            const info = userInfoMap.get(userId)!;
            mergedResults.push({
                id: userId,
                username: info.username,
                fullName: info.fullName,
                turnover,
                winloss,
                rtp: turnover > 0 ? ((turnover + winloss) / turnover * 100).toFixed(2) : '0.00',
                source: bf && nx ? 'ทั้งคู่' : bf ? 'BetFlix' : 'Nexus',
            });
        }

        // Sort by turnover descending (most active first)
        mergedResults.sort((a, b) => b.turnover - a.turnover);

        // Pagination
        const total = mergedResults.length;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const totalPages = Math.ceil(total / limitNum);
        const paged = mergedResults.slice((pageNum - 1) * limitNum, pageNum * limitNum);

        // Summary
        const totalTurnover = mergedResults.reduce((sum, r) => sum + r.turnover, 0);
        const totalWinloss = mergedResults.reduce((sum, r) => sum + r.winloss, 0);
        const avgRtp = totalTurnover > 0 ? ((totalTurnover + totalWinloss) / totalTurnover * 100).toFixed(2) : '0.00';

        res.json({
            success: true,
            data: {
                users: paged,
                summary: {
                    totalUsers: total,
                    totalTurnover,
                    totalWinloss,
                    avgRtp,
                },
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages,
                },
            },
        });
    } catch (error) {
        console.error('Report win-lose error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

export default router;

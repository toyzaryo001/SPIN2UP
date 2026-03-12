import { Router, Response } from 'express';
import prisma from '../../lib/db.js';
import { requirePermission, type AuthRequest } from '../../middlewares/auth.middleware.js';
import { RewardSnapshotService } from '../../services/reward-snapshot.service.js';

const router = Router();

type RewardType = 'CASHBACK' | 'COMMISSION';
type PermissionTree = Record<string, Record<string, boolean | { view?: boolean; manage?: boolean }>>;

function normalizeRewardTypes(rawType: unknown): string[] {
    const source = Array.isArray(rawType) ? rawType : rawType ? [rawType] : [];

    return [...new Set(
        source
            .flatMap(value => String(value).split(','))
            .map(value => value.trim().toUpperCase())
            .filter(Boolean)
    )];
}

function isRewardType(value: string): value is RewardType {
    return value === 'CASHBACK' || value === 'COMMISSION';
}

function hasPermission(
    permissions: PermissionTree,
    category: string,
    feature: string,
    action: 'view' | 'manage' = 'view'
) {
    const featurePermission = permissions[category]?.[feature];
    if (featurePermission === true) return true;
    if (featurePermission && typeof featurePermission === 'object') {
        return featurePermission[action] === true;
    }
    return false;
}

async function getPermissionContext(req: AuthRequest, res: Response) {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return null;
    }

    if (req.user.role === 'SUPER_ADMIN') {
        return { allowAll: true, permissions: {} as PermissionTree };
    }

    const admin = await prisma.admin.findUnique({
        where: { id: req.user.userId },
        include: { role: true }
    });

    if (!admin) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return null;
    }

    if (admin.isSuperAdmin) {
        return { allowAll: true, permissions: {} as PermissionTree };
    }

    if (!admin.role) {
        res.status(403).json({ success: false, message: 'Forbidden' });
        return null;
    }

    let permissions: PermissionTree = {};
    try {
        permissions = JSON.parse(admin.role.permissions || '{}') as PermissionTree;
    } catch {
        permissions = {};
    }

    return { allowAll: false, permissions };
}

function canReadTypedReward(
    permissions: PermissionTree,
    rewardType: RewardType
) {
    const feature = rewardType === 'COMMISSION' ? 'commission' : 'cashback';
    return hasPermission(permissions, 'activities', feature, 'view')
        || hasPermission(permissions, 'activities', 'history', 'view');
}

function rejectForbidden(res: Response) {
    res.status(403).json({ success: false, message: 'Forbidden' });
}

function parseSnapshotDate(rawDate: unknown) {
    if (!rawDate) return undefined;
    const parsed = new Date(String(rawDate));
    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
}

// =======================
// SETTINGS (Cashback)
// =======================

// GET /api/admin/rewards/settings/cashback
router.get('/settings/cashback', requirePermission('activities', 'cashback', 'view'), async (req, res) => {
    try {
        let setting = await prisma.cashbackSetting.findFirst();
        if (!setting) {
            setting = await prisma.cashbackSetting.create({
                data: { rate: 5, minLoss: 100, maxCashback: 10000, dayOfWeek: 1 }
            });
        }
        res.json({ success: true, data: setting });
    } catch (error) {
        console.error('Get cashback setting error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// POST /api/admin/rewards/settings/cashback
router.post('/settings/cashback', requirePermission('activities', 'cashback', 'manage'), async (req, res) => {
    try {
        const { rate, minLoss, maxCashback, dayOfWeek, claimStartHour, claimEndHour, isActive } = req.body;

        const setting = await prisma.cashbackSetting.findFirst();

        let result;
        if (setting) {
            result = await prisma.cashbackSetting.update({
                where: { id: setting.id },
                data: {
                    rate: Number(rate),
                    minLoss: Number(minLoss),
                    maxCashback: Number(maxCashback),
                    dayOfWeek: Number(dayOfWeek),
                    claimStartHour: claimStartHour !== undefined ? Number(claimStartHour) : undefined,
                    claimEndHour: claimEndHour !== undefined ? Number(claimEndHour) : undefined,
                    isActive: Boolean(isActive)
                }
            });
        } else {
            result = await prisma.cashbackSetting.create({
                data: {
                    rate: Number(rate),
                    minLoss: Number(minLoss),
                    maxCashback: Number(maxCashback),
                    dayOfWeek: Number(dayOfWeek),
                    claimStartHour: claimStartHour !== undefined ? Number(claimStartHour) : 0,
                    claimEndHour: claimEndHour !== undefined ? Number(claimEndHour) : 23,
                    isActive: Boolean(isActive)
                }
            });
        }

        res.json({ success: true, data: result, message: 'บันทึกตั้งค่าคืนยอดเสียสำเร็จ' });
    } catch (error) {
        console.error('Update cashback setting error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// =======================
// SETTINGS (Turnover/Commission)
// =======================

// GET /api/admin/rewards/settings/turnover
router.get('/settings/turnover', requirePermission('activities', 'commission', 'view'), async (req, res) => {
    try {
        let setting = await prisma.turnoverSetting.findFirst();
        if (!setting) {
            setting = await prisma.turnoverSetting.create({
                data: { rate: 0.5, minTurnover: 100, maxReward: 10000 }
            });
        }
        res.json({ success: true, data: setting });
    } catch (error) {
        console.error('Get turnover setting error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// POST /api/admin/rewards/settings/turnover
router.post('/settings/turnover', requirePermission('activities', 'commission', 'manage'), async (req, res) => {
    try {
        const { rate, minTurnover, maxReward, isActive } = req.body;

        const setting = await prisma.turnoverSetting.findFirst();

        let result;
        if (setting) {
            result = await prisma.turnoverSetting.update({
                where: { id: setting.id },
                data: {
                    rate: Number(rate),
                    minTurnover: Number(minTurnover),
                    maxReward: Number(maxReward),
                    isActive: Boolean(isActive)
                }
            });
        } else {
            result = await prisma.turnoverSetting.create({
                data: {
                    rate: Number(rate),
                    minTurnover: Number(minTurnover),
                    maxReward: Number(maxReward),
                    isActive: Boolean(isActive)
                }
            });
        }

        res.json({ success: true, data: result, message: 'บันทึกตั้งค่าค่าคอมมิชชั่นสำเร็จ' });
    } catch (error) {
        console.error('Update turnover setting error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// =======================
// SUMMARIES
// =======================

// GET /api/admin/rewards/summaries
router.get('/summaries', async (req: AuthRequest, res) => {
    try {
        const types = normalizeRewardTypes(req.query.type);
        if (types.length !== 1 || !isRewardType(types[0])) {
            return res.status(400).json({ success: false, message: 'type must be CASHBACK or COMMISSION' });
        }

        const rewardType = types[0];
        const permissionContext = await getPermissionContext(req, res);
        if (!permissionContext) return;

        if (!permissionContext.allowAll && !canReadTypedReward(permissionContext.permissions, rewardType)) {
            return rejectForbidden(res);
        }

        const where = { type: rewardType };

        const [claims, aggregate, distinctPeriods] = await Promise.all([
            prisma.rewardClaim.groupBy({
                by: ['periodStart', 'periodEnd'],
                where,
                _sum: { amount: true },
                _count: { id: true },
                orderBy: { periodStart: 'desc' },
                take: 10
            }),
            prisma.rewardClaim.aggregate({
                where,
                _sum: { amount: true },
                _count: { id: true }
            }),
            prisma.rewardClaim.findMany({
                where,
                select: { periodStart: true, periodEnd: true },
                distinct: ['periodStart', 'periodEnd']
            })
        ]);

        const summaries = claims.map(claim => ({
            periodStart: claim.periodStart,
            periodEnd: claim.periodEnd,
            totalPaid: Number(claim._sum.amount || 0),
            claimCount: claim._count.id
        }));

        res.json({
            success: true,
            data: summaries,
            meta: {
                totalPaidAllTime: Number(aggregate._sum.amount || 0),
                totalClaimCount: aggregate._count.id,
                totalPeriods: distinctPeriods.length
            }
        });
    } catch (error) {
        console.error('Get summaries error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// =======================
// DAILY STATS
// =======================

// GET /api/admin/rewards/daily-stats
router.get('/daily-stats', async (req: AuthRequest, res) => {
    try {
        const types = normalizeRewardTypes(req.query.type);
        if (types.length !== 1 || !isRewardType(types[0])) {
            return res.status(400).json({ success: false, message: 'type must be CASHBACK or COMMISSION' });
        }

        const rewardType = types[0];
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(1000, Math.max(1, Number(req.query.limit) || 30));
        const skip = (page - 1) * limit;

        const permissionContext = await getPermissionContext(req, res);
        if (!permissionContext) return;

        if (!permissionContext.allowAll && !canReadTypedReward(permissionContext.permissions, rewardType)) {
            return rejectForbidden(res);
        }

        const where = { type: rewardType };

        const [total, stats] = await Promise.all([
            prisma.rewardDailyStat.count({ where }),
            prisma.rewardDailyStat.findMany({
                where,
                orderBy: { statDate: 'desc' },
                skip,
                take: limit
            })
        ]);

        res.json({
            success: true,
            data: stats.map(item => ({
                id: item.id,
                type: item.type,
                statDate: item.statDate,
                periodStart: item.periodStart,
                periodEnd: item.periodEnd,
                claimedUserCount: item.claimedUserCount,
                claimCount: item.claimCount,
                totalClaimedAmount: Number(item.totalClaimedAmount || 0)
            })),
            total,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get reward daily stats error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// =======================
// DAILY OVERVIEW
// =======================

// GET /api/admin/rewards/daily-overview
router.get('/daily-overview', async (req: AuthRequest, res) => {
    try {
        const types = normalizeRewardTypes(req.query.type);
        if (types.length !== 1 || !isRewardType(types[0])) {
            return res.status(400).json({ success: false, message: 'type must be CASHBACK or COMMISSION' });
        }

        const rewardType = types[0];
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(365, Math.max(1, Number(req.query.limit) || 30));
        const skip = (page - 1) * limit;

        const permissionContext = await getPermissionContext(req, res);
        if (!permissionContext) return;

        if (!permissionContext.allowAll && !canReadTypedReward(permissionContext.permissions, rewardType)) {
            return rejectForbidden(res);
        }

        await RewardSnapshotService.syncDailySnapshots(rewardType);

        const where = { type: rewardType };
        const [total, rows] = await Promise.all([
            prisma.rewardDailyStat.count({ where }),
            prisma.rewardDailyStat.findMany({
                where,
                orderBy: { statDate: 'desc' },
                skip,
                take: limit
            })
        ]);

        res.json({
            success: true,
            data: rows.map(row => ({
                id: row.id,
                type: row.type,
                statDate: row.statDate,
                periodStart: row.periodStart,
                periodEnd: row.periodEnd,
                eligibleUserCount: row.eligibleUserCount,
                claimedUserCount: row.claimedUserCount,
                unclaimedUserCount: row.unclaimedUserCount,
                totalCalculatedAmount: Number(row.totalCalculatedAmount || 0),
                totalClaimedAmount: Number(row.totalClaimedAmount || 0)
            })),
            total,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get reward daily overview error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// =======================
// ELIGIBILITY SNAPSHOTS
// =======================

// GET /api/admin/rewards/eligibility
router.get('/eligibility', async (req: AuthRequest, res) => {
    try {
        const types = normalizeRewardTypes(req.query.type);
        if (types.length !== 1 || !isRewardType(types[0])) {
            return res.status(400).json({ success: false, message: 'type must be CASHBACK or COMMISSION' });
        }

        const rewardType = types[0];
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(1000, Math.max(1, Number(req.query.limit) || 50));
        const skip = (page - 1) * limit;
        const search = String(req.query.search || '').trim();
        const status = String(req.query.status || 'ALL').toUpperCase();
        const requestedDate = parseSnapshotDate(req.query.date);

        if (requestedDate === null) {
            return res.status(400).json({ success: false, message: 'Invalid date' });
        }

        if (!['ALL', 'CLAIMED', 'UNCLAIMED'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const permissionContext = await getPermissionContext(req, res);
        if (!permissionContext) return;

        if (!permissionContext.allowAll && !canReadTypedReward(permissionContext.permissions, rewardType)) {
            return rejectForbidden(res);
        }

        if (!requestedDate || RewardSnapshotService.isDefaultStatDate(String(req.query.date || ''))) {
            await RewardSnapshotService.syncDailySnapshots(rewardType, requestedDate ? String(req.query.date) : undefined);
        }

        let selectedDate = requestedDate;
        if (!selectedDate) {
            const latest = await prisma.rewardUserSnapshot.findFirst({
                where: { type: rewardType },
                orderBy: { statDate: 'desc' },
                select: { statDate: true }
            });
            selectedDate = latest?.statDate || RewardSnapshotService.getPeriod().statDate;
        }

        const where: any = {
            type: rewardType,
            statDate: selectedDate
        };

        if (status === 'CLAIMED') {
            where.isClaimed = true;
        } else if (status === 'UNCLAIMED') {
            where.isClaimed = false;
        }

        if (search) {
            where.user = {
                OR: [
                    { username: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search } },
                    { fullName: { contains: search, mode: 'insensitive' } }
                ]
            };
        }

        const [total, items, summary] = await Promise.all([
            prisma.rewardUserSnapshot.count({ where }),
            prisma.rewardUserSnapshot.findMany({
                where,
                include: {
                    user: {
                        select: {
                            username: true,
                            fullName: true,
                            phone: true
                        }
                    }
                },
                orderBy: [
                    { rewardAmount: 'desc' },
                    { userId: 'asc' }
                ],
                skip,
                take: limit
            }),
            prisma.rewardUserSnapshot.aggregate({
                where,
                _sum: { rewardAmount: true },
                _count: { id: true }
            })
        ]);

        res.json({
            success: true,
            data: items.map(item => ({
                id: item.id,
                userId: item.userId,
                type: item.type,
                statDate: item.statDate,
                periodStart: item.periodStart,
                periodEnd: item.periodEnd,
                turnover: Number(item.turnover || 0),
                netLoss: Number(item.netLoss || 0),
                rewardAmount: Number(item.rewardAmount || 0),
                isClaimed: item.isClaimed,
                claimedAt: item.claimedAt,
                user: item.user
            })),
            selectedDate,
            summary: {
                totalUsers: summary._count.id,
                totalRewardAmount: Number(summary._sum.rewardAmount || 0)
            },
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get reward eligibility error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// =======================
// REPORTS (Claim History)
// =======================

// GET /api/admin/rewards/history
router.get('/history', async (req: AuthRequest, res) => {
    try {
        const { page = 1, limit = 50, search, startDate, endDate } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const types = normalizeRewardTypes(req.query.type);

        if (types.some(type => !isRewardType(type))) {
            return res.status(400).json({ success: false, message: 'Invalid reward type' });
        }

        const permissionContext = await getPermissionContext(req, res);
        if (!permissionContext) return;

        const hasHistoryAccess = permissionContext.allowAll
            || hasPermission(permissionContext.permissions, 'activities', 'history', 'view');

        if (!permissionContext.allowAll) {
            if (types.length === 0 || types.length > 1) {
                if (!hasHistoryAccess) return rejectForbidden(res);
            } else if (!canReadTypedReward(permissionContext.permissions, types[0] as RewardType)) {
                return rejectForbidden(res);
            }
        }

        const where: any = {};

        if (search) {
            where.user = {
                OR: [
                    { username: { contains: String(search), mode: 'insensitive' } },
                    { phone: { contains: String(search) } },
                    { fullName: { contains: String(search), mode: 'insensitive' } }
                ]
            };
        }

        if (types.length === 1) {
            where.type = types[0];
        } else if (types.length > 1) {
            where.type = { in: types };
        }

        if (startDate || endDate) {
            where.claimedAt = {};
            if (startDate) where.claimedAt.gte = new Date(String(startDate));
            if (endDate) where.claimedAt.lte = new Date(String(endDate));
        }

        const [total, items] = await Promise.all([
            prisma.rewardClaim.count({ where }),
            prisma.rewardClaim.findMany({
                where,
                include: {
                    user: { select: { username: true, fullName: true, phone: true } }
                },
                orderBy: { claimedAt: 'desc' },
                skip,
                take: Number(limit)
            })
        ]);

        res.json({
            success: true,
            data: items,
            total,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error('Get reward history error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

export default router;

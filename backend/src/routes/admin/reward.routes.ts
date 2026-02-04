import { Router } from 'express';
import prisma from '../../lib/db.js';
import { requirePermission } from '../../middlewares/auth.middleware.js';

const router = Router();

// =======================
// SETTINGS (Cashback)
// =======================

// GET /api/admin/rewards/settings/cashback
router.get('/settings/cashback', requirePermission('setting', 'view'), async (req, res) => {
    try {
        let setting = await prisma.cashbackSetting.findFirst();
        if (!setting) {
            // Create default if not exists (Auto-seed)
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
router.post('/settings/cashback', requirePermission('setting', 'manage'), async (req, res) => {
    try {
        const { rate, minLoss, maxCashback, dayOfWeek, isActive } = req.body;

        // Upsert logic (although strictly we expect 1 row)
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
router.get('/settings/turnover', requirePermission('setting', 'view'), async (req, res) => {
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
router.post('/settings/turnover', requirePermission('setting', 'manage'), async (req, res) => {
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
// REPORTS (Claim History)
// =======================

// GET /api/admin/rewards/history
router.get('/history', requirePermission('report', 'view'), async (req, res) => {
    try {
        const { page = 1, limit = 20, username, type, startDate, endDate } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {};
        if (username) {
            where.user = { username: { contains: String(username) } };
        }
        if (type) {
            where.type = String(type);
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

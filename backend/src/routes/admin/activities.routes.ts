import { Router } from 'express';
import prisma from '../../lib/db.js';
import { requirePermission } from '../../middleware/auth.middleware.js';

const router = Router();

// =====================
// CASHBACK SETTINGS
// =====================

// GET /admin/activities/cashback - Get cashback settings
router.get('/cashback', async (req, res) => {
    try {
        let settings = await prisma.cashbackSetting.findFirst();

        // Create default if not exists
        if (!settings) {
            settings = await prisma.cashbackSetting.create({
                data: {
                    rate: 5,
                    minLoss: 100,
                    maxCashback: 10000,
                    dayOfWeek: 1,
                    isActive: true
                }
            });
        }

        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Get cashback settings error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /admin/activities/cashback - Update cashback settings
router.put('/cashback', async (req, res) => {
    try {
        const { rate, minLoss, maxCashback, dayOfWeek, isActive } = req.body;

        let settings = await prisma.cashbackSetting.findFirst();

        if (settings) {
            settings = await prisma.cashbackSetting.update({
                where: { id: settings.id },
                data: { rate, minLoss, maxCashback, dayOfWeek, isActive }
            });
        } else {
            settings = await prisma.cashbackSetting.create({
                data: { rate, minLoss, maxCashback, dayOfWeek, isActive }
            });
        }

        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Update cashback settings error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// =====================
// STREAK SETTINGS
// =====================

// GET /admin/activities/streak - Get all streak settings
router.get('/streak', async (req, res) => {
    try {
        let settings = await prisma.streakSetting.findMany({
            orderBy: { day: 'asc' }
        });

        // Create default if empty
        if (settings.length === 0) {
            const defaults = [
                { day: 1, minDeposit: 100, bonusAmount: 10 },
                { day: 2, minDeposit: 100, bonusAmount: 20 },
                { day: 3, minDeposit: 100, bonusAmount: 30 },
                { day: 4, minDeposit: 100, bonusAmount: 50 },
                { day: 5, minDeposit: 100, bonusAmount: 100 },
                { day: 6, minDeposit: 100, bonusAmount: 150 },
                { day: 7, minDeposit: 100, bonusAmount: 300 },
            ];

            for (const d of defaults) {
                await prisma.streakSetting.create({ data: d });
            }

            settings = await prisma.streakSetting.findMany({
                orderBy: { day: 'asc' }
            });
        }

        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Get streak settings error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /admin/activities/streak/:day - Update single streak day
router.put('/streak/:day', async (req, res) => {
    try {
        const day = parseInt(req.params.day);
        const { minDeposit, bonusAmount, isActive } = req.body;

        const settings = await prisma.streakSetting.upsert({
            where: { day },
            update: { minDeposit, bonusAmount, isActive },
            create: { day, minDeposit, bonusAmount, isActive: isActive ?? true }
        });

        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Update streak settings error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// =====================
// COMMISSION SETTINGS
// =====================

// GET /admin/activities/commission - Get all commission settings
router.get('/commission', async (req, res) => {
    try {
        let settings = await prisma.commissionSetting.findMany({
            orderBy: { level: 'asc' }
        });

        // Create default if empty
        if (settings.length === 0) {
            const defaults = [
                { level: 1, rate: 0.5, description: 'แนะนำตรง' },
                { level: 2, rate: 0.3, description: 'ชั้นที่ 2' },
                { level: 3, rate: 0.2, description: 'ชั้นที่ 3' },
                { level: 4, rate: 0.1, description: 'ชั้นที่ 4' },
            ];

            for (const d of defaults) {
                await prisma.commissionSetting.create({ data: d });
            }

            settings = await prisma.commissionSetting.findMany({
                orderBy: { level: 'asc' }
            });
        }

        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Get commission settings error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /admin/activities/commission/:level - Update single commission level
router.put('/commission/:level', async (req, res) => {
    try {
        const level = parseInt(req.params.level);
        const { rate, description, isActive } = req.body;

        const settings = await prisma.commissionSetting.upsert({
            where: { level },
            update: { rate, description, isActive },
            create: { level, rate, description, isActive: isActive ?? true }
        });

        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Update commission settings error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

export default router;

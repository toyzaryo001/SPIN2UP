import { Router } from 'express';
import prisma from '../../lib/db.js';
import { requirePermission } from '../../middlewares/auth.middleware';
import { RankService } from '../../services/rank.service.js';

const router = Router();

// =====================
// CASHBACK SETTINGS
// =====================

router.get('/cashback', async (_req, res) => {
    try {
        let settings = await prisma.cashbackSetting.findFirst();

        if (!settings) {
            settings = await prisma.cashbackSetting.create({
                data: {
                    rate: 5,
                    minLoss: 100,
                    maxCashback: 10000,
                    dayOfWeek: 1,
                    isActive: true,
                },
            });
        }

        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Get cashback settings error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

router.put('/cashback', async (req, res) => {
    try {
        const { rate, minLoss, maxCashback, dayOfWeek, isActive } = req.body;

        const existing = await prisma.cashbackSetting.findFirst();
        const settings = existing
            ? await prisma.cashbackSetting.update({
                where: { id: existing.id },
                data: { rate, minLoss, maxCashback, dayOfWeek, isActive },
            })
            : await prisma.cashbackSetting.create({
                data: { rate, minLoss, maxCashback, dayOfWeek, isActive },
            });

        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Update cashback settings error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// =====================
// STREAK SETTINGS
// =====================

router.get('/streak', async (_req, res) => {
    try {
        let settings = await prisma.streakSetting.findMany({
            orderBy: { day: 'asc' },
        });

        if (settings.length === 0) {
            const defaults = [
                { day: 1, minDeposit: 100, bonusAmount: 10, requiresTurnover: false, turnoverMultiplier: 1 },
                { day: 2, minDeposit: 100, bonusAmount: 20, requiresTurnover: false, turnoverMultiplier: 1 },
                { day: 3, minDeposit: 100, bonusAmount: 30, requiresTurnover: false, turnoverMultiplier: 1 },
                { day: 4, minDeposit: 100, bonusAmount: 50, requiresTurnover: false, turnoverMultiplier: 1 },
                { day: 5, minDeposit: 100, bonusAmount: 100, requiresTurnover: false, turnoverMultiplier: 1 },
                { day: 6, minDeposit: 100, bonusAmount: 150, requiresTurnover: false, turnoverMultiplier: 1 },
                { day: 7, minDeposit: 100, bonusAmount: 300, requiresTurnover: false, turnoverMultiplier: 1 },
            ];

            for (const item of defaults) {
                await prisma.streakSetting.create({ data: item });
            }

            settings = await prisma.streakSetting.findMany({
                orderBy: { day: 'asc' },
            });
        }

        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Get streak settings error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

router.put('/streak/:day', async (req, res) => {
    try {
        const day = Number.parseInt(req.params.day, 10);
        const { minDeposit, bonusAmount, requiresTurnover, turnoverMultiplier, isActive } = req.body;

        const settings = await prisma.streakSetting.upsert({
            where: { day },
            update: { minDeposit, bonusAmount, requiresTurnover, turnoverMultiplier, isActive },
            create: {
                day,
                minDeposit,
                bonusAmount,
                requiresTurnover: requiresTurnover ?? false,
                turnoverMultiplier: turnoverMultiplier ?? 1,
                isActive: isActive ?? true,
            },
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

router.get('/commission', async (_req, res) => {
    try {
        let settings = await prisma.commissionSetting.findMany({
            orderBy: { level: 'asc' },
        });

        if (settings.length === 0) {
            const defaults = [
                { level: 1, rate: 0.5, description: 'แนะนำตรง' },
                { level: 2, rate: 0.3, description: 'ชั้นที่ 2' },
                { level: 3, rate: 0.2, description: 'ชั้นที่ 3' },
                { level: 4, rate: 0.1, description: 'ชั้นที่ 4' },
            ];

            for (const item of defaults) {
                await prisma.commissionSetting.create({ data: item });
            }

            settings = await prisma.commissionSetting.findMany({
                orderBy: { level: 'asc' },
            });
        }

        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Get commission settings error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

router.put('/commission/:level', async (req, res) => {
    try {
        const level = Number.parseInt(req.params.level, 10);
        const { rate, description, isActive } = req.body;

        const settings = await prisma.commissionSetting.upsert({
            where: { level },
            update: { rate, description, isActive },
            create: { level, rate, description, isActive: isActive ?? true },
        });

        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Update commission settings error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// =====================
// REFERRAL OVERVIEW
// =====================

router.get('/referral/overview', requirePermission('activities', 'referral', 'view'), async (_req, res) => {
    try {
        const referredUsers = await prisma.user.findMany({
            where: { referredBy: { not: null } },
            select: {
                id: true,
                username: true,
                fullName: true,
                phone: true,
                createdAt: true,
                referredBy: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        const referrerIds = [...new Set(referredUsers.map((user) => user.referredBy).filter(Boolean))] as number[];
        const referrers = referrerIds.length > 0
            ? await prisma.user.findMany({
                where: { id: { in: referrerIds } },
                select: {
                    id: true,
                    username: true,
                    fullName: true,
                    phone: true,
                    referrerCode: true,
                },
            })
            : [];

        const referrerMap = new Map(referrers.map((referrer) => [referrer.id, referrer]));
        const topReferrerMap = new Map<number, { referralCount: number; latestReferralAt: Date }>();

        referredUsers.forEach((user) => {
            if (!user.referredBy) return;

            const current = topReferrerMap.get(user.referredBy) || {
                referralCount: 0,
                latestReferralAt: user.createdAt,
            };

            topReferrerMap.set(user.referredBy, {
                referralCount: current.referralCount + 1,
                latestReferralAt: current.latestReferralAt > user.createdAt ? current.latestReferralAt : user.createdAt,
            });
        });

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const last7DaysStart = new Date(todayStart);
        last7DaysStart.setDate(last7DaysStart.getDate() - 6);

        const topReferrers = Array.from(topReferrerMap.entries())
            .map(([referrerId, stat]) => ({
                referrerId,
                referralCount: stat.referralCount,
                latestReferralAt: stat.latestReferralAt,
                referrer: referrerMap.get(referrerId) || null,
            }))
            .sort((a, b) => {
                if (b.referralCount !== a.referralCount) return b.referralCount - a.referralCount;
                return b.latestReferralAt.getTime() - a.latestReferralAt.getTime();
            })
            .slice(0, 20);

        const recentReferrals = referredUsers.slice(0, 30).map((user) => ({
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            phone: user.phone,
            createdAt: user.createdAt,
            referrer: user.referredBy ? referrerMap.get(user.referredBy) || null : null,
        }));

        res.json({
            success: true,
            data: {
                overview: {
                    totalReferrals: referredUsers.length,
                    totalReferrers: topReferrerMap.size,
                    todayReferrals: referredUsers.filter((user) => user.createdAt >= todayStart).length,
                    last7DaysReferrals: referredUsers.filter((user) => user.createdAt >= last7DaysStart).length,
                },
                topReferrers,
                recentReferrals,
            },
        });
    } catch (error) {
        console.error('Get referral overview error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแนะนำเพื่อน' });
    }
});

// =====================
// RANK TIERS
// =====================

router.get('/ranks', requirePermission('activities', 'ranks', 'view'), async (_req, res) => {
    try {
        const tiers = await RankService.getTiers();
        res.json({ success: true, data: tiers });
    } catch (error) {
        console.error('Get rank tiers error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล Rank' });
    }
});

router.put('/ranks', requirePermission('activities', 'ranks', 'manage'), async (req, res) => {
    try {
        const tiers = await RankService.saveTiers(req.body?.tiers);
        res.json({ success: true, data: tiers });
    } catch (error) {
        console.error('Update rank tiers error:', error);

        if (error instanceof Error) {
            if (error.message === 'RANK_TIERS_REQUIRED') {
                return res.status(400).json({ success: false, message: 'กรุณาระบุข้อมูล Rank อย่างน้อย 1 ระดับ' });
            }

            if (error.message === 'RANK_TIER_ID_DUPLICATED') {
                return res.status(400).json({ success: false, message: 'รหัส Rank ห้ามซ้ำกัน' });
            }
        }

        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึก Rank' });
    }
});

export default router;

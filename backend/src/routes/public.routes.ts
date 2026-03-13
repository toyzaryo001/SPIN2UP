import { Router, Request, Response } from 'express';
import prisma from '../lib/db.js';
import { RankService } from '../services/rank.service.js';

const router = Router();

const DEFAULT_RANK_TIERS = [
    { id: 'bronze', name: 'Bronze', icon: '🥉', minDeposit: 0, benefit: 'Cashback 3%', colorFrom: '#CD7F32', colorTo: '#A0522D' },
    { id: 'silver', name: 'Silver', icon: '🥈', minDeposit: 5000, benefit: 'Cashback 4%', colorFrom: '#C0C0C0', colorTo: '#A8A8A8' },
    { id: 'gold', name: 'Gold', icon: '🥇', minDeposit: 20000, benefit: 'Cashback 5%', colorFrom: '#FFD700', colorTo: '#FFA500' },
    { id: 'platinum', name: 'Platinum', icon: '💎', minDeposit: 50000, benefit: 'Cashback 7%', colorFrom: '#00CED1', colorTo: '#4169E1' },
    { id: 'diamond', name: 'Diamond', icon: '👑', minDeposit: 100000, benefit: 'Cashback 10%', colorFrom: '#9B59B6', colorTo: '#E91E63' },
];

const parseRankTiers = (value?: string | null) => {
    if (!value) return DEFAULT_RANK_TIERS;

    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            return DEFAULT_RANK_TIERS;
        }

        return parsed.map((tier: any, index: number) => ({
            id: String(tier.id || `tier_${index + 1}`),
            name: String(tier.name || `Tier ${index + 1}`),
            icon: String(tier.icon || '🏅'),
            minDeposit: Number(tier.minDeposit || 0),
            benefit: String(tier.benefit || ''),
            colorFrom: String(tier.colorFrom || '#64748B'),
            colorTo: String(tier.colorTo || '#334155'),
        })).sort((a: any, b: any) => a.minDeposit - b.minDeposit);
    } catch {
        return DEFAULT_RANK_TIERS;
    }
};

// GET /api/public/settings - ดึงการตั้งค่าเว็บ
router.get('/settings', async (req: Request, res: Response) => {
    try {
        const settings = await prisma.setting.findMany();
        const features = await prisma.siteFeature.findMany();

        const settingsMap: Record<string, string> = {};
        settings.forEach(s => { settingsMap[s.key] = s.value; });

        const featuresMap: Record<string, boolean> = {};
        features.forEach(f => { featuresMap[f.key] = f.isEnabled; });

        res.json({ settings: settingsMap, features: featuresMap });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// GET /api/public/banners - ดึงแบนเนอร์
router.get('/banners', async (req: Request, res: Response) => {
    try {
        const banners = await prisma.banner.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' }
        });
        res.json(banners);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch banners' });
    }
});

// GET /api/public/promotions - ดึงโปรโมชั่น
router.get('/promotions', async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const promotions = await prisma.promotion.findMany({
            where: {
                isActive: true,
                AND: [
                    {
                        OR: [
                            { startAt: null },
                            { startAt: { lte: now } }
                        ]
                    },
                    {
                        OR: [
                            { endAt: null },
                            { endAt: { gte: now } }
                        ]
                    }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(promotions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch promotions' });
    }
});

// GET /api/public/games - ดึงเกม (ใช้ schema ใหม่)
router.get('/games', async (req: Request, res: Response) => {
    try {
        const { providerId, categoryId, hot, featured, limit } = req.query;
        const where: any = { isActive: true };

        if (providerId) where.providerId = Number(providerId);
        if (hot === 'true') where.isHot = true;
        if (featured === 'true') where.isNew = true;

        if (categoryId) where.provider = { categoryId: Number(categoryId) };

        // Filter by category through provider relation
        const include: any = {
            provider: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    logo: true,
                    categoryId: true,
                    category: {
                        select: { slug: true }
                    }
                }
            }
        };

        let games = await prisma.game.findMany({
            where,
            include,
            orderBy: [
                { isNew: 'desc' },
                { isHot: 'desc' },
                { sortOrder: 'asc' }
            ],
            take: 50000 // Safety limit to prevent OOM
        });

        // Only return games from active providers
        games = games.filter(g => !g.providerId || g.provider);

        // Apply PER PROVIDER limit (default 1500)
        // User Request: "Limit 1500 per provider, not global"
        const maxPerProvider = limit ? parseInt(limit as string) : 1500;
        const providerCounts: Record<number, number> = {};
        const filteredGames: typeof games = [];

        for (const game of games) {
            const pId = game.providerId || 0;
            if (!providerCounts[pId]) providerCounts[pId] = 0;

            if (providerCounts[pId] < maxPerProvider) {
                filteredGames.push(game);
                providerCounts[pId]++;
            }
        }

        res.json(filteredGames);
    } catch (error) {
        console.error('Public games error:', error);
        res.status(500).json({ error: 'Failed to fetch games' });
    }
});

// GET /api/public/categories - ดึงหมวดหมู่เกม
router.get('/categories', async (req: Request, res: Response) => {
    try {
        const categories = await prisma.gameCategory.findMany({
            where: { isActive: true },
            include: {
                providers: {
                    where: { isActive: true },
                    select: { id: true, name: true, slug: true, logo: true, categoryId: true, isLobbyMode: true },
                    orderBy: { sortOrder: 'asc' }
                },
                _count: { select: { providers: true } }
            },
            orderBy: { sortOrder: 'asc' }
        });

        // Get all lobby mode providers to add to arcade category
        const lobbyProviders = await prisma.gameProvider.findMany({
            where: { isActive: true, isLobbyMode: true },
            select: { id: true, name: true, slug: true, logo: true, categoryId: true, isLobbyMode: true },
            orderBy: { sortOrder: 'asc' }
        });

        // Add lobby providers to arcade category (if exists)
        const result = categories.map((cat: any) => {
            if (cat.slug === 'arcade') {
                // Merge existing + lobby providers (avoid duplicates)
                const existingIds = new Set(cat.providers.map((p: any) => p.id));
                const additionalProviders = lobbyProviders.filter((lp: any) => !existingIds.has(lp.id));
                return {
                    ...cat,
                    providers: [...cat.providers, ...additionalProviders]
                };
            }
            return cat;
        });

        res.json(result);
    } catch (error) {
        console.error('Public categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// GET /api/public/providers - ดึงค่ายเกม
router.get('/providers', async (req: Request, res: Response) => {
    try {
        const { categoryId } = req.query;
        const where: any = { isActive: true };
        if (categoryId) where.categoryId = Number(categoryId);

        const providers = await prisma.gameProvider.findMany({
            where,
            include: {
                category: { select: { id: true, name: true, slug: true } },
                _count: { select: { games: { where: { isActive: true } } } }
            },
            orderBy: { sortOrder: 'asc' }
        });
        res.json(providers);
    } catch (error) {
        console.error('Public providers error:', error);
        res.status(500).json({ error: 'Failed to fetch providers' });
    }
});

// GET /api/public/announcements - ดึงประกาศ
router.get('/announcements', async (req: Request, res: Response) => {
    try {
        const announcements = await prisma.announcement.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(announcements);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

// GET /api/public/bank-accounts - ดึงบัญชีธนาคารสำหรับฝากเงิน
router.get('/bank-accounts', async (req: Request, res: Response) => {
    try {
        const { type } = req.query;
        const accounts = await prisma.bankAccount.findMany({
            where: {
                isActive: true,
                isShow: true,
                ...(type && { type: type as string })
            }
        });
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bank accounts' });
    }
});

// GET /api/public/truemoney - ดึง TrueMoney Wallet
router.get('/truemoney', async (req: Request, res: Response) => {
    try {
        const wallets = await prisma.trueMoneyWallet.findMany({
            where: { isActive: true, isShow: true }
        });
        res.json(wallets);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch truemoney wallets' });
    }
});

// GET /api/public/contacts - ช่องทางติดต่อสำหรับฝั่ง Player
router.get('/contacts', async (req: Request, res: Response) => {
    try {
        const contacts = await prisma.contactChannel.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' }
        });
        res.json(contacts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch contacts' });
    }
});

// =====================
// ACTIVITIES PUBLIC API
// =====================

// GET /api/public/cashback - Get cashback settings for player
router.get('/cashback', async (req: Request, res: Response) => {
    try {
        const settings = await prisma.cashbackSetting.findFirst({
            where: { isActive: true }
        });
        res.json(settings || { rate: 5, minLoss: 100, maxCashback: 10000, dayOfWeek: 1, isActive: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch cashback settings' });
    }
});

// GET /api/public/streak - Get streak settings for player
router.get('/streak', async (req: Request, res: Response) => {
    try {
        const settings = await prisma.streakSetting.findMany({
            where: { isActive: true },
            orderBy: { day: 'asc' }
        });
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch streak settings' });
    }
});

// GET /api/public/commission - Get turnover rebate settings for player
router.get('/commission', async (req: Request, res: Response) => {
    try {
        const setting = await prisma.turnoverSetting.findFirst({
            where: { isActive: true }
        });

        res.json(setting
            ? {
                rate: Number(setting.rate || 0),
                minTurnover: Number(setting.minTurnover || 0),
                maxReward: Number(setting.maxReward || 0),
                isActive: setting.isActive
            }
            : {
                rate: 0.5,
                minTurnover: 100,
                maxReward: 10000,
                isActive: false
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch commission settings' });
    }
});

// GET /api/public/ranks - Get rank tiers for player
router.get('/ranks', async (_req: Request, res: Response) => {
    try {
        res.json(await RankService.getTiers());
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch rank tiers' });
    }
});

export default router;

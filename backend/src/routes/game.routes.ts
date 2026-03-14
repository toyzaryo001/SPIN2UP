import { Router } from 'express';
import prisma from '../lib/db.js';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware.js';
import { AgentWalletService } from '../services/agent-wallet.service.js';

const router = Router();

// GET /api/games - game list
router.get('/', async (req, res) => {
    try {
        const { providerId, limit = 1500, page = 1, search } = req.query;

        const where: any = { isActive: true };
        if (providerId) where.providerId = Number(providerId);
        if (search) {
            where.name = { contains: String(search), mode: 'insensitive' };
        }

        const take = Number(limit);
        const skip = (Number(page) - 1) * take;

        const [games, total] = await Promise.all([
            prisma.game.findMany({
                where,
                orderBy: { sortOrder: 'asc' },
                take,
                skip,
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    providerId: true,
                    provider: true,
                    thumbnail: true,
                    minBet: true,
                    maxBet: true,
                    isHot: true,
                    isNew: true,
                },
            }),
            prisma.game.count({ where }),
        ]);

        res.json({
            success: true,
            data: games,
            pagination: {
                page: Number(page),
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
            },
        });
    } catch (error) {
        console.error('Get games error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/games/:slug - game detail
router.get('/:slug', async (req, res) => {
    try {
        const game = await prisma.game.findFirst({
            where: { slug: req.params.slug, isActive: true },
        });

        if (!game) {
            return res.status(404).json({ success: false, message: 'ไม่พบเกม' });
        }

        res.json({ success: true, data: game });
    } catch (error) {
        console.error('Get game error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/games/:slug/spin - local spin disabled
router.post('/:slug/spin', authMiddleware, async (_req: AuthRequest, res) => {
    return res.status(404).json({ success: false, message: 'Local spin engine is disabled' });
});

// GET /api/games/user/history
router.get('/user/history', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const [sessions, total] = await Promise.all([
            prisma.gameSession.findMany({
                where: { userId: req.user!.userId },
                include: { game: { select: { name: true, slug: true } } },
                orderBy: { playedAt: 'desc' },
                take: Number(limit),
                skip,
            }),
            prisma.gameSession.count({ where: { userId: req.user!.userId } }),
        ]);

        res.json({
            success: true,
            data: {
                sessions,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            },
        });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/games/launch - strict multi-agent launch
router.post('/launch', authMiddleware, async (req: AuthRequest, res) => {
    let providerCode: string | undefined;
    let gameCode: string | undefined;

    try {
        ({ providerCode, gameCode } = req.body);
        const { lang = 'th' } = req.body;
        const userId = req.user!.userId;

        if (!gameCode) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุรหัสเกม',
            });
        }

        const localGame = await prisma.game.findFirst({
            where: {
                slug: gameCode,
                isActive: true,
            },
            select: { id: true },
        });

        const launchResult = localGame
            ? await AgentWalletService.prepareLaunch({
                userId,
                gameId: localGame.id,
                providerCode,
                gameCode,
                lang,
            })
            : await AgentWalletService.prepareLaunch({
                userId,
                providerCode,
                gameCode,
                lang,
            });

        res.json({ success: true, data: { url: launchResult.url } });
    } catch (error: any) {
        console.error('Launch error:', error);

        if (error.message === 'GAME_AGENT_MAPPING_REQUIRED') {
            return res.status(409).json({
                success: false,
                code: 'GAME_AGENT_MAPPING_REQUIRED',
                message: 'เกมนี้ยังไม่ได้ผูกกระดานสำหรับเข้าเล่น',
            });
        }

        const statusCode = error.message === 'GAME_NOT_FOUND' ? 404 : 500;
        res.status(statusCode).json({
            success: false,
            message: `เกิดข้อผิดพลาด: ${error.message}`,
            debug: {
                originalError: error.message,
                providerCode,
                gameCode,
            },
        });
    }
});

export default router;

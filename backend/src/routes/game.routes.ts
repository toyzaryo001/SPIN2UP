import { Router } from 'express';
import prisma from '../lib/db.js';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware.js';
import { spinSlot } from '../services/slot-engine.js';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { BetflixService } from '../services/betflix.service.js';

const router = Router();

// GET /api/games - รายการเกมทั้งหมด
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
            prisma.game.count({ where })
        ]);

        res.json({
            success: true,
            data: games,
            pagination: {
                page: Number(page),
                limit: take,
                total,
                totalPages: Math.ceil(total / take)
            }
        });
    } catch (error) {
        console.error('Get games error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/games/:slug - รายละเอียดเกม
router.get('/:slug', async (req, res) => {
    try {
        const game = await prisma.game.findUnique({
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

// POST /api/games/:slug/spin - หมุนสล็อต
router.post('/:slug/spin', authMiddleware, async (req: AuthRequest, res) => {
    try {
        // Fix: Disable local spin engine in production to prevent "Infinite Money" exploit
        // (Local wallet updates but doesn't sync with Betflix)
        return res.status(404).json({ success: false, message: 'Local spin engine is disabled' });

        const { betAmount } = req.body;

        if (!betAmount || betAmount <= 0) {
            return res.status(400).json({ success: false, message: 'จำนวนเดิมพันไม่ถูกต้อง' });
        }

        // Find game
        const game = await prisma.game.findUnique({
            where: { slug: req.params.slug, isActive: true },
        });

        if (!game) {
            return res.status(404).json({ success: false, message: 'ไม่พบเกม' });
        }

        // Check bet limits
        if (betAmount < Number(game!.minBet) || betAmount > Number(game!.maxBet)) {
            return res.status(400).json({
                success: false,
                message: `เดิมพันต้องอยู่ระหว่าง ${game!.minBet} - ${game!.maxBet}`,
            });
        }

        // Get user
        const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }

        // Check balance
        const totalBalance = Number(user!.balance) + Number(user!.bonusBalance);
        if (totalBalance < betAmount) {
            return res.status(400).json({ success: false, message: 'ยอดเงินไม่เพียงพอ' });
        }

        // Spin!
        const result = spinSlot(betAmount, game!.rtp);

        // Calculate new balance
        const newBalance = Number(user!.balance) - betAmount + result.totalWin;

        // Update user balance & create transactions
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // Deduct bet
            await tx.user.update({
                where: { id: user!.id },
                data: { balance: new Decimal(newBalance) },
            });

            // Create bet transaction
            await tx.transaction.create({
                data: {
                    userId: user!.id,
                    type: 'BET',
                    amount: new Decimal(betAmount),
                    balanceBefore: user!.balance,
                    balanceAfter: new Decimal(Number(user!.balance) - betAmount),
                    status: 'COMPLETED',
                    note: `เดิมพัน ${game!.name}`,
                },
            });

            // Create win transaction if won
            if (result.totalWin > 0) {
                await tx.transaction.create({
                    data: {
                        userId: user!.id,
                        type: 'WIN',
                        amount: new Decimal(result.totalWin),
                        balanceBefore: new Decimal(Number(user!.balance) - betAmount),
                        balanceAfter: new Decimal(newBalance),
                        status: 'COMPLETED',
                        note: `ชนะ ${game!.name}`,
                    },
                });
            }

            // Create game session
            await tx.gameSession.create({
                data: {
                    userId: user!.id,
                    gameId: game!.id,
                    betAmount: new Decimal(betAmount),
                    winAmount: new Decimal(result.totalWin),
                    result: JSON.stringify(result),
                },
            });
        });

        res.json({
            success: true,
            data: {
                result,
                balance: newBalance,
            },
        });
    } catch (error) {
        console.error('Spin error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/games/history - ประวัติการเล่น
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

// POST /api/games/launch - เข้าเล่นเกม (Betflix Direct Play)
// POST /api/games/launch - เข้าเล่นเกม (Betflix Direct Play)
// POST /api/games/launch - เข้าเล่นเกม (Mix Board / Multi-Agent)
router.post('/launch', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { providerCode, gameCode, lang = 'th' } = req.body;
        const userId = req.user!.userId;

        console.log('🎮 Launch Request:', { providerCode, gameCode, lang, userId });

        let url: string | null = null;
        let errorDetail = '';

        // 0. Check if this is a Lobby-mode provider (no individual Game records in DB)
        const lobbyProvider = await prisma.gameProvider.findFirst({
            where: {
                slug: providerCode,
                isLobbyMode: true,
                isActive: true
            },
            include: { defaultAgent: true }
        });

        if (lobbyProvider) {
            console.log(`🏟️ Lobby Mode Provider: ${lobbyProvider.name} (Agent ID: ${lobbyProvider.defaultAgentId || 'Main'})`);

            try {
                const { AgentFactory } = await import('../services/agents/AgentFactory.js');
                const agent = lobbyProvider.defaultAgentId
                    ? await AgentFactory.getAgentById(lobbyProvider.defaultAgentId)
                    : await AgentFactory.getMainAgent();

                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    include: { externalAccounts: true }
                });

                if (user) {
                    const creds = await agent.register(user.id, user.phone);
                    console.log(`🏟️ Lobby Register result:`, creds ? `username=${creds.username}` : 'null');
                    if (creds) {
                        // Lobby providers: send empty gameCode to open the provider lobby
                        url = await agent.launchGame(creds.username, '', providerCode, lang);
                        console.log(`🏟️ Lobby Launch URL:`, url ? url.substring(0, 80) + '...' : 'null');
                    }
                }
            } catch (e: any) {
                console.error('❌ Lobby Launch Error:', e);
                errorDetail = e.message;
            }
        }

        // 1. If not lobby or lobby failed, try to find local Game record
        if (!url) {
            const game = await prisma.game.findFirst({
                where: {
                    slug: gameCode,
                    isActive: true,
                },
                include: { provider: true }
            });

            if (game) {
                console.log(`✅ Found Local Game ID: ${game.id} (Agent ID: ${game.agentId || 'Default'})`);

                try {
                    const { WalletService } = await import('../services/WalletService.js');
                    url = await WalletService.launchGame(userId, game.id, lang);
                } catch (e: any) {
                    console.error('❌ WalletService Launch Error:', e);
                    errorDetail = e.message;
                }
            } else {
                // Fallback: Legacy/Direct mode (Main Agent)
                console.log('⚠️ Game not found in local DB. Fallback to Main Agent Direct Launch.');

                try {
                    const { AgentFactory } = await import('../services/agents/AgentFactory.js');
                    const mainAgent = await AgentFactory.getMainAgent();

                    const user = await prisma.user.findUnique({
                        where: { id: userId },
                        include: { externalAccounts: true }
                    });

                    if (user) {
                        const creds = await mainAgent.register(user.id, user.phone);
                        if (creds) {
                            url = await mainAgent.launchGame(creds.username, gameCode, providerCode, lang);
                        }
                    }
                } catch (e: any) {
                    console.error('❌ Direct Launch Error:', e);
                    errorDetail = e.message;
                }
            }
        }

        if (!url) {
            return res.status(500).json({
                success: false,
                message: errorDetail || 'ไม่สามารถเข้าเล่นเกมได้ (Launch Failed)',
                debug: { providerCode, gameCode }
            });
        }

        console.log('✅ Returns URL:', url);
        res.json({ success: true, data: { url } });

    } catch (error: any) {
        console.error('Launch generic error:', error);
        res.status(500).json({
            success: false,
            message: `เกิดข้อผิดพลาด: ${error.message}`,
            debug: {
                originalError: error.message,
                providerCode: req.body.providerCode,
                gameCode: req.body.gameCode
            }
        });
    }
});

export default router;

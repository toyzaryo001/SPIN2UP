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
        const { providerId } = req.query;

        const where: any = { isActive: true };
        if (providerId) where.providerId = Number(providerId);

        const games = await prisma.game.findMany({
            where,
            orderBy: { sortOrder: 'asc' },
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
        });

        res.json({ success: true, data: games });
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
        if (betAmount < Number(game.minBet) || betAmount > Number(game.maxBet)) {
            return res.status(400).json({
                success: false,
                message: `เดิมพันต้องอยู่ระหว่าง ${game.minBet} - ${game.maxBet}`,
            });
        }

        // Get user
        const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }

        // Check balance
        const totalBalance = Number(user.balance) + Number(user.bonusBalance);
        if (totalBalance < betAmount) {
            return res.status(400).json({ success: false, message: 'ยอดเงินไม่เพียงพอ' });
        }

        // Spin!
        const result = spinSlot(betAmount, game.rtp);

        // Calculate new balance
        const newBalance = Number(user.balance) - betAmount + result.totalWin;

        // Update user balance & create transactions
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // Deduct bet
            await tx.user.update({
                where: { id: user.id },
                data: { balance: new Decimal(newBalance) },
            });

            // Create bet transaction
            await tx.transaction.create({
                data: {
                    userId: user.id,
                    type: 'BET',
                    amount: new Decimal(betAmount),
                    balanceBefore: user.balance,
                    balanceAfter: new Decimal(Number(user.balance) - betAmount),
                    status: 'COMPLETED',
                    note: `เดิมพัน ${game.name}`,
                },
            });

            // Create win transaction if won
            if (result.totalWin > 0) {
                await tx.transaction.create({
                    data: {
                        userId: user.id,
                        type: 'WIN',
                        amount: new Decimal(result.totalWin),
                        balanceBefore: new Decimal(Number(user.balance) - betAmount),
                        balanceAfter: new Decimal(newBalance),
                        status: 'COMPLETED',
                        note: `ชนะ ${game.name}`,
                    },
                });
            }

            // Create game session
            await tx.gameSession.create({
                data: {
                    userId: user.id,
                    gameId: game.id,
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
router.post('/launch', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
        if (!user) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });

        if (!user.betflixUsername) {
            // Auto-register if missing
            const betflixUser = await BetflixService.register(user.phone);
            if (betflixUser) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { betflixUsername: betflixUser.username, betflixPassword: betflixUser.password }
                });
                user.betflixUsername = betflixUser.username;
            } else {
                return res.status(400).json({ success: false, message: 'ไม่สามารถเชื่อมต่อระบบเกมได้ (Betflix Register Failed)' });
            }
        }

        const url = await BetflixService.getPlayUrl(user.betflixUsername!);
        if (!url) {
            return res.status(500).json({ success: false, message: 'ไม่สามารถขอ URL เข้าเกมได้' });
        }

        res.json({ success: true, data: { url } });
    } catch (error) {
        console.error('Launch game error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

export default router;

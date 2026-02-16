import { Router } from 'express';
import prisma from '../../lib/db.js';
import { requirePermission } from '../../middlewares/auth.middleware.js';

const router = Router();

// POST /api/admin/mix/providers - Create Custom Provider (e.g. "PG MIX")
router.post('/providers', requirePermission('games', 'edit'), async (req, res) => {
    try {
        const { name, slug, categoryId } = req.body;

        if (!name || !slug || !categoryId) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
        }

        const provider = await prisma.gameProvider.create({
            data: {
                name,
                slug,
                categoryId: Number(categoryId),
                isActive: true,
                isLobbyMode: false
            }
        });

        res.json({ success: true, data: provider });
    } catch (error: any) {
        console.error('Create provider error:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ success: false, message: 'ชื่อหรือ Slug นี้มีอยู่แล้ว' });
        }
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/mix/move-games - Move Games to another Provider
router.post('/move-games', requirePermission('games', 'edit'), async (req, res) => {
    try {
        const { gameIds, targetProviderId } = req.body;

        if (!Array.isArray(gameIds) || gameIds.length === 0 || !targetProviderId) {
            return res.status(400).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' });
        }

        // 1. Get current games to preserve their upstreamProviderCode
        const games = await prisma.game.findMany({
            where: { id: { in: gameIds.map(Number) } },
            include: { provider: true }
        });

        let updatedCount = 0;

        // 2. Update each game
        // We cannot use updateMany easily because each game might need to set a DIFFERENT upstreamProviderCode based on its CURRENT provider
        // So we loop (or use transaction)

        await prisma.$transaction(
            games.map(game => {
                // If upstream is already set, keep it.
                // If not set, set it to the OLD provider's slug (because we are moving it AWAY)
                const upstream = game.upstreamProviderCode || game.provider?.slug;

                return prisma.game.update({
                    where: { id: game.id },
                    data: {
                        providerId: Number(targetProviderId),
                        upstreamProviderCode: upstream // Lock in the original provider
                    }
                });
            })
        );

        res.json({ success: true, message: `ย้าย ${games.length} เกมเรียบร้อยแล้ว` });
    } catch (error) {
        console.error('Move games error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

export default router;

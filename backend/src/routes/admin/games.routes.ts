import { Router } from 'express';
import prisma from '../../lib/db.js';
import { requirePermission } from '../../middlewares/auth.middleware.js';

const router = Router();

// GET /api/admin/games - รายการเกม
router.get('/', requirePermission('games', 'view'), async (req, res) => {
    try {
        const { providerId, isActive, isHot, isNew, agentId } = req.query;
        const where: any = {};
        if (providerId) where.providerId = Number(providerId);
        if (isActive !== undefined) where.isActive = isActive === 'true';
        if (isHot !== undefined) where.isHot = isHot === 'true';
        if (isNew !== undefined) where.isNew = isNew === 'true';

        if (agentId !== undefined) {
            if (agentId === 'null') {
                where.agentId = null;
            } else {
                where.agentId = Number(agentId);
            }
        }

        const games = await prisma.game.findMany({
            where,
            include: {
                provider: {
                    select: { name: true, category: { select: { name: true } } }
                }
            },
            orderBy: { sortOrder: 'asc' },
        });

        res.json({ success: true, data: games });
    } catch (error) {
        console.error('Get games error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/games - สร้างเกม
router.post('/', requirePermission('games', 'edit'), async (req, res) => {
    try {
        const { name, slug, providerId, thumbnail, minBet, maxBet, rtp, isActive, isHot, isNew, sortOrder } = req.body;

        const game = await prisma.game.create({
            data: {
                name,
                slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
                providerId: providerId ? Number(providerId) : null,
                thumbnail,
                minBet: minBet || 1,
                maxBet: maxBet || 10000,
                rtp: rtp || 0.96,
                isActive: isActive ?? true,
                isHot: isHot ?? false,
                isNew: isNew ?? false,
                sortOrder: sortOrder || 0,
            },
        });

        res.status(201).json({ success: true, data: game });
    } catch (error) {
        console.error('Create game error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/admin/games/reorder - จัดลำดับ
router.put('/reorder', requirePermission('games', 'edit'), async (req, res) => {
    try {
        const { items } = req.body;

        for (const item of items) {
            await prisma.game.update({
                where: { id: item.id },
                data: { sortOrder: item.sortOrder },
            });
        }

        res.json({ success: true, message: 'จัดลำดับสำเร็จ' });
    } catch (error) {
        console.error('Reorder games error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PATCH /api/admin/games/bulk-update-agent - กำหนด Agent ให้กับเกมหลายรายการ
router.patch('/bulk-update-agent', requirePermission('games', 'edit'), async (req, res) => {
    try {
        const { gameIds, agentId } = req.body;

        if (!Array.isArray(gameIds) || gameIds.length === 0) {
            return res.status(400).json({ success: false, message: 'กรุณาเลือกเกมอย่างน้อย 1 รายการ' });
        }

        // Validate Agent ID if provided
        if (agentId) {
            const agent = await prisma.agentConfig.findUnique({ where: { id: Number(agentId) } });
            if (!agent) {
                return res.status(404).json({ success: false, message: 'ไม่พบ Agent ที่ระบุ' });
            }
        }

        await prisma.game.updateMany({
            where: { id: { in: gameIds.map(Number) } },
            data: { agentId: agentId ? Number(agentId) : null },
        });

        res.json({ success: true, message: `อัปเดต ${gameIds.length} รายการเรียบร้อยแล้ว` });
    } catch (error) {
        console.error('Bulk update agent error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/admin/games/:id - แก้ไขเกม
router.put('/:id', requirePermission('games', 'edit'), async (req, res) => {
    try {
        const game = await prisma.game.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });

        res.json({ success: true, data: game });
    } catch (error) {
        console.error('Update game error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PATCH /api/admin/games/:id - Toggle (isActive, isHot, isNew)
router.patch('/:id', requirePermission('games', 'edit'), async (req, res) => {
    try {
        const game = await prisma.game.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });

        res.json({ success: true, data: game });
    } catch (error) {
        console.error('Patch game error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// DELETE /api/admin/games/:id - ลบเกม (Cascade: Delete Sessions -> Delete Game)
router.delete('/:id', requirePermission('games', 'edit'), async (req, res) => {
    try {
        const id = Number(req.params.id);

        // 1. Delete all sessions for this game
        await prisma.gameSession.deleteMany({ where: { gameId: id } });

        // 2. Delete the game
        await prisma.game.delete({ where: { id } });

        res.json({ success: true, message: 'ลบเกมและประวัติการเล่นทั้งหมดสำเร็จ' });
    } catch (error) {
        console.error('Delete game error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบเกม' });
    }
});

export default router;

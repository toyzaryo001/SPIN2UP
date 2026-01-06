import { Router } from 'express';
import prisma from '../../lib/db.js';
import { requirePermission } from '../../middlewares/auth.middleware.js';

const router = Router();

// GET /api/admin/games - รายการเกม
router.get('/', requirePermission('games', 'view'), async (req, res) => {
    try {
        const { providerId, isActive, isHot, isNew } = req.query;
        const where: any = {};
        if (providerId) where.providerId = Number(providerId);
        if (isActive !== undefined) where.isActive = isActive === 'true';
        if (isHot !== undefined) where.isHot = isHot === 'true';
        if (isNew !== undefined) where.isNew = isNew === 'true';

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

// DELETE /api/admin/games/:id - ลบเกม
router.delete('/:id', requirePermission('games', 'edit'), async (req, res) => {
    try {
        await prisma.game.delete({ where: { id: Number(req.params.id) } });
        res.json({ success: true, message: 'ลบเกมสำเร็จ' });
    } catch (error) {
        console.error('Delete game error:', error);
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

export default router;

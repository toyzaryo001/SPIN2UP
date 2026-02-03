import { Router } from 'express';
import prisma from '../../lib/db.js';
import { requirePermission } from '../../middlewares/auth.middleware.js';
import { GameSyncService } from '../../services/game-sync.service.js';

const router = Router();

// GET /api/admin/providers - รายการค่ายเกม
router.get('/', requirePermission('agents', 'providers', 'view'), async (req, res) => {
    try {
        const { categoryId } = req.query;
        const where: any = {};
        if (categoryId) where.categoryId = Number(categoryId);

        const providers = await prisma.gameProvider.findMany({
            where,
            include: {
                category: { select: { name: true } },
                _count: { select: { games: true } }
            },
            orderBy: { sortOrder: 'asc' },
        });

        res.json({ success: true, data: providers });
    } catch (error) {
        console.error('Get providers error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/providers - สร้างค่ายเกม
router.post('/', requirePermission('agents', 'providers', 'manage'), async (req, res) => {
    try {
        const { name, slug, logo, categoryId, isActive, sortOrder } = req.body;

        if (!categoryId) {
            return res.status(400).json({ success: false, message: 'กรุณาเลือกหมวดหมู่' });
        }

        const provider = await prisma.gameProvider.create({
            data: {
                name,
                slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
                logo,
                categoryId: Number(categoryId),
                isActive: isActive ?? true,
                sortOrder: sortOrder ?? 0,
            },
        });

        res.status(201).json({ success: true, data: provider });
    } catch (error) {
        console.error('Create provider error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/admin/providers/reorder - จัดลำดับ
router.put('/reorder', requirePermission('agents', 'providers', 'manage'), async (req, res) => {
    try {
        const { items } = req.body; // [{ id, sortOrder }, ...]

        for (const item of items) {
            await prisma.gameProvider.update({
                where: { id: item.id },
                data: { sortOrder: item.sortOrder },
            });
        }

        res.json({ success: true, message: 'จัดลำดับสำเร็จ' });
    } catch (error) {
        console.error('Reorder providers error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/admin/providers/:id - แก้ไขค่ายเกม
router.put('/:id', requirePermission('agents', 'providers', 'manage'), async (req, res) => {
    try {
        const provider = await prisma.gameProvider.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });

        res.json({ success: true, data: provider });
    } catch (error) {
        console.error('Update provider error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PATCH /api/admin/providers/:id - Toggle/Partial update
router.patch('/:id', requirePermission('agents', 'providers', 'manage'), async (req, res) => {
    try {
        const provider = await prisma.gameProvider.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });

        res.json({ success: true, data: provider });
    } catch (error) {
        console.error('Patch provider error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// DELETE /api/admin/providers/:id - ลบค่ายเกม (Cascade: Sessions -> Games -> Provider)
router.delete('/:id', requirePermission('agents', 'providers', 'manage'), async (req, res) => {
    try {
        const id = Number(req.params.id);

        // 1. Find all games in this provider
        const games = await prisma.game.findMany({
            where: { providerId: id },
            select: { id: true }
        });
        const gameIds = games.map(g => g.id);

        if (gameIds.length > 0) {
            // 2. Delete all sessions for these games
            await prisma.gameSession.deleteMany({
                where: { gameId: { in: gameIds } }
            });

            // 3. Delete all games
            await prisma.game.deleteMany({
                where: { providerId: id }
            });
        }

        // 4. Delete the provider
        await prisma.gameProvider.delete({ where: { id } });

        res.json({ success: true, message: 'ลบค่ายเกมและข้อมูลเกมทั้งหมดสำเร็จ' });
    } catch (error) {
        console.error('Delete provider error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบค่ายเกม' });
    }
});

// PUT /api/admin/providers/reorder - จัดลำดับ
router.put('/reorder', requirePermission('games', 'edit'), async (req, res) => {
    try {
        const { items } = req.body; // [{ id, sortOrder }, ...]

        for (const item of items) {
            await prisma.gameProvider.update({
                where: { id: item.id },
                data: { sortOrder: item.sortOrder },
            });
        }

        res.json({ success: true, message: 'จัดลำดับสำเร็จ' });
    } catch (error) {
        console.error('Reorder providers error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});


// POST /api/admin/providers/sync - Sync All Providers
router.post('/sync/all', requirePermission('agents', 'import', 'manage'), async (req, res) => {
    try {
        const results = await GameSyncService.syncAll();
        res.json({ success: true, data: results });
    } catch (error: any) {
        console.error('Sync all providers error:', error);
        res.status(500).json({ success: false, message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
});

// POST /api/admin/providers/sync/clear - Clear All Games
router.post('/sync/clear', requirePermission('agents', 'import', 'manage'), async (req, res) => {
    try {
        await GameSyncService.clearAllGames();
        res.json({ success: true, message: 'ล้างข้อมูลเกมทั้งหมดเรียบร้อยแล้ว' });
    } catch (error: any) {
        console.error('Clear all games error:', error);
        res.status(500).json({ success: false, message: error.message || 'เกิดข้อผิดพลาดในการล้างข้อมูล' });
    }
});

// POST /api/admin/providers/sync/:code - Sync Specific Provider
router.post('/sync/:code', requirePermission('agents', 'import', 'manage'), async (req, res) => {
    try {
        const { code } = req.params;
        const result = await GameSyncService.syncGamesForProvider(code);
        res.json({ success: true, data: { provider: code, ...result } });
    } catch (error: any) {
        console.error(`Sync provider ${req.params.code} error:`, error);
        res.status(500).json({ success: false, message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
});

export default router;

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

// GET /api/admin/providers/sync/available - Get list of syncable providers
router.get('/sync/available', requirePermission('agents', 'import', 'manage'), async (req, res) => {
    try {
        const providers = GameSyncService.getAvailableProviders();
        res.json({ success: true, data: providers });
    } catch (error: any) {
        console.error('Get available sync providers error:', error);
        res.status(500).json({ success: false, message: 'Failed to get provider list' });
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
        // Check if code is 'nexus' special keyword? No, let's use explicit route.
        const result = await GameSyncService.syncGamesForProvider(code);
        res.json({ success: true, data: { provider: code, ...result } });
    } catch (error: any) {
        console.error(`Sync provider ${req.params.code} error:`, error);
        res.status(500).json({ success: false, message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
    }
});

// POST /api/admin/providers/sync/nexus/all - Sync All Nexus Games
router.post('/sync/nexus/all', requirePermission('agents', 'import', 'manage'), async (req, res) => {
    try {
        const results = await GameSyncService.syncNexusGames();
        res.json({ success: true, data: results });
    } catch (error: any) {
        console.error('Sync Nexus error:', error);
        res.status(500).json({ success: false, message: error.message || 'Nexus Sync Failed' });
    }
});

// POST /api/admin/providers/update-display-names - อัพเดทชื่อค่ายเป็นชื่อเต็ม
router.post('/update-display-names', requirePermission('agents', 'providers', 'manage'), async (req, res) => {
    try {
        // Display name mapping
        const PROVIDER_DISPLAY_NAMES: { [key: string]: string } = {
            pg: 'PG',
            pp: 'PragmaticPlay',
            joker: 'Joker',
            jili: 'JILI',
            jl: 'JILI',
            fc: 'Fachai',
            km: 'KINGMAKER',
            sa: 'SA Gaming',
            dg: 'DG',
            sexy: 'Sexy',
            wm: 'WM',
            bg: 'BG',
            ag: 'Asia Gaming',
            eg: 'Evolution Gaming',
            allbet: 'Allbet',
            cq9: 'CQ9',
            mg: 'Micro Gaming',
            bs: 'Betsoft',
            ng: 'Naga Games',
            ep: 'EvoPlay',
            gamatron: 'Gamatron',
            swg: 'SkyWind Group',
            aws: 'AE Gaming Slot',
            funky: 'Funky Games',
            gdg: 'Gold Diamond',
            sp: 'SimplePlay',
            netent: 'NetEnt',
            '1x2': '1X2 Gaming',
            sbo: 'SBOBet',
            saba: 'Saba Sports',
            ufa: 'UFA Sports',
            bfs: 'BF Sports',
            we: 'WE Entertainment',
            xg: 'Xtream Gaming',
            gd88: 'Green Dragon',
            ps: 'PlayStar',
            ttg: 'TTG',
            bpg: 'Blueprint Gaming',
            bng: 'Booongo',
            hab: 'Habanero',
            kgl: 'Kalamba Games',
            rlx: 'Relax Gaming',
            ygg: 'Yggdrasil',
            red: 'Red Tiger',
            qs: 'Quickspin',
            ids: 'Iron Dog',
            tk: 'Thunderkick',
            max: 'Maverick',
            ds: 'Dragoon Soft',
            nlc: 'Nolimit City',
            ga: 'Game Art',
            png: 'Play n Go',
            pug: 'Push Gaming',
            fng: 'Fantasma Gaming',
            nge: 'NetGames Entertainment',
            hak: 'Hacksaw Gaming',
            waz: 'Wazdan',
            elk: 'ELK Studios',
            prs: 'Print Studios'
        };

        const providers = await prisma.gameProvider.findMany();
        let updatedCount = 0;

        for (const provider of providers) {
            const slug = provider.slug.toLowerCase();
            const displayName = PROVIDER_DISPLAY_NAMES[slug];
            if (displayName && provider.name !== displayName) {
                await prisma.gameProvider.update({
                    where: { id: provider.id },
                    data: { name: displayName }
                });
                updatedCount++;
            }
        }

        res.json({
            success: true,
            message: `อัพเดทชื่อค่ายสำเร็จ ${updatedCount} ค่าย`,
            data: { updatedCount }
        });
    } catch (error: any) {
        console.error('Update display names error:', error);
        res.status(500).json({ success: false, message: error.message || 'เกิดข้อผิดพลาด' });
    }
});

export default router;

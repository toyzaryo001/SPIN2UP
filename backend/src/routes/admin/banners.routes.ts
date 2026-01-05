import { Router } from 'express';
import prisma from '../../lib/db.js';
import { requirePermission } from '../../middlewares/auth.middleware.js';

const router = Router();

// === Banners ===

// GET /api/admin/banners (ต้องมีสิทธิ์ banners.view)
router.get('/', requirePermission('banners', 'view'), async (req, res) => {
    try {
        const banners = await prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } });
        res.json({ success: true, data: banners });
    } catch (error) {
        console.error('Get banners error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/banners (ต้องมีสิทธิ์ banners.create)
router.post('/', requirePermission('banners', 'create'), async (req, res) => {
    try {
        const { title, image, link, sortOrder, isActive } = req.body;

        const banner = await prisma.banner.create({
            data: { title, image, link, sortOrder: sortOrder || 0, isActive: isActive ?? true },
        });

        res.status(201).json({ success: true, data: banner });
    } catch (error) {
        console.error('Create banner error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/admin/banners/:id (ต้องมีสิทธิ์ banners.edit)
router.put('/:id', requirePermission('banners', 'edit'), async (req, res) => {
    try {
        const banner = await prisma.banner.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });

        res.json({ success: true, data: banner });
    } catch (error) {
        console.error('Update banner error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// DELETE /api/admin/banners/:id (ต้องมีสิทธิ์ banners.delete)
router.delete('/:id', requirePermission('banners', 'delete'), async (req, res) => {
    try {
        await prisma.banner.delete({ where: { id: Number(req.params.id) } });
        res.json({ success: true, message: 'ลบสำเร็จ' });
    } catch (error) {
        console.error('Delete banner error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === Announcements (Popup/Marquee) ===

// GET /api/admin/banners/announcements (ต้องมีสิทธิ์ announcements.view)
router.get('/announcements', requirePermission('announcements', 'view'), async (req, res) => {
    try {
        const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
        res.json({ success: true, data: announcements });
    } catch (error) {
        console.error('Get announcements error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/banners/announcements (ต้องมีสิทธิ์ announcements.create)
router.post('/announcements', requirePermission('announcements', 'create'), async (req, res) => {
    try {
        const { type, title, content, isActive } = req.body;

        const announcement = await prisma.announcement.create({
            data: { type, title, content, isActive: isActive ?? true },
        });

        res.status(201).json({ success: true, data: announcement });
    } catch (error) {
        console.error('Create announcement error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/admin/banners/announcements/:id (ต้องมีสิทธิ์ announcements.edit)
router.put('/announcements/:id', requirePermission('announcements', 'edit'), async (req, res) => {
    try {
        const announcement = await prisma.announcement.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });

        res.json({ success: true, data: announcement });
    } catch (error) {
        console.error('Update announcement error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// DELETE /api/admin/banners/announcements/:id (ต้องมีสิทธิ์ announcements.delete)
router.delete('/announcements/:id', requirePermission('announcements', 'delete'), async (req, res) => {
    try {
        await prisma.announcement.delete({ where: { id: Number(req.params.id) } });
        res.json({ success: true, message: 'ลบสำเร็จ' });
    } catch (error) {
        console.error('Delete announcement error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

export default router;

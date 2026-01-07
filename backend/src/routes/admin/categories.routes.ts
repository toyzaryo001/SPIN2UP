import { Router } from 'express';
import prisma from '../../lib/db.js';
import { requirePermission } from '../../middlewares/auth.middleware.js';

const router = Router();

// GET /api/admin/categories - รายการหมวดหมู่
router.get('/', requirePermission('games', 'view'), async (req, res) => {
    try {
        const categories = await prisma.gameCategory.findMany({
            include: { _count: { select: { providers: true } } },
            orderBy: { sortOrder: 'asc' },
        });

        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/categories - สร้างหมวดหมู่
router.post('/', requirePermission('games', 'edit'), async (req, res) => {
    try {
        const { name, slug, icon, description, isActive, sortOrder } = req.body;

        const category = await prisma.gameCategory.create({
            data: {
                name,
                slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
                icon,
                description,
                isActive: isActive ?? true,
                sortOrder: sortOrder ?? 0,
            },
        });

        res.status(201).json({ success: true, data: category });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/admin/categories/reorder - จัดลำดับ (ต้องอยู่ก่อน /:id)
router.put('/reorder', requirePermission('games', 'edit'), async (req, res) => {
    try {
        const { items } = req.body; // [{ id, sortOrder }, ...]

        for (const item of items) {
            await prisma.gameCategory.update({
                where: { id: item.id },
                data: { sortOrder: item.sortOrder },
            });
        }

        res.json({ success: true, message: 'จัดลำดับสำเร็จ' });
    } catch (error) {
        console.error('Reorder categories error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/admin/categories/:id - แก้ไขหมวดหมู่
router.put('/:id', requirePermission('games', 'edit'), async (req, res) => {
    try {
        const category = await prisma.gameCategory.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });

        res.json({ success: true, data: category });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PATCH /api/admin/categories/:id - Toggle/Partial update
router.patch('/:id', requirePermission('games', 'edit'), async (req, res) => {
    try {
        const category = await prisma.gameCategory.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });

        res.json({ success: true, data: category });
    } catch (error) {
        console.error('Patch category error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// DELETE /api/admin/categories/:id - ลบหมวดหมู่
router.delete('/:id', requirePermission('games', 'edit'), async (req, res) => {
    try {
        // Check if has providers
        const count = await prisma.gameProvider.count({
            where: { categoryId: Number(req.params.id) }
        });

        if (count > 0) {
            return res.status(400).json({
                success: false,
                message: `ไม่สามารถลบได้ มีค่ายเกม ${count} รายการในหมวดนี้`
            });
        }

        await prisma.gameCategory.delete({ where: { id: Number(req.params.id) } });
        res.json({ success: true, message: 'ลบสำเร็จ' });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

export default router;

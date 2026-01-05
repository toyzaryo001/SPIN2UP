import { Router } from 'express';
import prisma from '../../lib/db.js';
import { requirePermission } from '../../middlewares/auth.middleware.js';

const router = Router();

// GET /api/admin/promotions (ต้องมีสิทธิ์ดู)
router.get('/', requirePermission('promotions', 'view'), async (req, res) => {
    try {
        const promotions = await prisma.promotion.findMany({
            orderBy: { createdAt: 'desc' },
        });

        res.json({ success: true, data: promotions });
    } catch (error) {
        console.error('Get promotions error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/promotions (ต้องมีสิทธิ์แก้ไข)
router.post('/', requirePermission('promotions', 'edit'), async (req, res) => {
    try {
        const { name, description, type, value, minDeposit, maxBonus, turnover, image, isActive, startAt, endAt } = req.body;

        const promotion = await prisma.promotion.create({
            data: {
                name,
                description,
                type,
                value,
                minDeposit,
                maxBonus,
                turnover,
                image,
                isActive: isActive ?? true,
                startAt: startAt ? new Date(startAt) : null,
                endAt: endAt ? new Date(endAt) : null,
            },
        });

        res.status(201).json({ success: true, data: promotion });
    } catch (error) {
        console.error('Create promotion error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/admin/promotions/:id (ต้องมีสิทธิ์แก้ไข)
router.put('/:id', requirePermission('promotions', 'edit'), async (req, res) => {
    try {
        const promotion = await prisma.promotion.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });

        res.json({ success: true, data: promotion });
    } catch (error) {
        console.error('Update promotion error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// DELETE /api/admin/promotions/:id (ต้องมีสิทธิ์ลบ)
router.delete('/:id', requirePermission('promotions', 'delete'), async (req, res) => {
    try {
        await prisma.promotion.delete({ where: { id: Number(req.params.id) } });
        res.json({ success: true, message: 'ลบโปรโมชั่นสำเร็จ' });
    } catch (error) {
        console.error('Delete promotion error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PATCH /api/admin/promotions/:id/toggle (ต้องมีสิทธิ์แก้ไข)
router.patch('/:id/toggle', requirePermission('promotions', 'edit'), async (req, res) => {
    try {
        const promo = await prisma.promotion.findUnique({ where: { id: Number(req.params.id) } });
        if (!promo) {
            return res.status(404).json({ success: false, message: 'ไม่พบโปรโมชั่น' });
        }

        const updated = await prisma.promotion.update({
            where: { id: Number(req.params.id) },
            data: { isActive: !promo.isActive },
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Toggle promotion error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/admin/promotions/logs - ประวัติรับโปร (ต้องมีสิทธิ์ดู)
router.get('/logs', requirePermission('promotions', 'view'), async (req, res) => {
    try {
        const { page = 1, limit = 20, promotionId, userId, startDate, endDate } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {};
        if (promotionId) where.promotionId = Number(promotionId);
        if (userId) where.userId = Number(userId);
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate as string);
            if (endDate) {
                const end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        const [logs, total] = await Promise.all([
            prisma.promotionLog.findMany({
                where,
                include: {
                    user: { select: { username: true, fullName: true } },
                    promotion: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: Number(limit),
                skip,
            }),
            prisma.promotionLog.count({ where }),
        ]);

        res.json({
            success: true,
            data: { logs, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } },
        });
    } catch (error) {
        console.error('Get promotion logs error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

export default router;

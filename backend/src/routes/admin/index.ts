import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware, AuthRequest } from '../../middlewares/auth.middleware.js';
import { PrismaClient } from '@prisma/client';

// Import sub-routes
import dashboardRoutes from './dashboard.routes.js';
import userRoutes from './users.routes.js';
import transactionRoutes from './transactions.routes.js';
import manualRoutes from './manual.routes.js';
import reportRoutes from './reports.routes.js';
import settingRoutes from './settings.routes.js';
import categoryRoutes from './categories.routes.js';
import providerRoutes from './providers.routes.js';
import gameRoutes from './games.routes.js';
import promotionRoutes from './promotions.routes.js';
import bannerRoutes from './banners.routes.js';
import activitiesRoutes from './activities.routes.js';

const router = Router();
const prisma = new PrismaClient();

// All admin routes require auth + admin role
router.use(authMiddleware, adminMiddleware);

// GET /api/admin/me - Get current admin info with permissions
router.get('/me', async (req: AuthRequest, res: Response) => {
    try {
        const admin = await prisma.admin.findUnique({
            where: { id: req.user!.userId },
            include: {
                role: { select: { id: true, name: true, permissions: true } }
            }
        });

        if (!admin) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ดูแล' });
        }

        // Parse permissions
        let permissions: Record<string, Record<string, boolean>> = {};
        if (admin.isSuperAdmin || req.user?.role === 'SUPER_ADMIN') {
            // Super admin has all permissions - matching PERMISSION_MATRIX
            permissions = {
                members: { view: true, view_detail: true, create: true, edit: true, delete: true, view_logs: true },
                manual: { view_deposits: true, view_withdrawals: true, add_credit: true, add_bonus: true, deduct: true, approve_deposit: true, approve_withdraw: true, reject_withdraw: true },
                reports: { view_new_users: true, view_deposits: true, view_withdrawals: true, view_bonus: true, view_profit: true, view_inactive: true },
                settings: { view: true, edit: true, banks: true, truemoney: true, agents: true, features: true },
                promotions: { view: true, create: true, edit: true, delete: true, view_logs: true },
                banners: { view: true, create: true, edit: true, delete: true },
                games: { view: true, edit: true },
                announcements: { view: true, create: true, edit: true, delete: true },
                agents: { view: true, create: true, edit: true, delete: true },
                staff: { view: true, create: true, edit: true, delete: true, manage_roles: true, view_logs: true },
            };
        } else if (admin.role) {
            try {
                permissions = JSON.parse(admin.role.permissions || '{}');
            } catch (e) {
                permissions = {};
            }
        }

        res.json({
            success: true,
            data: {
                id: admin.id,
                username: admin.username,
                fullName: admin.fullName,
                isSuperAdmin: admin.isSuperAdmin,
                role: admin.role ? { id: admin.role.id, name: admin.role.name } : null,
                permissions
            }
        });
    } catch (error) {
        console.error('Get admin me error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// Sub-routes
router.use('/dashboard', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/transactions', transactionRoutes);
router.use('/manual', manualRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingRoutes);
router.use('/categories', categoryRoutes);
router.use('/providers', providerRoutes);
router.use('/games', gameRoutes);
router.use('/promotions', promotionRoutes);
router.use('/banners', bannerRoutes);
router.use('/activities', activitiesRoutes);

export default router;

import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware, AuthRequest } from '../../middlewares/auth.middleware.js';
import prisma from '../../lib/db.js';

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
import uploadRoutes from './upload.routes.js';
import agentRoutes from './agent.routes.js';
import paymentGatewayRoutes from './payment-gateway.routes.js';
import mixRoutes from './mix.routes.js';
import alertRoutes from './alert.routes.js';

const router = Router();
// Import sub-routes require auth + admin role
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
        const isActuallySuperAdmin = admin.isSuperAdmin || admin.role?.name === 'Super Admin';

        if (isActuallySuperAdmin || req.user?.role === 'SUPER_ADMIN') {
            // Super admin has all permissions - matching PERMISSION_MATRIX
            permissions = {
                members: { list: true, register: true, edit_general: true, edit_bank: true, edit_password: true, change_status: true, delete: true, history: true },
                manual: { deposit: true, withdraw: true, withdrawals: true, history: true },
                reports: { new_users: true, new_users_deposit: true, deposits: true, withdrawals: true, bonus: true, profit: true, inactive_users: true, win_lose: true },
                settings: { general: true, features: true, contacts: true, notify: true, banks: true, truemoney: true, logobank: true, payment: true },
                promotions: { list: true, history: true },
                banners: { banners: true, announcements: true },
                agents: { settings: true, import: true, categories: true, providers: true, games: true, mix_board: true, connection_test: true },
                activities: { cashback: true, streak: true, commission: true, history: true, referral: true, ranks: true },
                staff: { admins: true, roles: true, logs: true },
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
                isSuperAdmin: isActuallySuperAdmin,
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
router.use('/upload', uploadRoutes);
router.use('/agents', agentRoutes);
router.use('/payment-gateways', paymentGatewayRoutes);
router.use('/mix', mixRoutes);
router.use('/alerts', alertRoutes);

export default router;

import { Router } from 'express';
import { authMiddleware, adminMiddleware, requirePermission } from '../middlewares/auth.middleware.js';
import {
    getStaffList, createStaff, updateStaff, deleteStaff,
    getRoles, createRole, updateRole, deleteRole,
    getAdminLogs
} from '../controllers/staff.controller.js';

const router = Router();

// Staff (ต้องมีสิทธิ์ staff)
router.get('/users', authMiddleware, adminMiddleware, requirePermission('staff', 'view'), getStaffList);
router.post('/users', authMiddleware, adminMiddleware, requirePermission('staff', 'edit'), createStaff);
router.put('/users/:id', authMiddleware, adminMiddleware, requirePermission('staff', 'edit'), updateStaff);
router.delete('/users/:id', authMiddleware, adminMiddleware, requirePermission('staff', 'delete'), deleteStaff);

// Roles (ต้องมีสิทธิ์ staff.manage_roles)
router.get('/roles', authMiddleware, adminMiddleware, requirePermission('staff', 'view'), getRoles);
router.post('/roles', authMiddleware, adminMiddleware, requirePermission('staff', 'manage_roles'), createRole);
router.put('/roles/:id', authMiddleware, adminMiddleware, requirePermission('staff', 'manage_roles'), updateRole);
router.delete('/roles/:id', authMiddleware, adminMiddleware, requirePermission('staff', 'manage_roles'), deleteRole);

// Logs (ต้องมีสิทธิ์ staff ดู)
router.get('/logs', authMiddleware, adminMiddleware, requirePermission('staff', 'view'), getAdminLogs);

export default router;


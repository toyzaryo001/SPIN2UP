import { Router } from 'express';
import { authMiddleware, adminMiddleware, requirePermission } from '../middlewares/auth.middleware.js';
import {
    getStaffList, createStaff, updateStaff, deleteStaff,
    getRoles, createRole, updateRole, deleteRole,
    getAdminLogs
} from '../controllers/staff.controller.js';

const router = Router();

// Staff (ต้องมีสิทธิ์ staff.admins)
router.get('/users', authMiddleware, adminMiddleware, requirePermission('staff', 'admins', 'view'), getStaffList);
router.post('/users', authMiddleware, adminMiddleware, requirePermission('staff', 'admins', 'manage'), createStaff);
router.put('/users/:id', authMiddleware, adminMiddleware, requirePermission('staff', 'admins', 'manage'), updateStaff);
router.delete('/users/:id', authMiddleware, adminMiddleware, requirePermission('staff', 'admins', 'manage'), deleteStaff);

// Roles (ต้องมีสิทธิ์ staff.roles)
router.get('/roles', authMiddleware, adminMiddleware, requirePermission('staff', 'roles', 'view'), getRoles);
router.post('/roles', authMiddleware, adminMiddleware, requirePermission('staff', 'roles', 'manage'), createRole);
router.put('/roles/:id', authMiddleware, adminMiddleware, requirePermission('staff', 'roles', 'manage'), updateRole);
router.delete('/roles/:id', authMiddleware, adminMiddleware, requirePermission('staff', 'roles', 'manage'), deleteRole);

// Logs (ต้องมีสิทธิ์ staff ดู)
router.get('/logs', authMiddleware, adminMiddleware, requirePermission('staff', 'logs', 'view'), getAdminLogs);

export default router;


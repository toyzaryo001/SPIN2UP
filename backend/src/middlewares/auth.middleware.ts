import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
    user?: JwtPayload;
    userPermissions?: string[];
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'ไม่พบ Token' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = verifyToken(token);
        req.user = payload;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
    }
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'ไม่พบ Token' });
    }

    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    next();
}

// Permission categories and their mapping
// Format: category.action (e.g. members.view, members.edit, members.delete)
export const PERMISSION_MAP = {
    members: { view: 'view', edit: 'edit', delete: 'delete' },
    manual: { view: 'view', edit: 'deposit', delete: 'withdraw' },
    reports: { view: 'view' },
    settings: { view: 'view', edit: 'edit' },
    promotions: { view: 'view', edit: 'edit', delete: 'delete' },
    staff: { view: 'view', edit: 'edit', delete: 'delete' },
};

// Middleware to check specific permission
// Usage: requirePermission('members', 'view') or requirePermission('members', 'delete')
export function requirePermission(category: string, action: string) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'ไม่พบ Token' });
        }

        // Super admin or SUPER_ADMIN role has all permissions
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }

        try {
            // Get admin with their role (now using Admin model, not User)
            const admin = await prisma.admin.findUnique({
                where: { id: req.user.userId },
                include: { role: true }
            });

            if (!admin) {
                return res.status(401).json({ success: false, message: 'ไม่พบผู้ดูแลระบบ' });
            }

            // Super admin bypass
            if (admin.isSuperAdmin) {
                return next();
            }

            // If no role, default behavior
            if (!admin.role) {
                // ADMIN without role = view-only access
                if (action === 'view') {
                    return next();
                }
                return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ดำเนินการนี้' });
            }

            // Parse permissions from JSON string
            let permissions: Record<string, Record<string, boolean>> = {};
            try {
                permissions = JSON.parse(admin.role.permissions || '{}');
            } catch (e) {
                permissions = {};
            }

            // Check if admin has the required permission
            if (permissions[category]?.[action] === true) {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: `ไม่มีสิทธิ์: ${category}.${action}`,
                requiredPermission: `${category}.${action}`
            });
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' });
        }
    };
}


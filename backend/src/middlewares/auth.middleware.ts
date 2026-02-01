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
// Middleware to check specific permission
// Usage: 
// Level 3 (New): requirePermission('members', 'list', 'view')
// Level 2 (Legacy mapped): requirePermission('members', 'list') -> assumes 'view' if list has view/manage
export function requirePermission(category: string, featureOrAction: string, actionOrNull?: string) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'ไม่พบ Token' });
        }

        // Super admin or SUPER_ADMIN role has all permissions
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }

        try {
            const admin = await prisma.admin.findUnique({
                where: { id: req.user.userId },
                include: { role: true }
            });

            if (!admin) {
                return res.status(401).json({ success: false, message: 'ไม่พบผู้ดูแลระบบ' });
            }

            if (admin.isSuperAdmin) {
                return next();
            }

            if (!admin.role) {
                // Read-only logic? For now assume strict.
                return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ดำเนินการนี้ (No Role)' });
            }

            // Parse permissions
            let permissions: Record<string, Record<string, { view: boolean; manage: boolean }>> = {};
            try {
                permissions = JSON.parse(admin.role.permissions || '{}');
            } catch (e) {
                permissions = {};
            }

            // Determine check type
            let requiredAction = 'view';
            let requiredFeature = featureOrAction;

            if (actionOrNull) {
                requiredFeature = featureOrAction;
                requiredAction = actionOrNull; // 'view' or 'manage'
            } else {
                // Backward compatibility or 2-arg usage: ('members', 'view')?? 
                // It's hard to map perfectly without refactoring all routes. 
                // If we receive ('members', 'view'), 'view' is treated as feature? NO.
                // We will REFACTOR ALL ROUTES to 3 args for safety.
                // For now, if 2 args provided, assume feature=featureOrAction and action='view'.
                requiredAction = 'view';
            }

            // Check
            // permissions[category][feature][action]
            const catPerms = permissions[category];
            const featPerms = catPerms ? catPerms[requiredFeature as any] : undefined;

            // Handle legacy structure if present (e.g. true/false instead of object)
            // But new frontend saves {view: bool, manage: bool}.
            const hasPerm = featPerms && (featPerms as any)[requiredAction] === true;

            if (hasPerm) {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: `ไม่มีสิทธิ์: ${category}.${requiredFeature}.${requiredAction}`,
                requiredPermission: `${category}.${requiredFeature}.${requiredAction}`
            });
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' });
        }
    };
}


import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/db.js';
import * as prefixService from '../../services/prefix.service.js';
import { signToken, verifyToken } from '../../utils/jwt.js';

const router = Router();

// Middleware to verify Super Admin JWT
const verifySuperAdmin = async (req: Request, res: Response, next: any) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'ไม่พบ token' });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token) as any;

        if (decoded.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ Super Admin' });
        }

        (req as any).superAdmin = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token ไม่ถูกต้อง' });
    }
};

// ==========================================
// SUPER ADMIN AUTHENTICATION
// ==========================================

// POST /api/super-admin/login
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        const admin = await prisma.superAdmin.findUnique({
            where: { username }
        });

        if (!admin || !admin.isActive) {
            return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }

        const isValid = await bcrypt.compare(password, admin.password);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }

        // Update last login
        await prisma.superAdmin.update({
            where: { id: admin.id },
            data: { lastLoginAt: new Date() }
        });

        // Log login
        await prisma.superAdminLog.create({
            data: {
                superAdminId: admin.id,
                action: 'LOGIN',
                ip: req.ip || req.headers['x-forwarded-for'] as string
            }
        });

        // Generate JWT
        const token = signToken({
            userId: admin.id,
            role: 'SUPER_ADMIN'
        });

        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: admin.id,
                    username: admin.username,
                    fullName: admin.fullName,
                    email: admin.email
                }
            }
        });
    } catch (error) {
        console.error('Super Admin login error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/super-admin/setup - Create first Super Admin
router.post('/setup', async (req: Request, res: Response) => {
    try {
        const { username, password, fullName, email } = req.body;

        // Check if Super Admin already exists
        const existingAdmin = await prisma.superAdmin.count();
        if (existingAdmin > 0) {
            return res.status(400).json({
                success: false,
                message: 'มี Super Admin อยู่แล้ว ไม่สามารถสร้างใหม่ได้'
            });
        }

        if (!username || !password || !fullName) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลให้ครบ'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create Super Admin
        const admin = await prisma.superAdmin.create({
            data: {
                username,
                password: hashedPassword,
                fullName,
                email: email || null
            }
        });

        res.status(201).json({
            success: true,
            message: 'สร้าง Super Admin สำเร็จ',
            data: {
                id: admin.id,
                username: admin.username,
                fullName: admin.fullName
            }
        });
    } catch (error) {
        console.error('Setup Super Admin error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/super-admin/me
router.get('/me', verifySuperAdmin, async (req: Request, res: Response) => {
    try {
        const decoded = (req as any).superAdmin;
        const admin = await prisma.superAdmin.findUnique({
            where: { id: decoded.userId }
        });

        if (!admin) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
        }

        res.json({
            success: true,
            data: {
                id: admin.id,
                username: admin.username,
                fullName: admin.fullName,
                email: admin.email
            }
        });
    } catch (error) {
        console.error('Get super admin error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// ==========================================
// PREFIX MANAGEMENT (Super Admin Only)
// ==========================================

// GET /api/super-admin/prefixes
router.get('/prefixes', verifySuperAdmin, async (req: Request, res: Response) => {
    try {
        const prefixes = await prefixService.getAllPrefixes();
        res.json({ success: true, data: prefixes });
    } catch (error) {
        console.error('Get prefixes error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/super-admin/prefixes/:id
router.get('/prefixes/:id', verifySuperAdmin, async (req: Request, res: Response) => {
    try {
        const prefix = await prisma.prefix.findUnique({
            where: { id: Number(req.params.id) }
        });

        if (!prefix) {
            return res.status(404).json({ success: false, message: 'ไม่พบ Prefix' });
        }

        res.json({ success: true, data: prefix });
    } catch (error) {
        console.error('Get prefix error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/super-admin/prefixes
router.post('/prefixes', verifySuperAdmin, async (req: Request, res: Response) => {
    try {
        const { code, name, databaseUrl, adminDomain, playerDomain, logo, primaryColor } = req.body;

        if (!code || !name || !databaseUrl) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
        }

        // Check if code already exists
        const existing = await prefixService.getPrefixByCode(code);
        if (existing) {
            return res.status(400).json({ success: false, message: 'รหัส Prefix นี้มีอยู่แล้ว' });
        }

        const prefix = await prefixService.createPrefix({
            code,
            name,
            databaseUrl,
            adminDomain,
            playerDomain,
            logo,
            primaryColor
        });

        // Log action
        const decoded = (req as any).superAdmin;
        await prisma.superAdminLog.create({
            data: {
                superAdminId: decoded.userId,
                action: 'CREATE_PREFIX',
                details: JSON.stringify({ prefixId: prefix.id, code: prefix.code }),
                ip: req.ip || req.headers['x-forwarded-for'] as string
            }
        });

        res.status(201).json({ success: true, data: prefix });
    } catch (error) {
        console.error('Create prefix error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/super-admin/prefixes/:id
router.put('/prefixes/:id', verifySuperAdmin, async (req: Request, res: Response) => {
    try {
        const { code, name, databaseUrl, adminDomain, playerDomain, logo, primaryColor, isActive } = req.body;

        const prefix = await prefixService.updatePrefix(Number(req.params.id), {
            code,
            name,
            databaseUrl,
            adminDomain,
            playerDomain,
            logo,
            primaryColor,
            isActive
        });

        // Log action
        const decoded = (req as any).superAdmin;
        await prisma.superAdminLog.create({
            data: {
                superAdminId: decoded.userId,
                action: 'UPDATE_PREFIX',
                details: JSON.stringify({ prefixId: prefix.id }),
                ip: req.ip || req.headers['x-forwarded-for'] as string
            }
        });

        res.json({ success: true, data: prefix });
    } catch (error) {
        console.error('Update prefix error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// DELETE /api/super-admin/prefixes/:id
router.delete('/prefixes/:id', verifySuperAdmin, async (req: Request, res: Response) => {
    try {
        const prefixId = Number(req.params.id);

        // Get prefix info for logging
        const prefix = await prisma.prefix.findUnique({ where: { id: prefixId } });

        await prefixService.deletePrefix(prefixId);

        // Log action
        const decoded = (req as any).superAdmin;
        await prisma.superAdminLog.create({
            data: {
                superAdminId: decoded.userId,
                action: 'DELETE_PREFIX',
                details: JSON.stringify({ prefixId, code: prefix?.code }),
                ip: req.ip || req.headers['x-forwarded-for'] as string
            }
        });

        res.json({ success: true, message: 'ลบ Prefix สำเร็จ' });
    } catch (error) {
        console.error('Delete prefix error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/super-admin/logs
router.get('/logs', verifySuperAdmin, async (req: Request, res: Response) => {
    try {
        const logs = await prisma.superAdminLog.findMany({
            include: { superAdmin: { select: { username: true, fullName: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json({ success: true, data: logs });
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

export default router;

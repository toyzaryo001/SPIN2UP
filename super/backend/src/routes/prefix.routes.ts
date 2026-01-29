import { Router, Request, Response } from 'express';
import prisma from '../lib/db.js';
import { verifySuperAdmin } from './auth.routes.js';
import * as bcrypt from 'bcryptjs';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const router = Router();

// GET /api/prefixes - Get all prefixes
router.get('/', verifySuperAdmin, async (req: Request, res: Response) => {
    try {
        const prefixes = await prisma.prefix.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: prefixes });
    } catch (error) {
        console.error('Get prefixes error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/prefixes/:id - Get single prefix
router.get('/:id', verifySuperAdmin, async (req: Request, res: Response) => {
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

// POST /api/prefixes - Create new prefix
router.post('/', verifySuperAdmin, async (req: Request, res: Response) => {
    try {
        const { code, name, databaseUrl, adminDomain, playerDomain, logo, primaryColor, createInitialAdmin, initialAdminUsername, initialAdminPassword } = req.body;

        if (!code || !name || !databaseUrl) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
        }

        // Check if code already exists
        const existing = await prisma.prefix.findUnique({ where: { code: code.toLowerCase() } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'รหัส Prefix นี้มีอยู่แล้ว' });
        }

        const prefix = await prisma.prefix.create({
            data: {
                code: code.toLowerCase(),
                name,
                databaseUrl,
                adminDomain,
                playerDomain,
                logo,
                primaryColor
            }
        });

        // Create Initial Admin in Tenant DB?
        if (createInitialAdmin && initialAdminUsername && initialAdminPassword) {
            try {
                // Auto-Migrate: Ensure tables exist
                await runTenantMigration(databaseUrl);

                const { PrismaClient } = await import('@prisma/client');
                const tenantPrisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

                const hashedPassword = await bcrypt.hash(initialAdminPassword, 10);

                // Use raw query to avoid needing generated types
                await tenantPrisma.$executeRawUnsafe(
                    `INSERT INTO "Admin" ("username", "password", "fullName", "isSuperAdmin", "isActive", "updatedAt") VALUES ($1, $2, 'Root Admin', true, true, NOW())`,
                    initialAdminUsername,
                    hashedPassword
                );

                await tenantPrisma.$disconnect();
            } catch (err: any) {
                console.error("Failed to create initial admin:", err);
                return res.status(201).json({
                    success: true,
                    data: prefix,
                    warning: `สร้าง Prefix สำเร็จ แต่สร้าง Admin ไม่สำเร็จ: ${err.message}`
                });
            }
        }

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

// PUT /api/prefixes/:id - Update prefix
router.put('/:id', verifySuperAdmin, async (req: Request, res: Response) => {
    try {
        const { code, name, databaseUrl, adminDomain, playerDomain, logo, primaryColor, isActive } = req.body;

        const prefix = await prisma.prefix.update({
            where: { id: Number(req.params.id) },
            data: {
                ...(code && { code: code.toLowerCase() }),
                ...(name && { name }),
                ...(databaseUrl && { databaseUrl }),
                ...(adminDomain !== undefined && { adminDomain }),
                ...(playerDomain !== undefined && { playerDomain }),
                ...(logo !== undefined && { logo }),
                ...(primaryColor !== undefined && { primaryColor }),
                ...(isActive !== undefined && { isActive })
            }
        });

        // Create/Update Initial Admin in Tenant DB?
        if (req.body.createInitialAdmin && req.body.initialAdminUsername && req.body.initialAdminPassword) {
            try {
                // Auto-Migrate: Ensure tables exist
                await runTenantMigration(databaseUrl || prefix.databaseUrl);

                const { PrismaClient } = await import('@prisma/client');
                const tenantPrisma = new PrismaClient({ datasources: { db: { url: databaseUrl || prefix.databaseUrl } } });
                // const bcrypt = await import('bcryptjs'); // Removed dynamic import

                const hashedPassword = await bcrypt.hash(req.body.initialAdminPassword, 10);

                // Use raw query for Upsert (Insert or Update Password if exists)
                await tenantPrisma.$executeRawUnsafe(
                    `INSERT INTO "Admin" ("username", "password", "fullName", "isSuperAdmin", "isActive", "updatedAt") 
                     VALUES ($1, $2, 'Root Admin', true, true, NOW())
                     ON CONFLICT ("username") 
                     DO UPDATE SET "password" = $2, "isActive" = true, "updatedAt" = NOW()`,
                    req.body.initialAdminUsername,
                    hashedPassword
                );

                await tenantPrisma.$disconnect();
            } catch (err: any) {
                console.error("Failed to create/update initial admin:", err);
                return res.json({
                    success: true,
                    data: prefix,
                    warning: `บันทึก Prefix สำเร็จ แต่สร้าง Admin ไม่สำเร็จ: ${err.message}`
                });
            }
        }

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

// DELETE /api/prefixes/:id - Delete prefix
router.delete('/:id', verifySuperAdmin, async (req: Request, res: Response) => {
    try {
        const prefixId = Number(req.params.id);

        const prefix = await prisma.prefix.findUnique({ where: { id: prefixId } });

        await prisma.prefix.delete({ where: { id: prefixId } });

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

// ==========================================
// PREFIX REQUESTS (For approval workflow)
// ==========================================

// GET /api/prefixes/requests/pending
router.get('/requests/pending', verifySuperAdmin, async (req: Request, res: Response) => {
    try {
        const requests = await prisma.prefixRequest.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: requests });
    } catch (error) {
        console.error('Get requests error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/prefixes/requests/:id/approve
router.post('/requests/:id/approve', verifySuperAdmin, async (req: Request, res: Response) => {
    try {
        const requestId = Number(req.params.id);
        const { databaseUrl } = req.body;
        const decoded = (req as any).superAdmin;

        const request = await prisma.prefixRequest.findUnique({ where: { id: requestId } });
        if (!request) {
            return res.status(404).json({ success: false, message: 'ไม่พบคำขอ' });
        }

        // Create the prefix
        const prefix = await prisma.prefix.create({
            data: {
                code: request.requestCode.toLowerCase(),
                name: request.requestName,
                databaseUrl: databaseUrl,
                isActive: true
            }
        });

        // Update request status
        await prisma.prefixRequest.update({
            where: { id: requestId },
            data: {
                status: 'APPROVED',
                approvedAt: new Date(),
                approvedBy: decoded.userId
            }
        });

        // Log action
        await prisma.superAdminLog.create({
            data: {
                superAdminId: decoded.userId,
                action: 'APPROVE_PREFIX_REQUEST',
                details: JSON.stringify({ requestId, prefixId: prefix.id }),
                ip: req.ip || req.headers['x-forwarded-for'] as string
            }
        });

        res.json({ success: true, data: prefix });
    } catch (error) {
        console.error('Approve request error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/prefixes/requests/:id/reject
router.post('/requests/:id/reject', verifySuperAdmin, async (req: Request, res: Response) => {
    try {
        const requestId = Number(req.params.id);
        const { notes } = req.body;
        const decoded = (req as any).superAdmin;

        await prisma.prefixRequest.update({
            where: { id: requestId },
            data: {
                status: 'REJECTED',
                notes
            }
        });

        // Log action
        await prisma.superAdminLog.create({
            data: {
                superAdminId: decoded.userId,
                action: 'REJECT_PREFIX_REQUEST',
                details: JSON.stringify({ requestId }),
                ip: req.ip || req.headers['x-forwarded-for'] as string
            }
        });

        res.json({ success: true, message: 'ปฏิเสธคำขอเรียบร้อย' });
    } catch (error) {
        console.error('Reject request error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/prefixes/logs - Get activity logs
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



// Helper: Run Prisma Migration for Tenant
async function runTenantMigration(databaseUrl: string) {
    try {
        console.log(`Starting Auto-Migration for ${databaseUrl}...`);
        const schemaPath = '../backend/prisma/schema.prisma'; // Relative to super/backend

        // Run prisma db push
        const { stdout, stderr } = await execPromise(`npx prisma db push --schema=${schemaPath} --accept-data-loss --skip-generate`, {
            env: { ...process.env, DATABASE_URL: databaseUrl },
            cwd: process.cwd(), // super/backend
            timeout: 60000 // 1 minute timeout
        });

        console.log('Migration output:', stdout);
        if (stderr) console.warn('Migration stderr:', stderr);

    } catch (error: any) {
        console.error('Migration failed:', error);
        // Throwing error here will be caught by the route handler and returned as warning
        throw new Error(`Auto-Migrate Failed: ${error.message}`);
    }
}

export default router;

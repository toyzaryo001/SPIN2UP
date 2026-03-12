"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_js_1 = __importDefault(require("../lib/db.js"));
const auth_routes_js_1 = require("./auth.routes.js");
const bcrypt = __importStar(require("bcryptjs"));
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const path_1 = __importDefault(require("path"));
const execPromise = util_1.default.promisify(child_process_1.exec);
const router = (0, express_1.Router)();
// GET /api/prefixes - Get all prefixes
router.get('/', auth_routes_js_1.verifySuperAdmin, async (req, res) => {
    try {
        const prefixes = await db_js_1.default.prefix.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: prefixes });
    }
    catch (error) {
        console.error('Get prefixes error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});
// GET /api/prefixes/:id - Get single prefix
router.get('/:id', auth_routes_js_1.verifySuperAdmin, async (req, res) => {
    try {
        const prefix = await db_js_1.default.prefix.findUnique({
            where: { id: Number(req.params.id) }
        });
        if (!prefix) {
            return res.status(404).json({ success: false, message: 'ไม่พบ Prefix' });
        }
        res.json({ success: true, data: prefix });
    }
    catch (error) {
        console.error('Get prefix error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});
// POST /api/prefixes - Create new prefix
router.post('/', auth_routes_js_1.verifySuperAdmin, async (req, res) => {
    try {
        const { code, name, databaseUrl, adminDomain, playerDomain, logo, primaryColor, createInitialAdmin, initialAdminUsername, initialAdminPassword } = req.body;
        if (!code || !name || !databaseUrl) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
        }
        // Check if code already exists
        const existing = await db_js_1.default.prefix.findUnique({ where: { code: code.toLowerCase() } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'รหัส Prefix นี้มีอยู่แล้ว' });
        }
        const prefix = await db_js_1.default.prefix.create({
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
                const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
                const tenantPrisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
                const hashedPassword = await bcrypt.hash(initialAdminPassword, 10);
                // Use raw query to avoid needing generated types
                await tenantPrisma.$executeRawUnsafe(`INSERT INTO "Admin" ("username", "password", "fullName", "isSuperAdmin", "isActive", "updatedAt") VALUES ($1, $2, 'Root Admin', true, true, NOW())`, initialAdminUsername, hashedPassword);
                await tenantPrisma.$disconnect();
            }
            catch (err) {
                console.error("Failed to create initial admin:", err);
                return res.status(201).json({
                    success: true,
                    data: prefix,
                    warning: `สร้าง Prefix สำเร็จ แต่สร้าง Admin ไม่สำเร็จ: ${err.message}`
                });
            }
        }
        // Log action
        const decoded = req.superAdmin;
        await db_js_1.default.superAdminLog.create({
            data: {
                superAdminId: decoded.userId,
                action: 'CREATE_PREFIX',
                details: JSON.stringify({ prefixId: prefix.id, code: prefix.code }),
                ip: req.ip || req.headers['x-forwarded-for']
            }
        });
        res.status(201).json({ success: true, data: prefix });
    }
    catch (error) {
        console.error('Create prefix error:', error);
        res.status(500).json({ success: false, message: error?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
    }
});
// PUT /api/prefixes/:id - Update prefix
router.put('/:id', auth_routes_js_1.verifySuperAdmin, async (req, res) => {
    try {
        const { code, name, databaseUrl, adminDomain, playerDomain, logo, primaryColor, isActive } = req.body;
        const prefix = await db_js_1.default.prefix.update({
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
                const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
                const tenantPrisma = new PrismaClient({ datasources: { db: { url: databaseUrl || prefix.databaseUrl } } });
                // const bcrypt = await import('bcryptjs'); // Removed dynamic import
                const hashedPassword = await bcrypt.hash(req.body.initialAdminPassword, 10);
                // Use raw query for Upsert (Insert or Update Password if exists)
                await tenantPrisma.$executeRawUnsafe(`INSERT INTO "Admin" ("username", "password", "fullName", "isSuperAdmin", "isActive", "updatedAt") 
                     VALUES ($1, $2, 'Root Admin', true, true, NOW())
                     ON CONFLICT ("username") 
                     DO UPDATE SET "password" = $2, "isActive" = true, "isSuperAdmin" = true, "updatedAt" = NOW()`, req.body.initialAdminUsername, hashedPassword);
                await tenantPrisma.$disconnect();
            }
            catch (err) {
                console.error("Failed to create/update initial admin:", err);
                return res.json({
                    success: true,
                    data: prefix,
                    warning: `บันทึก Prefix สำเร็จ แต่สร้าง Admin ไม่สำเร็จ: ${err.message}`
                });
            }
        }
        // Log action
        const decoded = req.superAdmin;
        await db_js_1.default.superAdminLog.create({
            data: {
                superAdminId: decoded.userId,
                action: 'UPDATE_PREFIX',
                details: JSON.stringify({ prefixId: prefix.id }),
                ip: req.ip || req.headers['x-forwarded-for']
            }
        });
        res.json({ success: true, data: prefix });
    }
    catch (error) {
        console.error('Update prefix error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});
// DELETE /api/prefixes/:id - Delete prefix
router.delete('/:id', auth_routes_js_1.verifySuperAdmin, async (req, res) => {
    try {
        const prefixId = Number(req.params.id);
        const prefix = await db_js_1.default.prefix.findUnique({ where: { id: prefixId } });
        await db_js_1.default.prefix.delete({ where: { id: prefixId } });
        // Log action
        const decoded = req.superAdmin;
        await db_js_1.default.superAdminLog.create({
            data: {
                superAdminId: decoded.userId,
                action: 'DELETE_PREFIX',
                details: JSON.stringify({ prefixId, code: prefix?.code }),
                ip: req.ip || req.headers['x-forwarded-for']
            }
        });
        res.json({ success: true, message: 'ลบ Prefix สำเร็จ' });
    }
    catch (error) {
        console.error('Delete prefix error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});
// ==========================================
// PREFIX REQUESTS (For approval workflow)
// ==========================================
// GET /api/prefixes/requests/pending
router.get('/requests/pending', auth_routes_js_1.verifySuperAdmin, async (req, res) => {
    try {
        const requests = await db_js_1.default.prefixRequest.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: requests });
    }
    catch (error) {
        console.error('Get requests error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});
// POST /api/prefixes/requests/:id/approve
router.post('/requests/:id/approve', auth_routes_js_1.verifySuperAdmin, async (req, res) => {
    try {
        const requestId = Number(req.params.id);
        const { databaseUrl } = req.body;
        const decoded = req.superAdmin;
        const request = await db_js_1.default.prefixRequest.findUnique({ where: { id: requestId } });
        if (!request) {
            return res.status(404).json({ success: false, message: 'ไม่พบคำขอ' });
        }
        // Create the prefix
        const prefix = await db_js_1.default.prefix.create({
            data: {
                code: request.requestCode.toLowerCase(),
                name: request.requestName,
                databaseUrl: databaseUrl,
                isActive: true
            }
        });
        // Update request status
        await db_js_1.default.prefixRequest.update({
            where: { id: requestId },
            data: {
                status: 'APPROVED',
                approvedAt: new Date(),
                approvedBy: decoded.userId
            }
        });
        // Log action
        await db_js_1.default.superAdminLog.create({
            data: {
                superAdminId: decoded.userId,
                action: 'APPROVE_PREFIX_REQUEST',
                details: JSON.stringify({ requestId, prefixId: prefix.id }),
                ip: req.ip || req.headers['x-forwarded-for']
            }
        });
        res.json({ success: true, data: prefix });
    }
    catch (error) {
        console.error('Approve request error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});
// POST /api/prefixes/requests/:id/reject
router.post('/requests/:id/reject', auth_routes_js_1.verifySuperAdmin, async (req, res) => {
    try {
        const requestId = Number(req.params.id);
        const { notes } = req.body;
        const decoded = req.superAdmin;
        await db_js_1.default.prefixRequest.update({
            where: { id: requestId },
            data: {
                status: 'REJECTED',
                notes
            }
        });
        // Log action
        await db_js_1.default.superAdminLog.create({
            data: {
                superAdminId: decoded.userId,
                action: 'REJECT_PREFIX_REQUEST',
                details: JSON.stringify({ requestId }),
                ip: req.ip || req.headers['x-forwarded-for']
            }
        });
        res.json({ success: true, message: 'ปฏิเสธคำขอเรียบร้อย' });
    }
    catch (error) {
        console.error('Reject request error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});
// GET /api/prefixes/logs - Get activity logs
router.get('/logs', auth_routes_js_1.verifySuperAdmin, async (req, res) => {
    try {
        const logs = await db_js_1.default.superAdminLog.findMany({
            include: { superAdmin: { select: { username: true, fullName: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json({ success: true, data: logs });
    }
    catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});
// Helper: Run Prisma Migration for Tenant
async function runTenantMigration(databaseUrl) {
    try {
        console.log(`Starting Auto-Migration for ${databaseUrl}...`);
        const schemaPath = path_1.default.resolve(process.cwd(), 'prisma/tenant.prisma');
        // Run prisma db push
        const { stdout, stderr } = await execPromise(`npx prisma db push --schema="${schemaPath}" --accept-data-loss --skip-generate`, {
            env: { ...process.env, DATABASE_URL: databaseUrl },
            cwd: process.cwd(), // super/backend
            timeout: 60000 // 1 minute timeout
        });
        console.log('Migration output:', stdout);
        if (stderr)
            console.warn('Migration stderr:', stderr);
    }
    catch (error) {
        console.error('Migration failed:', error);
        // Throwing error here will be caught by the route handler and returned as warning
        throw new Error(`Auto-Migrate Failed: ${error.message}`);
    }
}
exports.default = router;

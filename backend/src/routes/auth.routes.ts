import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { signToken } from '../utils/jwt.js';
import { BetflixService } from '../services/betflix.service.js';

const router = Router();

// Validation schemas
const registerSchema = z.object({
    fullName: z.string().min(2, 'ชื่อ-นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร'),
    phone: z.string().regex(/^0\d{9}$/, 'เบอร์โทรไม่ถูกต้อง'),
    bankName: z.string().min(1, 'กรุณาเลือกธนาคาร'),
    bankAccount: z.string().min(10, 'เลขบัญชีไม่ถูกต้อง'),
    password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
    confirmPassword: z.string(),
    lineId: z.string().optional(),
    referrerCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'รหัสผ่านไม่ตรงกัน',
    path: ['confirmPassword'],
});

const loginSchema = z.object({
    phone: z.string().min(1, 'กรุณากรอกเบอร์โทร'),
    password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const validation = registerSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: validation.error.errors[0].message,
            });
        }

        const { fullName, phone, bankName, bankAccount, password, lineId, referrerCode } = validation.data;

        // Check if phone exists
        const existingPhone = await prisma.user.findUnique({ where: { phone } });
        if (existingPhone) {
            return res.status(400).json({ success: false, message: 'เบอร์โทรนี้ถูกใช้งานแล้ว' });
        }

        // Check if fullName exists
        const existingName = await prisma.user.findFirst({ where: { fullName } });
        if (existingName) {
            return res.status(400).json({ success: false, message: 'ชื่อ-นามสกุลนี้ถูกใช้งานแล้ว' });
        }

        // Check if bank account exists
        const existingBank = await prisma.user.findFirst({ where: { bankName, bankAccount } });
        if (existingBank) {
            return res.status(400).json({ success: false, message: 'เลขบัญชีธนาคารนี้ถูกใช้งานแล้ว' });
        }

        // Get prefix from settings
        const prefixSetting = await prisma.setting.findUnique({ where: { key: 'prefix' } });
        const prefix = prefixSetting?.value || 'U';

        // Generate username: prefix + last 6 digits of phone
        const phone6 = phone.slice(-6);
        const username = `${prefix}${phone6}`;

        // Check if username already exists
        const existingUsername = await prisma.user.findUnique({ where: { username } });
        if (existingUsername) {
            return res.status(400).json({ success: false, message: 'Username นี้มีอยู่แล้ว กรุณาใช้เบอร์โทรอื่น' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Find referrer
        let referredBy: number | undefined;
        if (referrerCode) {
            const referrer = await prisma.user.findFirst({ where: { referrerCode } });
            if (referrer) {
                referredBy = referrer.id;
            }
        }

        // Create user
        const user = await prisma.user.create({
            data: {
                username,
                fullName,
                phone,
                bankName,
                bankAccount,
                password: hashedPassword,
                lineId: lineId || null,
                referrerCode: `REF${Date.now().toString().slice(-8)}`,
                referredBy,
            },
        });

        // Register with Betflix
        try {
            const betflixUser = await BetflixService.register(phone);
            if (betflixUser) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        betflixUsername: betflixUser.username,
                        betflixPassword: betflixUser.password
                    }
                });
                // Update local user object for response (optional, typescript might complain if not typed, but it's any/inferred)
                (user as any).betflixUsername = betflixUser.username;
            }
        } catch (bfError) {
            console.error('Betflix Auto-Register Failed:', bfError);
        }

        // Generate token (all registrations are players, role is always USER)
        const token = signToken({ userId: user.id, role: 'USER' });

        res.status(201).json({
            success: true,
            message: 'สมัครสมาชิกสำเร็จ',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    fullName: user.fullName,
                    phone: user.phone,
                },
                token,
            },
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { phone, username, password } = req.body;

        // Must have password and either phone or username
        if (!password || (!phone && !username)) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลให้ครบ',
            });
        }

        // Find user by phone or username
        let user;
        if (phone) {
            user = await prisma.user.findUnique({ where: { phone } });
        } else if (username) {
            user = await prisma.user.findUnique({ where: { username } });
        }

        if (!user) {
            return res.status(401).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' });
        }

        // Check status
        if (user.status === 'SUSPENDED') {
            return res.status(403).json({ success: false, message: 'บัญชีถูกระงับ' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง' });
        }

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        // Generate token (for player, role is always USER)
        const token = signToken({ userId: user.id, role: 'USER' });

        res.json({
            success: true,
            message: 'เข้าสู่ระบบสำเร็จ',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    fullName: user.fullName,
                    phone: user.phone,
                    balance: user.balance,
                    bonusBalance: user.bonusBalance,
                },
                token,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// =====================
// ADMIN LOGIN (แยกจาก Player)
// =====================

const adminLoginSchema = z.object({
    username: z.string().min(1, 'กรุณากรอก Username'),
    password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
    prefix: z.string().optional(), // Optional for backward compatibility
});

// GET /api/auth/config
router.get('/config', async (req, res) => {
    try {
        const { domain } = req.query;
        if (!domain || typeof domain !== 'string') return res.json({ success: false });

        const superDbUrl = process.env.SUPER_DATABASE_URL;
        if (!superDbUrl) return res.status(500).json({ success: false, message: 'System Config Error' });

        const { PrismaClient } = await import('@prisma/client');
        const superPrisma = new PrismaClient({ datasources: { db: { url: superDbUrl } } });

        let prefixData: any = null;

        try {
            // Case-insensitive match, and handle potential www. prefix if needed (though frontend sends hostname)
            const cleanDomain = domain.replace(/^www\./, '').toLowerCase();

            const prefixResults = await superPrisma.$queryRawUnsafe(
                `SELECT code, name, "databaseUrl", "adminDomain", "playerDomain", logo, "primaryColor" 
                 FROM "Prefix" 
                 WHERE LOWER("adminDomain") LIKE $1 OR LOWER("playerDomain") LIKE $1 
                 LIMIT 1`,
                `%${cleanDomain}`
            ) as any[];

            if (prefixResults && prefixResults.length > 0) {
                prefixData = prefixResults[0];
            }
        } catch (dbErr) {
            console.error("SuperDB Query Error:", dbErr);
        } finally {
            await superPrisma.$disconnect();
        }

        if (prefixData) {
            // Connect to Tenant DB to get Settings
            let tenantSettings: any = {};

            try {
                const tenantPrisma = new PrismaClient({ datasources: { db: { url: prefixData.databaseUrl } } });
                try {
                    const settings = await tenantPrisma.setting.findMany();
                    settings.forEach((s: { key: string; value: string }) => {
                        tenantSettings[s.key] = s.value;
                    });
                } finally {
                    await tenantPrisma.$disconnect();
                }
            } catch (err) {
                console.error("Tenant settings fetch error (could be schema mismatch or connection)", err);
                // Non-fatal: we still have prefixData
            }

            res.json({
                success: true,
                data: {
                    code: prefixData.code,
                    // Prefer Tenant Setting > Super Admin Name
                    name: tenantSettings.siteName || prefixData.name,
                    // Prefer Tenant Setting > Super Admin Logo
                    logo: tenantSettings.logoUrl || prefixData.logo,
                    primaryColor: prefixData.primaryColor,
                    lineUrl: tenantSettings.lineUrl || ""
                }
            });
        } else {
            res.json({ success: false, message: "Prefix not found for domain" });
        }

    } catch (err) {
        console.error('Config lookup error:', err);
        res.status(500).json({ success: false });
    }
});

// POST /api/auth/admin/login
router.post('/admin/login', async (req, res) => {
    try {
        const validation = adminLoginSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: validation.error.errors[0].message,
            });
        }

        const { username, password, prefix } = validation.data;

        // 1. Validate Prefix & Get Tenant DB Config
        if (!prefix) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุ Prefix' });
        }

        // Use a separate connection to check the Super Admin DB (Master DB)
        const superDbUrl = process.env.SUPER_DATABASE_URL;
        if (!superDbUrl) {
            console.error('SERVER ERROR: SUPER_DATABASE_URL is not defined');
            return res.status(500).json({ success: false, message: 'System Config Error' });
        }

        const { PrismaClient } = await import('@prisma/client');
        const superPrisma = new PrismaClient({ datasources: { db: { url: superDbUrl } } });

        let targetPrefix;
        try {
            const prefixResults = await superPrisma.$queryRawUnsafe(
                `SELECT * FROM "Prefix" WHERE LOWER(code) = LOWER($1) LIMIT 1`,
                prefix
            ) as any[];
            if (prefixResults && prefixResults.length > 0) targetPrefix = prefixResults[0];
        } catch (err) {
            console.error('Super DB Error:', err);
            return res.status(500).json({ success: false, message: 'DB Error' });
        } finally {
            await superPrisma.$disconnect();
        }

        if (!targetPrefix) return res.status(401).json({ success: false, message: 'Prefix ไม่ถูกต้อง' });
        if (!targetPrefix.isActive) return res.status(403).json({ success: false, message: 'Prefix Inactive' });

        // 2. Connect to Tenant DB
        const tenantPrisma = new PrismaClient({ datasources: { db: { url: targetPrefix.databaseUrl } } });

        try {
            const admin = await tenantPrisma.admin.findUnique({
                where: { username },
                include: { role: true },
            });

            if (!admin) return res.status(401).json({ success: false, message: 'Username หรือรหัสผ่านไม่ถูกต้อง' });
            if (!admin.isActive) return res.status(403).json({ success: false, message: 'บัญชีถูกระงับ' });

            const isValidPassword = await bcrypt.compare(password, admin.password);
            if (!isValidPassword) return res.status(401).json({ success: false, message: 'Username หรือรหัสผ่านไม่ถูกต้อง' });

            await tenantPrisma.admin.update({
                where: { id: admin.id },
                data: { lastLoginAt: new Date() },
            });

            const role = admin.isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN';
            const token = signToken({ userId: admin.id, role, isAdmin: true, prefix: prefix || '' });

            res.json({
                success: true,
                message: 'เข้าสู่ระบบสำเร็จ',
                data: {
                    user: {
                        id: admin.id,
                        username: admin.username,
                        fullName: admin.fullName,
                        role,
                        isSuperAdmin: admin.isSuperAdmin,
                        permissions: admin.role?.permissions || '{}',
                        prefix: prefix || '',
                    },
                    token,
                },
            });
        } finally {
            await tenantPrisma.$disconnect();
        }
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

export default router;

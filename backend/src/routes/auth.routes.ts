import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { signToken } from '../utils/jwt.js';

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

        // Use main database for admin lookup (admins are in central DB for now)
        // In future, can switch to tenant DB based on prefix
        const admin = await prisma.admin.findUnique({
            where: { username },
            include: { role: true },
        });

        // Validate Prefix
        if (prefix) {
            const prefixSetting = await prisma.setting.findUnique({ where: { key: 'prefix' } });
            const systemPrefix = prefixSetting?.value;

            if (systemPrefix && systemPrefix.toLowerCase() !== prefix.toLowerCase()) {
                return res.status(401).json({ success: false, message: 'Prefix ไม่ถูกต้อง' });
            }
        }

        if (!admin) {
            return res.status(401).json({ success: false, message: 'Username หรือรหัสผ่านไม่ถูกต้อง' });
        }

        if (!admin.isActive) {
            return res.status(403).json({ success: false, message: 'บัญชีถูกระงับ' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, admin.password);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Username หรือรหัสผ่านไม่ถูกต้อง' });
        }

        // Update last login
        await prisma.admin.update({
            where: { id: admin.id },
            data: { lastLoginAt: new Date() },
        });

        // Generate token with ADMIN or SUPER_ADMIN role
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
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

export default router;

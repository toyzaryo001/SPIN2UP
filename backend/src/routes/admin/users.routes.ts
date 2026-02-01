import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../../lib/db.js';
import { AuthRequest, requirePermission } from '../../middlewares/auth.middleware.js';
import { BetflixService } from '../../services/betflix.service.js';

const router = Router();

// GET /api/admin/users - รายการผู้ใช้ (ต้องมีสิทธิ์ดู)
router.get('/', requirePermission('members', 'list', 'view'), async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status, role } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {};
        if (search) {
            where.OR = [
                { username: { contains: search } },
                { fullName: { contains: search } },
                { phone: { contains: search } },
            ];
        }
        if (status) {
            where.status = status;
        } else {
            where.status = { not: 'DELETED' };
        }
        // User table now only contains players (admins are in Admin table)

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    username: true,
                    fullName: true,
                    phone: true,
                    bankName: true,
                    bankAccount: true,
                    status: true,
                    balance: true,
                    bonusBalance: true,
                    lastLoginAt: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
                take: Number(limit),
                skip,
            }),
            prisma.user.count({ where }),
        ]);

        res.json({
            success: true,
            data: {
                users,
                pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
            },
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/admin/users/edit-logs - ประวัติแก้ไขทั้งหมด (MUST BE BEFORE /:id) (ต้องมีสิทธิ์ members.view_logs)
router.get('/edit-logs', requirePermission('members', 'history', 'view'), async (req, res) => {
    try {
        const logs = await prisma.editLog.findMany({
            where: { targetType: 'User' },
            include: {
                admin: { select: { username: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        res.json({ success: true, data: logs });
    } catch (error: any) {
        console.error('Get edit logs error:', error?.message || error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/admin/users/:id (ต้องมีสิทธิ์ members.view_detail)
router.get('/:id', requirePermission('members', 'list', 'view'), async (req, res) => {
    try {
        const userId = Number(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            // Removed includes to prevent 500 error if relation tables are missing on production
            // include: {
            //    transactions: { take: 10, orderBy: { createdAt: 'desc' } },
            //    gameSessions: { take: 10, orderBy: { playedAt: 'desc' }, include: { game: true } },
            // },
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }

        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/users - สมัครสมาชิกจากหลังบ้าน (ต้องมีสิทธิ์ members.create)
router.post('/', requirePermission('members', 'register', 'manage'), async (req: AuthRequest, res) => {
    try {
        const { fullName, phone, bankName, bankAccount, password, lineId, referrerCode } = req.body;

        // Validate
        if (!fullName || !phone || !bankName || !bankAccount || !password) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
        }

        // Check existing
        const existing = await prisma.user.findUnique({ where: { phone } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'เบอร์โทรนี้ถูกใช้งานแล้ว' });
        }

        // Get prefix from settings
        const prefixSetting = await prisma.setting.findUnique({ where: { key: 'prefix' } });
        const prefix = prefixSetting?.value || 'U';

        // Generate username: prefix + last 6 digits of phone
        const phone6 = phone.slice(-6);
        const username = `${prefix}${phone6}`;

        // Check if username already exists (edge case: same phone suffix with different prefix)
        const existingUsername = await prisma.user.findUnique({ where: { username } });
        if (existingUsername) {
            return res.status(400).json({ success: false, message: 'Username นี้มีอยู่แล้ว กรุณาใช้เบอร์โทรอื่น' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

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
            },
        });

        // Register with Betflix (External Board)
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
            }
        } catch (bfError) {
            console.error('Betflix Admin-Register Failed:', bfError);
        }

        // Log edit
        await prisma.editLog.create({
            data: {
                targetType: 'User',
                targetId: user.id,
                field: 'CREATE',
                oldValue: null,
                newValue: JSON.stringify({ username, fullName, phone }),
                adminId: req.user!.userId,
            },
        });

        res.status(201).json({ success: true, message: 'สร้างสมาชิกสำเร็จ', data: { userId: user.id } });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/admin/users/:id
router.put('/:id', requirePermission('members', 'list', 'manage'), async (req: AuthRequest, res) => {
    try {
        const { fullName, phone, bankName, bankAccount, status, lineId } = req.body;
        const userId = Number(req.params.id);

        const oldUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!oldUser) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }

        const updateData: any = {};
        const changes: any[] = [];

        // Track changes for all editable fields
        if (fullName !== undefined && fullName !== oldUser.fullName) {
            updateData.fullName = fullName;
            changes.push({ field: 'fullName', oldValue: oldUser.fullName, newValue: fullName });
        }
        if (phone !== undefined && phone !== oldUser.phone) {
            updateData.phone = phone;
            changes.push({ field: 'phone', oldValue: oldUser.phone, newValue: phone });
        }
        if (bankName !== undefined && bankName !== oldUser.bankName) {
            updateData.bankName = bankName;
            changes.push({ field: 'bankName', oldValue: oldUser.bankName, newValue: bankName });
        }
        if (bankAccount !== undefined && bankAccount !== oldUser.bankAccount) {
            updateData.bankAccount = bankAccount;
            changes.push({ field: 'bankAccount', oldValue: oldUser.bankAccount, newValue: bankAccount });
        }
        if (lineId !== undefined && lineId !== oldUser.lineId) {
            updateData.lineId = lineId;
            changes.push({ field: 'lineId', oldValue: oldUser.lineId, newValue: lineId });
        }
        if (status !== undefined && status !== oldUser.status) {
            updateData.status = status;
            changes.push({ field: 'status', oldValue: oldUser.status, newValue: status });
        }

        // If no changes, still return success
        if (Object.keys(updateData).length === 0) {
            return res.json({ success: true, message: 'ไม่มีการเปลี่ยนแปลง' });
        }

        await prisma.user.update({ where: { id: userId }, data: updateData });

        // Log all changes
        for (const change of changes) {
            await prisma.editLog.create({
                data: {
                    targetType: 'User',
                    targetId: userId,
                    field: change.field,
                    oldValue: String(change.oldValue || ''),
                    newValue: String(change.newValue || ''),
                    adminId: req.user!.userId,
                },
            });
        }

        res.json({ success: true, message: 'อัปเดตสำเร็จ' });
    } catch (error: any) {
        console.error('Update user error:', error?.message || error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/admin/users/:id/edit-logs - ประวัติแก้ไขเฉพาะ user
router.get('/:id/edit-logs', async (req, res) => {
    try {
        const logs = await prisma.editLog.findMany({
            where: { targetType: 'User', targetId: Number(req.params.id) },
            include: { admin: { select: { username: true } } },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ success: true, data: logs });
    } catch (error) {
        console.error('Get edit logs error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// DEBUG: Test Soft Delete Query validity (GET because browser can run it)
router.get('/:id/debug-delete', requirePermission('members', 'list', 'manage'), async (req: AuthRequest, res) => {
    try {
        const userId = Number(req.params.id);
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) return res.send("User not found");

        const timestamp = Date.now();
        const newUsername = `del_${timestamp}_${targetUser.username.slice(0, 10)}`;
        const newPhone = `del_${timestamp}`;

        // simulate update data
        res.json({
            step: "Check Query Validity",
            target: { id: userId, username: targetUser.username },
            updatePayload: {
                username: newUsername,
                phone: newPhone,
                betflixUsername: null,
                status: 'DELETED'
            },
            notes: "If you see this, the GET route works. Step 2: Try running Actual Delete."
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message, stack: e.stack });
    }
});

// DELETE /api/admin/users/:id - ลบสมาชิก (ต้องมีสิทธิ์ลบ)
router.delete('/:id', requirePermission('members', 'list', 'manage'), async (req: AuthRequest, res) => {
    const userId = Number(req.params.id);

    try {
        // Step 1: Check if user exists
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้', step: 1 });
        }

        // Step 2: Delete EditLogs that reference this user (FK constraint fix)
        await prisma.editLog.deleteMany({
            where: { targetId: userId, targetType: 'User' }
        });

        // Step 3: Minimal Soft Delete - ONLY change status
        await prisma.user.update({
            where: { id: userId },
            data: { status: 'DELETED' }
        });

        // Step 3: Optional cleanup (wrapped in try-catch, won't block success)
        try {
            const ts = Date.now();
            await prisma.user.update({
                where: { id: userId },
                data: {
                    username: `del_${ts}_${targetUser.username.slice(0, 8)}`,
                    phone: `del_${ts}`,
                    betflixUsername: null
                }
            });
        } catch (renameErr: any) {
            console.error('Rename failed (non-critical):', renameErr?.message);
        }

        res.json({ success: true, message: 'ลบสมาชิกสำเร็จ' });
    } catch (error: any) {
        console.error('DELETE ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการลบสมาชิก',
            errorName: error?.name,
            errorMessage: error?.message,
            errorCode: error?.code,
            step: 'update_status'
        });
    }
});

export default router;

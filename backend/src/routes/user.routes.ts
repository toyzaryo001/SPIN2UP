import { Router } from 'express';
import prisma from '../lib/db.js';
import bcrypt from 'bcryptjs';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware.js';
import { BetflixService } from '../services/betflix.service.js';

const router = Router();

// GET /api/users/me
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            select: {
                id: true,
                username: true,
                fullName: true,
                phone: true,
                bankName: true,
                bankAccount: true,
                lineId: true,
                referrerCode: true,
                status: true,
                balance: true,
                bonusBalance: true,
                lastLoginAt: true,
                createdAt: true,
                betflixUsername: true,
            },
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }

        const depositAgg = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
                userId: req.user!.userId,
                type: 'DEPOSIT',
                status: 'APPROVED'
            }
        });
        const totalDeposit = depositAgg._sum.amount || 0;

        // Fetch Betflix Balance
        if (user.betflixUsername) {
            const betflixBalance = await BetflixService.getBalance(user.betflixUsername);
            (user as any).balance = betflixBalance;
        }

        res.json({ success: true, data: { ...user, totalDeposit } });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/users/me
router.put('/me', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { fullName, lineId } = req.body;

        const user = await prisma.user.update({
            where: { id: req.user!.userId },
            data: {
                ...(fullName && { fullName }),
                ...(lineId !== undefined && { lineId }),
            },
            select: {
                id: true,
                username: true,
                fullName: true,
                phone: true,
                lineId: true,
            },
        });

        res.json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ', data: user });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/users/me/password - เปลี่ยนรหัสผ่าน
router.put('/me/password', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user!.userId },
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: req.user!.userId },
            data: { password: hashedPassword },
        });

        res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/users/referral-stats - ดึงข้อมูล referral stats
router.get('/referral-stats', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            select: { id: true, username: true }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }

        // ดึง users ที่ถูกแนะนำโดย user นี้
        const referrals = await prisma.user.findMany({
            where: { referredBy: user.id },
            select: {
                id: true,
                username: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        // คำนวณ commission (ตัวอย่าง: 10% ของยอดฝากแรกของแต่ละคน)
        // หรือใช้ค่าคงที่
        const commissionPerReferral = 100; // ฿100 ต่อคน
        const totalReferrals = referrals.length;
        const totalCommission = totalReferrals * commissionPerReferral;

        // Mask username for privacy
        const maskedReferrals = referrals.map((ref, index) => ({
            id: ref.id,
            username: ref.username.substring(0, 4) + '***' + ref.username.slice(-2),
            date: ref.createdAt.toISOString().split('T')[0].split('-').reverse().join('/'),
            commission: commissionPerReferral
        }));

        res.json({
            success: true,
            data: {
                referralCode: user.username,
                totalReferrals,
                totalCommission,
                referrals: maskedReferrals
            }
        });
    } catch (error) {
        console.error('Get referral stats error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

export default router;


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

            // Sync to local DB if changed
            if (Number(user.balance) !== betflixBalance) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { balance: betflixBalance }
                });
            }

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

// GET /api/users/streak-stats - ดึงข้อมูล Streak การฝากเงิน
router.get('/streak-stats', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.userId;

        // 1. Get Settings
        const settings = await prisma.streakSetting.findMany({
            where: { isActive: true },
            orderBy: { day: 'asc' }
        });

        if (settings.length === 0) {
            return res.json({ success: true, data: { currentStreak: 0, nextBonus: null } });
        }

        const minDeposit = Number(settings[0].minDeposit) || 100;

        // 2. Get User Deposits (Approved only)
        // Group by Date to see daily total
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 10); // Look back 10 days to be safe

        const transactions = await prisma.transaction.findMany({
            where: {
                userId,
                type: 'DEPOSIT',
                status: 'APPROVED', // Assuming APPROVED is payment success
                createdAt: { gte: sevenDaysAgo }
            },
            select: {
                amount: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // 3. Process Daily Totals
        const dailyDeposits: Record<string, number> = {};
        transactions.forEach(tx => {
            // Adjust to Thai Time roughly or just use UTC date string if consistent
            // Use simple YYYY-MM-DD
            const dateStr = tx.createdAt.toISOString().split('T')[0];
            dailyDeposits[dateStr] = (dailyDeposits[dateStr] || 0) + Number(tx.amount);
        });

        // 4. Calculate Streak
        let currentStreak = 0;
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // If deposited today >= min, we start count from today backwards
        // If NOT deposited today yet, but deposited yesterday >= min, we start count from yesterday backwards
        // If neither, streak is 0.

        let checkDate = new Date();
        let streakAlive = false;

        // Check Today
        if ((dailyDeposits[today] || 0) >= minDeposit) {
            currentStreak = 1;
            streakAlive = true;
            // Move to yesterday for next loop
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            // Check Yesterday
            if ((dailyDeposits[yesterday] || 0) >= minDeposit) {
                // Streak is alive from yesterday, but today is not done yet.
                // So current streak count is essentially valid up to yesterday.
                // Logic: If I deposited yesterday (Day 1), today is Day 2 waiting to happen. 
                // Current valid completed streak is 1.
                // So we start checking from yesterday.
                streakAlive = true;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                currentStreak = 0;
                streakAlive = false;
            }
        }

        if (streakAlive) {
            // We already processed the first valid day (either today or yesterday).
            // Now verify strictly consecutive days backwards.
            // Loop up to 7 days max
            for (let i = 0; i < 7; i++) {
                const dateStr = checkDate.toISOString().split('T')[0];
                if ((dailyDeposits[dateStr] || 0) >= minDeposit) {
                    currentStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }
        }

        // Cap streak at max setting day
        const maxDay = settings[settings.length - 1].day;
        if (currentStreak > maxDay) currentStreak = maxDay;

        res.json({
            success: true,
            data: {
                currentStreak,
                minDeposit
            }
        });

    } catch (error) {
        console.error('Get streak stats error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

export default router;


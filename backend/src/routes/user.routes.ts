import { Router } from 'express';
import prisma from '../lib/db.js';
import bcrypt from 'bcryptjs';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware.js';
import { BetflixService } from '../services/betflix.service.js';
import { RewardService } from '../services/reward.service.js';
import { PromotionSelectionService } from '../services/promotion-selection.service.js';
import { TurnoverService } from '../services/turnover.service.js';
import { RankService } from '../services/rank.service.js';
import { StreakService } from '../services/streak.service.js';

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
                currentTurnover: true,
                turnoverLimit: true,
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
                status: { in: ['APPROVED', 'COMPLETED'] }
            }
        });
        const totalDeposit = depositAgg._sum.amount || 0;

        let liveBalance = Number(user.balance || 0);

        // Fetch Betflix Balance
        if (user.betflixUsername) {
            const betflixBalance = await BetflixService.getBalance(user.betflixUsername);

            liveBalance = betflixBalance;

            if (Number(user.balance) !== betflixBalance) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { balance: betflixBalance }
                });
            }
        }

        const turnoverCleared = await TurnoverService.clearIfLowBalance(user.id, liveBalance);
        const selectedPromotion = await PromotionSelectionService.getSelectedPromotion(user.id);

        res.json({
            success: true,
            data: {
                ...user,
                balance: liveBalance,
                currentTurnover: turnoverCleared ? 0 : user.currentTurnover,
                turnoverLimit: turnoverCleared ? 0 : user.turnoverLimit,
                totalDeposit,
                selectedPromotion,
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

router.get('/promotions/selected', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const promotion = await PromotionSelectionService.getSelectedPromotion(req.user!.userId);
        res.json({ success: true, data: promotion });
    } catch (error) {
        console.error('Get selected promotion error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

router.post('/promotions/:id/select', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const promotionId = Number(req.params.id);
        if (!Number.isInteger(promotionId) || promotionId <= 0) {
            return res.status(400).json({ success: false, message: 'โปรโมชั่นไม่ถูกต้อง' });
        }

        const promotion = await PromotionSelectionService.selectPromotion(req.user!.userId, promotionId);
        res.json({ success: true, data: promotion, message: 'เลือกโปรโมชั่นแล้ว' });
    } catch (error: any) {
        console.error('Select promotion error:', error);

        if (error.message === 'PROMOTION_NOT_AVAILABLE') {
            return res.status(400).json({ success: false, message: 'โปรโมชั่นนี้ไม่พร้อมใช้งานแล้ว' });
        }

        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

router.delete('/promotions/selected', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await PromotionSelectionService.clearSelectedPromotion(req.user!.userId);
        res.json({ success: true, message: 'ยกเลิกโปรโมชั่นที่เลือกแล้ว' });
    } catch (error) {
        console.error('Clear selected promotion error:', error);
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
        const data = await StreakService.getUserStreakStatus(req.user!.userId);

        res.json({
            success: true,
            data: {
                ...data
            }
        });

    } catch (error) {
        console.error('Get streak stats error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// ==========================================
// REWARD & ACTIVITY ENDPOINTS
// ==========================================

// GET /api/users/rewards/stats - ดึงสถิติยอดเสียและค่าคอม
router.get('/rewards/stats', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.userId;
        const stats = await RewardService.getRewardStats(userId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error: any) {
        console.error('Get reward stats error:', error);
        res.status(500).json({ success: false, message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลรางวัล' });
    }
});

// POST /api/users/rewards/claim - กดรับยอดเสียหรือค่าคอม
router.post('/rewards/claim', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.userId;
        const { type } = req.body; // 'CASHBACK' | 'COMMISSION'

        if (!type || !['CASHBACK', 'COMMISSION'].includes(type)) {
            return res.status(400).json({ success: false, message: 'ระบุประเภทรางวัลไม่ถูกต้อง' });
        }

        const result = await RewardService.claimReward(userId, type);

        res.json({
            success: true,
            message: `รับ${type === 'CASHBACK' ? 'ยอดเสีย' : 'ค่าคอม'}สำเร็จ ฿${result.amount}`,
            data: result
        });
    } catch (error: any) {
        console.error('Claim reward error:', error);
        res.status(400).json({ success: false, message: error.message || 'ไม่สามารถรับรางวัลได้' });
    }
});

router.get('/rank-rewards', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const data = await RankService.getUserRankStatus(req.user!.userId);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Get rank rewards error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูล Rank' });
    }
});

router.post('/rank-rewards/:tierId/claim', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const data = await RankService.claimRankReward(req.user!.userId, req.params.tierId);
        res.json({
            success: true,
            message: `รับรางวัล Rank ${data.rankName} สำเร็จ`,
            data,
        });
    } catch (error) {
        console.error('Claim rank reward error:', error);

        if (error instanceof Error) {
            if (error.message === 'RANK_TIER_NOT_FOUND') {
                return res.status(404).json({ success: false, message: 'ไม่พบ Rank ที่ต้องการรับรางวัล' });
            }

            if (error.message === 'RANK_REWARD_NOT_AVAILABLE') {
                return res.status(400).json({ success: false, message: 'Rank นี้ยังไม่มีรางวัลให้กดรับ' });
            }

            if (error.message === 'RANK_NOT_UNLOCKED') {
                return res.status(400).json({ success: false, message: 'ยอดฝากสะสมยังไม่ถึงเงื่อนไขของ Rank นี้' });
            }

            if (error.message === 'RANK_ALREADY_CLAIMED') {
                return res.status(409).json({ success: false, message: 'คุณเคยกดรับรางวัล Rank นี้แล้ว' });
            }
        }

        res.status(500).json({ success: false, message: 'ไม่สามารถรับรางวัล Rank ได้' });
    }
});

export default router;


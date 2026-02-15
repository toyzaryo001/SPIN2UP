import { Router } from 'express';
import prisma from '../../lib/db.js';

const router = Router();

// GET /api/admin/transactions - รายการธุรกรรมทั้งหมด
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, type, status, userId, startDate, endDate, adminId } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {};
        if (type && type !== 'all') where.type = type;
        if (status && status !== 'all') where.status = status;
        if (userId) where.userId = Number(userId);

        // Filter for manual transactions (adminId is not null)
        if (adminId === 'true') {
            where.adminId = { not: null };
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate as string);
            if (endDate) {
                // Frontend already sends endDate with correct time (23:59:59 in local TZ, converted to ISO)
                // Do NOT call setHours again — that would shift UTC time and include next-day records
                where.createdAt.lte = new Date(endDate as string);
            }
        }

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                include: { user: { select: { username: true, fullName: true, phone: true } } },
                orderBy: { createdAt: 'desc' },
                take: Number(limit),
                skip,
            }),
            prisma.transaction.count({ where }),
        ]);

        // Summary
        // Summary
        // If status is not specifically filtered, only sum COMPLETED transactions for the amount
        // But keep count of all matching transactions
        const startValues = {
            _sum: { amount: 0 },
            _count: 0
        };

        let summary;

        if (!where.status) {
            // Case: No status filter (All statuses shown in list)
            // We want Total Amount = Only COMPLETED
            // We want Count = All (to match list pagination)

            // 1. Get Sum of COMPLETED
            const completedSum = await prisma.transaction.aggregate({
                where: { ...where, status: 'COMPLETED' },
                _sum: { amount: true }
            });

            // 2. Count is already in 'total' variable from above
            summary = {
                _sum: { amount: completedSum._sum.amount || 0 },
                _count: total
            };

        } else {
            // Case: Status filter applied (e.g. user filtered for PENDING)
            // Respect the filter for both Sum and Count
            summary = await prisma.transaction.aggregate({
                where,
                _sum: { amount: true },
                _count: true,
            });
        }

        res.json({
            success: true,
            data: {
                transactions,
                summary: { totalAmount: summary._sum.amount || 0, count: summary._count },
                pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
            },
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/admin/transactions/pending-withdrawals - รายการรอถอน
router.get('/pending-withdrawals', async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany({
            where: { type: 'WITHDRAW', status: 'PENDING' },
            include: { user: { select: { username: true, fullName: true, phone: true, bankName: true, bankAccount: true } } },
            orderBy: { createdAt: 'asc' },
        });

        res.json({ success: true, data: transactions });
    } catch (error) {
        console.error('Get pending withdrawals error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/admin/transactions/unmatched-sms - รายการ SMS ที่ไม่เข้าเงื่อนไข
router.get('/unmatched-sms', async (req, res) => {
    try {
        const logs = await prisma.smsWebhookLog.findMany({
            where: {
                status: 'NO_MATCH',
                // Optional: Filter by recent date if needed, but usually we want all pending
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: logs });
    } catch (error) {
        console.error('Get unmatched sms error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/transactions/resolve-sms - จัดการรายการ SMS (Approve/Reject)
router.post('/resolve-sms', async (req, res) => {
    try {
        const { logId, action, userId } = req.body; // action: 'APPROVE' | 'REJECT'
        const adminId = (req as any).user?.userId; // Assuming auth middleware populates this

        const log = await prisma.smsWebhookLog.findUnique({ where: { id: Number(logId) } });
        if (!log) return res.status(404).json({ success: false, message: 'ไม่พบรายการ SMS' });

        if (log.status !== 'NO_MATCH') {
            return res.status(400).json({ success: false, message: 'รายการนี้ถูกจัดการไปแล้ว' });
        }

        if (action === 'REJECT') {
            await prisma.smsWebhookLog.update({
                where: { id: Number(logId) },
                data: { status: 'REJECTED', errorMessage: `Rejected by Admin #${adminId}` }
            });
            return res.json({ success: true, message: 'ปฏิเสธรายการสำเร็จ' });
        }

        if (action === 'APPROVE') {
            if (!userId) return res.status(400).json({ success: false, message: 'ต้องระบุผู้ใช้สำหรับรายการที่อนุมัติ' });

            const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
            if (!user) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });

            // Create Transaction & Deposit Logic (Similar to Webhook)
            const depositAmount = Number(log.amount);
            const balanceBefore = Number(user.balance);

            // 1. Create Transaction
            const transaction = await prisma.transaction.create({
                data: {
                    userId: user.id,
                    type: 'DEPOSIT',
                    subType: 'MANUAL_MATCH', // Indicate manual match
                    amount: depositAmount,
                    balanceBefore: balanceBefore,
                    balanceAfter: balanceBefore + depositAmount,
                    status: 'PENDING',
                    note: `Manual Match SMS - ${log.sourceBank} ${log.sourceAccount}`,
                    adminId: adminId
                }
            });

            // 2. Deposit to Betflix (if applicable)
            let betflixSuccess = false;
            let betflixError = '';

            // Should import BetflixService if not available, or use a dynamic import/require if strictly standardizing imports is hard here
            // Assuming BetflixService is available or I will add import
            // I'll add the import at the top of file
            try {
                if (user.betflixUsername) {
                    // Need to ensure BetflixService is imported. 
                    // Since I can't see the top imports right now in this chunk, I will assume I need to add it.
                    // IMPORTANT: I will add the import in a separate step or assume it's available.
                    // Wait, I see the file content in history. It imports 'prisma'. It DOES NOT import BetflixService.
                    // I need to add the import. I will do that in a separate replacement or try to do it here if I can view the top.
                    // For now, I'll rely on the user to have it or I'll do a second edit.
                    // Actually, let's use a `require` fallback or just assume I'll fix imports next.
                    // Better: I will use `require` inside here to avoid breaking top-level if I can't edit top easily.
                    // Or better: I will Edit the top of the file first in next step? No, replacing content here is file-end.
                    // I will add the route logic here, and then I will add the import in a separate tool call.

                    // Logic continues...
                    const { BetflixService } = require('../../services/betflix.service');
                    betflixSuccess = await BetflixService.transfer(user.betflixUsername, depositAmount, `MANUAL_${transaction.id}`);
                } else {
                    betflixSuccess = true; // No betflix account, just local balance
                }
            } catch (err: any) {
                betflixError = err.message || 'Betflix transfer failed';
            }

            if (betflixSuccess) {
                await prisma.$transaction([
                    prisma.transaction.update({ where: { id: transaction.id }, data: { status: 'COMPLETED' } }),
                    prisma.user.update({ where: { id: user.id }, data: { balance: { increment: depositAmount } } }),
                    prisma.smsWebhookLog.update({
                        where: { id: log.id },
                        data: {
                            status: 'MANUAL_MATCH',
                            matchedUserId: user.id,
                            transactionId: transaction.id,
                            errorMessage: `Matched by Admin #${adminId}`
                        }
                    })
                ]);

                return res.json({ success: true, message: 'อนุมัติยอดฝากสำเร็จ' });
            } else {
                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: { status: 'FAILED', note: `Betflix Error: ${betflixError}` }
                });
                return res.status(500).json({ success: false, message: 'เติมเงิน Betflix ไม่สำเร็จ: ' + betflixError });
            }
        }

        return res.status(400).json({ success: false, message: 'Invalid action' });
    } catch (error) {
        console.error('Resolve SMS error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

export default router;

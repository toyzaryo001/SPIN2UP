import { Router } from 'express';
import prisma from '../../lib/db.js';
import { BetflixService } from '../../services/betflix.service';

const router = Router();

// GET /api/admin/transactions/stats - จำนวนรายการรอตรวจสอบ (สำหรับ Badge)
router.get('/stats', async (req, res) => {
    try {
        const [pendingWithdraw, unmatchedDeposit] = await Promise.all([
            prisma.transaction.count({
                where: { type: 'WITHDRAW', status: 'PENDING' }
            }),
            prisma.smsWebhookLog.count({
                where: { status: 'NO_MATCH' }
            })
        ]);

        res.json({
            success: true,
            data: {
                pendingWithdraw,
                unmatchedDeposit
            }
        });
    } catch (error) {
        console.error('Get transaction stats error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

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
        const adminId = (req as any).user?.userId;

        // 1. Initial Check (Read-only)
        const checkLog = await prisma.smsWebhookLog.findUnique({ where: { id: Number(logId) } });
        if (!checkLog) return res.status(404).json({ success: false, message: 'ไม่พบรายการ SMS' });

        if (checkLog.status !== 'NO_MATCH' && checkLog.status !== 'PROCESSING') {
            return res.status(400).json({ success: false, message: 'รายการนี้ถูกจัดการไปแล้ว' });
        }

        // Action: REJECT
        if (action === 'REJECT') {
            // Atomic update for REJECT
            const updated = await prisma.smsWebhookLog.updateMany({
                where: { id: Number(logId), status: 'NO_MATCH' },
                data: { status: 'REJECTED', errorMessage: `Rejected by Admin #${adminId}` }
            });

            if (updated.count === 0) {
                return res.status(400).json({ success: false, message: 'ไม่สามารถปฏิเสธรายการได้ (อาจถูกทำรายการไปแล้ว)' });
            }

            return res.json({ success: true, message: 'ปฏิเสธรายการสำเร็จ' });
        }

        // Action: APPROVE
        if (action === 'APPROVE') {
            if (!userId) return res.status(400).json({ success: false, message: 'ต้องระบุผู้ใช้สำหรับรายการที่อนุมัติ' });

            // 1. ATOMIC LOCK: Try to set status to 'PROCESSING'
            // Only succeeds if status is currently 'NO_MATCH'
            const locked = await prisma.smsWebhookLog.updateMany({
                where: { id: Number(logId), status: 'NO_MATCH' },
                data: { status: 'PROCESSING' }
            });

            if (locked.count === 0) {
                // If failed to lock, it means another request took it or it's already done
                return res.status(400).json({ success: false, message: 'รายการนี้กำลังถูกดำเนินการหรือเสร็จสิ้นไปแล้ว' });
            }

            // Now we own the lock. Proceed with logic.
            // If anything fails below, we MUST revert status to 'NO_MATCH' or set to 'FAILED'
            try {
                const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
                if (!user) {
                    // Revert lock
                    await prisma.smsWebhookLog.update({ where: { id: Number(logId) }, data: { status: 'NO_MATCH' } });
                    return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
                }

                // Create Transaction & Deposit Logic
                const depositAmount = Number(checkLog.amount);
                const balanceBefore = Number(user.balance);

                const transaction = await prisma.transaction.create({
                    data: {
                        userId: user.id,
                        type: 'DEPOSIT',
                        subType: 'MANUAL_MATCH',
                        amount: depositAmount,
                        balanceBefore: balanceBefore,
                        balanceAfter: balanceBefore + depositAmount,
                        status: 'PENDING',
                        note: `Manual Match SMS - ${checkLog.sourceBank} ${checkLog.sourceAccount}`,
                        adminId: adminId
                    }
                });

                // Deposit to Betflix
                let betflixSuccess = false;
                let betflixError = '';

                try {
                    if (user.betflixUsername) {
                        console.log(`[ResolveSMS] Transferring ${depositAmount} to ${user.betflixUsername}...`);
                        betflixSuccess = await BetflixService.transfer(user.betflixUsername, depositAmount, `MANUAL_${transaction.id}`);
                        if (!betflixSuccess) betflixError = 'Betflix API returned failure';
                    } else {
                        console.warn(`[ResolveSMS] User ${user.username} has no Betflix Username. Skipping Betflix transfer.`);
                        betflixSuccess = true;
                        betflixError = 'No Betflix Username';
                    }
                } catch (err: any) {
                    console.error('[ResolveSMS] Betflix Exception:', err);
                    betflixError = err.message || 'Betflix transfer failed';
                }

                if (betflixSuccess) {
                    await prisma.$transaction([
                        prisma.transaction.update({ where: { id: transaction.id }, data: { status: 'COMPLETED' } }),
                        prisma.user.update({ where: { id: user.id }, data: { balance: { increment: depositAmount } } }),
                        prisma.smsWebhookLog.update({
                            where: { id: Number(logId) },
                            data: {
                                status: 'MANUAL_MATCH',
                                matchedUserId: user.id,
                                transactionId: transaction.id,
                                errorMessage: `Matched by Admin #${adminId}`
                            }
                        })
                    ]);
                    return res.json({ success: true, message: 'อนุมัติยอดฝากและเติมเงินสำเร็จ' });
                } else {
                    // Failed to transfer to Betflix
                    await prisma.transaction.update({
                        where: { id: transaction.id },
                        data: { status: 'FAILED', note: `Betflix Error: ${betflixError}` }
                    });
                    // Revert SMS log to NO_MATCH so it can be tried again? Or keep as FAILED?
                    // Usually better to keep as FAILED or NO_MATCH. Let's set to NO_MATCH to allow retry, but log error.
                    await prisma.smsWebhookLog.update({
                        where: { id: Number(logId) },
                        data: { status: 'NO_MATCH', errorMessage: `Failed: ${betflixError}` }
                    });
                    return res.status(500).json({ success: false, message: 'เติมเงิน Betflix ไม่สำเร็จ: ' + betflixError });
                }

            } catch (innerError) {
                // Unexpected error during processing (e.g. database error)
                console.error('Inner resolve error:', innerError);
                // Unlock
                await prisma.smsWebhookLog.update({ where: { id: Number(logId) }, data: { status: 'NO_MATCH' } });
                return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดระหว่างดำเนินการ' });
            }
        }

        return res.status(400).json({ success: false, message: 'Invalid action' });
    } catch (error) {
        console.error('Resolve SMS error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

export default router;

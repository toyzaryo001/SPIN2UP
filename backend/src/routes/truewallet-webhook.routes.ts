import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/db.js';
import { BetflixService } from '../services/betflix.service.js';
import { LineNotifyService } from '../services/line-notify.service.js';
import { PaymentService } from '../services/payment.service.js';

const router = Router();

// =============================================
// ฟังก์ชันช่วย: Normalize เบอร์โทรให้เป็น format เดียว
// "0934271147", "093-427-1147", "+66934271147" → "0934271147"
// =============================================
function normalizePhone(phone: string): string {
    let cleaned = phone.replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('+66')) cleaned = '0' + cleaned.slice(3);
    if (cleaned.startsWith('66') && cleaned.length === 11) cleaned = '0' + cleaned.slice(2);
    return cleaned;
}

// =============================================
// ฟังก์ชัน Match: เบอร์ + ชื่อ
// level 2 = เบอร์ตรง + ชื่อใกล้เคียง
// level 1 = เบอร์ตรงเท่านั้น
// level 0 = ไม่เจอ
// =============================================
function matchUser<T extends { id: number; phone: string; fullName: string }>(
    users: T[],
    senderPhone: string,
    senderName?: string
): { user: T | null; level: number } {
    const normalSender = normalizePhone(senderPhone);

    // 1. หา user ที่เบอร์ตรง
    const phoneMatches = users.filter(u => normalizePhone(u.phone) === normalSender);

    if (phoneMatches.length === 0) return { user: null, level: 0 };

    // 2. ถ้ามีชื่อ → ลองจับชื่อด้วย
    if (senderName && phoneMatches.length >= 1) {
        const nameLower = senderName.toLowerCase().replace(/\s+/g, '');
        const nameMatch = phoneMatches.find(u => {
            const uName = u.fullName.toLowerCase().replace(/\s+/g, '');
            return uName.includes(nameLower) || nameLower.includes(uName);
        });
        if (nameMatch) return { user: nameMatch, level: 2 };
    }

    // 3. เบอร์ตรงอย่างเดียว (ถ้ามี 1 คน → ใช้ได้เลย)
    if (phoneMatches.length === 1) return { user: phoneMatches[0], level: 1 };

    return { user: null, level: 0 }; // เบอร์ซ้ำหลายคน ไม่มีชื่อจับ → ไม่ match
}

// =============================================
// GET /api/webhooks/truewallet
// TrueWallet ส่ง GET มาเช็คว่า endpoint มีตัวตน (verification)
// =============================================
router.get('/', (req: Request, res: Response) => {
    res.status(200).json({ success: true, message: 'TrueWallet webhook endpoint is ready' });
});

// =============================================
// POST /api/webhooks/truewallet
// TrueWallet ส่ง JWT token มาที่ body.message
// =============================================
router.post('/', async (req: Request, res: Response) => {
    try {
        const { message } = req.body;
        if (!message) {
            console.warn('[TrueWallet Webhook] No message in body');
            return res.status(200).json({ success: true, message: 'Webhook endpoint active (no message)' });
        }

        // 1. ดึง Active Wallet ทั้งหมด (เพื่อหา jwtSecret)
        const wallets = await prisma.trueMoneyWallet.findMany({
            where: { isActive: true, jwtSecret: { not: null } }
        });

        if (wallets.length === 0) {
            console.warn('[TrueWallet Webhook] No active wallets with JWT secret');
            return res.status(200).json({ success: false, message: 'No active wallet configured' });
        }

        // 2. ลอง verify JWT กับทุก wallet จนกว่าจะเจอ
        let decoded: any = null;
        let matchedWallet: typeof wallets[0] | null = null;

        for (const wallet of wallets) {
            try {
                decoded = jwt.verify(message, wallet.jwtSecret!);
                matchedWallet = wallet;
                break;
            } catch {
                // ลอง wallet ถัดไป
            }
        }

        if (!decoded || !matchedWallet) {
            console.warn('[TrueWallet Webhook] JWT verify failed for all wallets');
            return res.status(200).json({ success: false, message: 'JWT verification skipped (test or invalid token)' });
        }

        console.log('[TrueWallet Webhook] Decoded:', JSON.stringify(decoded));

        // 3. Extract ข้อมูลจาก JWT payload
        const senderMobile = decoded.sender_mobile || decoded.ref1 || '';
        const senderName = decoded.sender_name || decoded.personal_message || '';
        const amountSatang = Number(decoded.amount || 0);
        const amountBaht = amountSatang / 100; // TrueWallet ส่งเป็นสตางค์
        const receivedTime = decoded.received_time
            ? new Date(Number(decoded.received_time))
            : new Date();
        const transactionId = decoded.transaction_id || decoded.report_id || `TW_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        if (amountBaht <= 0) {
            console.warn('[TrueWallet Webhook] Amount <= 0:', amountBaht);
            return res.status(200).json({ success: false, message: 'Invalid amount' });
        }

        // 4. Dedup — เช็คว่า transactionId นี้เคย process แล้วหรือยัง
        const existing = await prisma.trueWalletLog.findUnique({
            where: { transactionId }
        });
        if (existing) {
            console.warn('[TrueWallet Webhook] Duplicate transactionId:', transactionId);
            return res.status(200).json({ success: true, message: 'Already processed' });
        }

        // 5. ตรวจว่า wallet ปลายทางเป็นของเรา (verify ผ่าน = ใช่แล้ว เพราะ jwtSecret ตรง)
        console.log(`[TrueWallet Webhook] Matched wallet: ${matchedWallet.phoneNumber} (${matchedWallet.accountName})`);

        // 6. Match user จากเบอร์ + ชื่อ
        const allUsers = await prisma.user.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true, phone: true, fullName: true, betflixUsername: true, bankAccount: true, username: true, balance: true }
        });

        const { user: matchedUser, level: matchLevel } = matchUser(allUsers, senderMobile, senderName);

        // 7. สร้าง TrueWalletLog (ไม่ว่า match หรือไม่)
        const walletLog = await prisma.trueWalletLog.create({
            data: {
                transactionId,
                senderMobile: normalizePhone(senderMobile),
                senderName: senderName || null,
                amount: amountBaht,
                message: decoded.message || decoded.personal_message || null,
                receivedTime,
                walletId: matchedWallet.id,
                userId: matchedUser?.id || null,
                matchLevel,
                status: matchedUser ? 'PENDING' : 'NO_MATCH',
                errorMessage: matchedUser ? null : `ไม่พบผู้ใช้ที่ตรงกับเบอร์ ${normalizePhone(senderMobile)}`
            }
        });

        if (!matchedUser) {
            console.warn(`[TrueWallet Webhook] No user match for phone: ${normalizePhone(senderMobile)}`);
            return res.status(200).json({
                success: false,
                status: 'NO_MATCH',
                logId: walletLog.id
            });
        }

        console.log(`[TrueWallet Webhook] Matched user: ${matchedUser.fullName} (ID: ${matchedUser.id}, level: ${matchLevel})`);

        // 8. ฝากเงินเข้ากระดาน — ใช้ ensureAndTransfer() ที่ refactor ไว้แล้ว
        const betflixResult = await BetflixService.ensureAndTransfer(
            matchedUser.id,
            (matchedUser as any).phone || (matchedUser as any).bankAccount || (matchedUser as any).username || '',
            (matchedUser as any).betflixUsername || null,
            amountBaht,
            `TW_${walletLog.id}`
        );

        if (!betflixResult.success) {
            // ฝากเข้ากระดานไม่สำเร็จ
            await prisma.trueWalletLog.update({
                where: { id: walletLog.id },
                data: { status: 'FAILED', errorMessage: betflixResult.error || 'BetFlix transfer failed' }
            });
            console.error(`[TrueWallet Webhook] BetFlix transfer failed:`, betflixResult.error);
            return res.status(200).json({ success: false, status: 'TRANSFER_FAILED', logId: walletLog.id });
        }

        // 9. สร้าง Transaction + เพิ่ม balance ให้ user
        const transaction = await prisma.$transaction(async (tx) => {
            // A. Update User Balance First to prevent race conditions showing old data
            const updatedUser = await tx.user.update({
                where: { id: matchedUser.id },
                data: { balance: { increment: amountBaht } }
            });

            // B. Create Transaction Log using the FRESH balance data
            return await tx.transaction.create({
                data: {
                    userId: matchedUser.id,
                    type: 'DEPOSIT',
                    amount: amountBaht,
                    status: 'COMPLETED',
                    balanceBefore: Number(updatedUser.balance) - amountBaht,
                    balanceAfter: Number(updatedUser.balance),
                    note: `TrueWallet ฝากอัตโนมัติ จาก ${normalizePhone(senderMobile)}${senderName ? ` (${senderName})` : ''}`,
                }
            });
        });

        // 10. อัปเดต log เป็น COMPLETED
        await prisma.trueWalletLog.update({
            where: { id: walletLog.id },
            data: {
                status: 'COMPLETED',
                transactionDbId: transaction.id,
                errorMessage: null,
            }
        });

        console.log(`[TrueWallet Webhook] ✅ Deposit ${amountBaht} THB to user ${matchedUser.id} (${matchedUser.fullName})`);

        // 11. [FIXED] แจ้งเตือนแอดมินทาง LINE
        LineNotifyService.notifyDeposit(
            matchedUser.username || matchedUser.fullName || 'Unknown',
            amountBaht,
            'TrueWallet'
        ).catch(err => console.error('[TrueWallet LineNotify] Error:', err));

        // 12. [FIXED] คำนวณแจกโบนัสฝากสะสม (Streak Bonus)
        PaymentService.processStreakBonus(matchedUser.id).catch(err => console.error('[TrueWallet Streak Bonus Error]:', err));

        return res.status(200).json({
            success: true,
            status: 'COMPLETED',
            userId: matchedUser.id,
            amount: amountBaht,
            transactionId: transaction.id
        });

    } catch (err: any) {
        console.error('[TrueWallet Webhook] Unhandled error:', err);
        return res.status(200).json({ success: false, message: 'Internal error logged' });
    }
});

export default router;

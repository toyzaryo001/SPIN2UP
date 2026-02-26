import { Router, Request, Response } from 'express';
import prisma from '../lib/db.js';
import { parseBankSMS, matchBankName, matchAccountLast4, generateMessageHash, getBankThaiName } from '../services/sms-parser.service.js';
import { BetflixService } from '../services/betflix.service.js';
import { LineNotifyService } from '../services/line-notify.service.js';

const router = Router();

// =============================================
// Middleware: ตรวจสอบ API Key สำหรับ webhook
// ตั้งค่า WEBHOOK_API_KEY ใน .env
// =============================================
function webhookAuth(req: Request, res: Response, next: Function) {
    const expectedKey = process.env.WEBHOOK_API_KEY;

    // ถ้าไม่ได้ตั้ง key → อนุญาตผ่าน (dev mode) พร้อม log เตือน
    if (!expectedKey) {
        console.warn('[Webhook Auth] ⚠️ WEBHOOK_API_KEY ไม่ได้ตั้งค่า — กรุณาตั้งค่าใน production');
        return next();
    }

    // รับ key จาก header หรือ query param
    const providedKey = req.headers['x-webhook-key'] || req.query.apikey;

    if (providedKey !== expectedKey) {
        console.warn('[Webhook Auth] ❌ API Key ไม่ถูกต้อง:', providedKey);
        return res.status(401).json({ success: false, error: 'Invalid API Key' });
    }

    next();
}

// =============================================
// ฟังก์ชันหลัก: ประมวล SMS (ใช้ร่วมกันทั้ง POST และ GET)
// =============================================
async function processWebhookMessage(message: string, source: string, res: Response) {
    const startTime = Date.now();

    // Generate hash for deduplication
    const messageHash = generateMessageHash(message);

    // ตรวจซ้ำ
    const existing = await (prisma as any).smsWebhookLog.findUnique({
        where: { messageHash }
    });

    if (existing) {
        console.log(`[Webhook ${source}] Duplicate message detected, hash:`, messageHash);
        return res.json({
            success: false,
            status: 'DUPLICATE',
            message: 'This SMS has already been processed',
            logId: existing.id
        });
    }

    // Parse SMS
    const parsed = parseBankSMS(message);

    if (!parsed) {
        await (prisma as any).smsWebhookLog.create({
            data: {
                rawMessage: message,
                messageHash,
                status: 'FAILED',
                errorMessage: 'Failed to parse SMS format',
                matchLevel: 0
            }
        });

        return res.json({
            success: false,
            status: 'PARSE_FAILED',
            message: 'Could not parse SMS format'
        });
    }

    if (parsed.isOutgoing) {
        await (prisma as any).smsWebhookLog.create({
            data: {
                rawMessage: message,
                messageHash,
                parsedData: JSON.stringify(parsed),
                status: 'IGNORED',
                errorMessage: 'Outgoing transaction - Ignored',
                matchLevel: 0
            }
        });
        console.log(`[Webhook ${source}] Outgoing transaction detected and ignored.`);
        return res.json({ success: true, status: 'IGNORED', message: 'Outgoing transaction detected' });
    }

    console.log(`[Webhook ${source}] Parsed SMS:`, {
        amount: parsed.amount,
        dest: parsed.destAccountLast4,
        source: parsed.sourceAccountLast4,
        bank: parsed.sourceBank
    });

    // ============ LEVEL 1: Match Destination Account ============
    const systemBanks = await prisma.bankAccount.findMany({
        where: { type: 'deposit', isActive: true }
    });

    const matchedBank = systemBanks.find(bank =>
        matchAccountLast4(bank.accountNumber, parsed.destAccountLast4)
    );

    if (!matchedBank) {
        console.log(`[Webhook ${source}] Level 1 FAILED: No matching system bank for`, parsed.destAccountLast4);

        await (prisma as any).smsWebhookLog.create({
            data: {
                rawMessage: message,
                messageHash,
                parsedData: JSON.stringify(parsed),
                amount: parsed.amount,
                destAccount: parsed.destAccountLast4,
                sourceAccount: parsed.sourceAccountLast4,
                sourceBank: parsed.sourceBank,
                sourceName: parsed.sourceName,
                status: 'NO_MATCH',
                errorMessage: 'Destination account not found in system',
                matchLevel: 0
            }
        });

        return res.json({
            success: false,
            status: 'NO_MATCH',
            level: 1,
            message: 'Destination account not registered in system'
        });
    }

    // Update Bank Balance from SMS
    if (parsed.balanceAfter && parsed.balanceAfter > 0) {
        await prisma.bankAccount.update({
            where: { id: matchedBank.id },
            data: { balance: parsed.balanceAfter }
        });
        console.log(`[Webhook ${source}] Updated Bank ${matchedBank.bankName} balance to ${parsed.balanceAfter}`);
    }

    console.log(`[Webhook ${source}] Level 1 PASSED: Matched system bank:`, matchedBank.bankName, matchedBank.accountNumber);

    // ============ LEVEL 2: Match Source Account to User ============
    const allUsers = await prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: {
            id: true,
            username: true,
            bankAccount: true,
            bankName: true,
            balance: true,
            betflixUsername: true
        }
    });

    // แก้บัค #10: ตรวจหลาย user ที่ 4 ตัวท้ายตรงกัน
    const matchedUsers = allUsers.filter(user =>
        matchAccountLast4(user.bankAccount, parsed.sourceAccountLast4)
    );

    if (matchedUsers.length === 0) {
        console.log(`[Webhook ${source}] Level 2 FAILED: No user with account ending`, parsed.sourceAccountLast4);

        await (prisma as any).smsWebhookLog.create({
            data: {
                rawMessage: message,
                messageHash,
                parsedData: JSON.stringify(parsed),
                amount: parsed.amount,
                destAccount: parsed.destAccountLast4,
                sourceAccount: parsed.sourceAccountLast4,
                sourceBank: parsed.sourceBank,
                sourceName: parsed.sourceName,
                status: 'NO_MATCH',
                errorMessage: 'Source account not found - user not registered',
                matchLevel: 1
            }
        });

        return res.json({
            success: false,
            status: 'NO_MATCH',
            level: 2,
            message: 'Source account not registered in system'
        });
    }

    if (matchedUsers.length > 1) {
        console.warn(`[Webhook ${source}] ⚠️ Multiple users matched last-4: ${parsed.sourceAccountLast4} — ${matchedUsers.length} users`);
        // ถ้ามีหลายคน → ลองกรองด้วยชื่อธนาคาร
        const bankFiltered = matchedUsers.filter(u => matchBankName(parsed.sourceBank, u.bankName));
        if (bankFiltered.length !== 1) {
            await (prisma as any).smsWebhookLog.create({
                data: {
                    rawMessage: message,
                    messageHash,
                    parsedData: JSON.stringify(parsed),
                    amount: parsed.amount,
                    destAccount: parsed.destAccountLast4,
                    sourceAccount: parsed.sourceAccountLast4,
                    sourceBank: parsed.sourceBank,
                    sourceName: parsed.sourceName,
                    status: 'NO_MATCH',
                    errorMessage: `Ambiguous: ${matchedUsers.length} users have same last-4 digits`,
                    matchLevel: 2
                }
            });
            return res.json({
                success: false,
                status: 'AMBIGUOUS',
                level: 2,
                message: `พบผู้ใช้หลายคนที่มี 4 ตัวท้ายตรงกัน (${matchedUsers.length} คน) ไม่สามารถระบุได้`
            });
        }
    }

    const matchedUser = matchedUsers.length === 1 ? matchedUsers[0] : matchedUsers.find(u => matchBankName(parsed.sourceBank, u.bankName))!;

    console.log(`[Webhook ${source}] Level 2 PASSED: Matched user:`, matchedUser.username);

    // ============ LEVEL 3: Verify Bank Name ============
    const bankMatch = matchBankName(parsed.sourceBank, matchedUser.bankName);

    if (!bankMatch) {
        console.log(`[Webhook ${source}] Level 3 FAILED: Bank mismatch`, parsed.sourceBank, 'vs', matchedUser.bankName);

        await (prisma as any).smsWebhookLog.create({
            data: {
                rawMessage: message,
                messageHash,
                parsedData: JSON.stringify(parsed),
                amount: parsed.amount,
                destAccount: parsed.destAccountLast4,
                sourceAccount: parsed.sourceAccountLast4,
                sourceBank: parsed.sourceBank,
                sourceName: parsed.sourceName,
                matchedUserId: matchedUser.id,
                status: 'NO_MATCH',
                errorMessage: `Bank mismatch: SMS=${parsed.sourceBank}, User=${matchedUser.bankName}`,
                matchLevel: 2
            }
        });

        return res.json({
            success: false,
            status: 'NO_MATCH',
            level: 3,
            message: 'Bank name does not match user registration'
        });
    }

    console.log(`[Webhook ${source}] Level 3 PASSED: Bank verified`);
    console.log(`[Webhook ${source}] ✅ All 3 levels matched! Processing deposit for`, matchedUser.username, 'amount:', parsed.amount);

    // ============ CREATE TRANSACTION & DEPOSIT TO BETFLIX ============
    const balanceBefore = Number(matchedUser.balance);
    const depositAmount = parsed.amount;

    // Create pending transaction
    const transaction = await prisma.transaction.create({
        data: {
            userId: matchedUser.id,
            type: 'DEPOSIT',
            subType: 'AUTO_SMS',
            amount: depositAmount,
            balanceBefore: balanceBefore,
            balanceAfter: balanceBefore + depositAmount,
            status: 'PENDING',
            note: `Auto deposit via SMS - ${parsed.sourceBank} X${parsed.sourceAccountLast4} - ${parsed.sourceName}`
        }
    });

    console.log(`[Webhook ${source}] Created pending transaction:`, transaction.id);

    // Deposit to Betflix
    const betflixResult = await BetflixService.ensureAndTransfer(
        matchedUser.id,
        matchedUser.bankAccount || matchedUser.username || '',
        matchedUser.betflixUsername,
        depositAmount,
        `AUTO_SMS_${transaction.id}`
    );
    const betflixSuccess = betflixResult.success;
    const betflixError = betflixResult.error || '';

    if (betflixSuccess) {
        // Update transaction to completed
        await prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: 'COMPLETED' }
        });

        // Update user balance
        await prisma.user.update({
            where: { id: matchedUser.id },
            data: {
                balance: { increment: depositAmount }
            }
        });

        // Log success
        const log = await (prisma as any).smsWebhookLog.create({
            data: {
                rawMessage: message,
                messageHash,
                parsedData: JSON.stringify(parsed),
                amount: depositAmount,
                destAccount: parsed.destAccountLast4,
                sourceAccount: parsed.sourceAccountLast4,
                sourceBank: parsed.sourceBank,
                sourceName: parsed.sourceName,
                matchedUserId: matchedUser.id,
                transactionId: transaction.id,
                status: 'SUCCESS',
                matchLevel: 3
            }
        });

        // Notify Admins via LINE
        LineNotifyService.notifyDeposit(
            matchedUser.username,
            depositAmount,
            `Automatic SMS (${parsed.sourceBank})`
        ).catch(err => console.error('[LineNotify] Error:', err));

        const elapsed = Date.now() - startTime;
        console.log(`[Webhook ${source}] ✅ Deposit completed in ${elapsed}ms`);

        return res.json({
            success: true,
            status: 'SUCCESS',
            data: {
                logId: log.id,
                transactionId: transaction.id,
                username: matchedUser.username,
                amount: depositAmount,
                newBalance: balanceBefore + depositAmount
            },
            elapsed: `${elapsed}ms`
        });
    } else {
        // Betflix failed - mark transaction as failed
        await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                status: 'FAILED',
                note: `${transaction.note} | Betflix Error: ${betflixError}`
            }
        });

        await (prisma as any).smsWebhookLog.create({
            data: {
                rawMessage: message,
                messageHash,
                parsedData: JSON.stringify(parsed),
                amount: depositAmount,
                destAccount: parsed.destAccountLast4,
                sourceAccount: parsed.sourceAccountLast4,
                sourceBank: parsed.sourceBank,
                sourceName: parsed.sourceName,
                matchedUserId: matchedUser.id,
                transactionId: transaction.id,
                status: 'FAILED',
                errorMessage: betflixError,
                matchLevel: 3
            }
        });

        return res.json({
            success: false,
            status: 'BETFLIX_FAILED',
            message: betflixError,
            transactionId: transaction.id
        });
    }
}

// =============================================
// POST /api/notify/webhook
// รับ SMS จาก SMS Forwarder app (ต้องมี API Key)
// =============================================
router.post('/webhook', webhookAuth, async (req, res) => {
    try {
        const message = req.body.message || req.body.body || req.body.text || req.body.key || req.body.msg || '';

        if (!message) {
            console.log('[Webhook POST] No message in request body');
            return res.status(400).json({
                success: false,
                error: 'No message provided',
                received: req.body
            });
        }

        console.log('[Webhook POST] Received SMS:', message.substring(0, 100) + '...');
        await processWebhookMessage(message, 'POST', res);

    } catch (error: any) {
        console.error('[Webhook POST] Unexpected error:', error);
        return res.status(500).json({
            success: false,
            status: 'ERROR',
            message: error.message || 'Internal server error'
        });
    }
});

// =============================================
// GET /api/notify/webhook
// รับ SMS ผ่าน query params (สำหรับ apps ที่ support GET เท่านั้น)
// =============================================
router.get('/webhook', webhookAuth, async (req, res) => {
    try {
        const message = (req.query.message || req.query.body || req.query.text || req.query.msg || req.query.key || '') as string;

        if (!message) {
            console.log('[Webhook GET] No message in query params');
            return res.status(400).json({
                success: false,
                error: 'No message provided',
                hint: 'Use ?message=YOUR_SMS_TEXT or ?msg=YOUR_SMS_TEXT',
                received: req.query
            });
        }

        console.log('[Webhook GET] Received SMS:', message.substring(0, 100) + '...');
        await processWebhookMessage(message, 'GET', res);

    } catch (error: any) {
        console.error('[Webhook GET] Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// =============================================
// GET /api/notify/webhook/logs
// ดู webhook logs ล่าสุด (สำหรับ admin debugging)
// =============================================
router.get('/webhook/logs', async (req, res) => {
    try {
        const logs = await (prisma as any).smsWebhookLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        res.json({ success: true, data: logs });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// =============================================
// GET /api/notify/webhook/test
// ทดสอบว่า webhook ทำงานได้
// =============================================
router.get('/webhook/test', (req, res) => {
    res.json({
        success: true,
        message: 'SMS Webhook is ready',
        endpoint: '/api/notify/webhook',
        method: 'POST or GET',
        expectedBody: { message: 'SMS content here' },
        queryParams: '?message=SMS+content+here',
        requiresApiKey: !!process.env.WEBHOOK_API_KEY
    });
});

export default router;

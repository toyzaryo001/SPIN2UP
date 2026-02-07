import { Router } from 'express';
import prisma from '../lib/db.js';
import { parseBankSMS, matchBankName, matchAccountLast4, generateMessageHash, getBankThaiName } from '../services/sms-parser.service.js';
import { BetflixService } from '../services/betflix.service.js';

const router = Router();

/**
 * POST /api/notify/webhook
 * Receive SMS from SMS Forwarder app
 * 
 * Expected body: { message: "SMS content here" }
 * or: { body: "SMS content here" } (alternative format)
 */
router.post('/webhook', async (req, res) => {
    const startTime = Date.now();

    try {
        // Get message from request body - support multiple field names
        const message = req.body.message || req.body.body || req.body.text || req.body.key || req.body.msg || '';

        if (!message) {
            console.log('[Webhook] No message in request body');
            return res.status(400).json({
                success: false,
                error: 'No message provided',
                received: req.body
            });
        }

        console.log('[Webhook] Received SMS:', message.substring(0, 100) + '...');

        // Generate hash for deduplication
        const messageHash = generateMessageHash(message);

        // Check for duplicate
        const existing = await prisma.smsWebhookLog.findUnique({
            where: { messageHash }
        });

        if (existing) {
            console.log('[Webhook] Duplicate message detected, hash:', messageHash);
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
            // Log failed parse
            await prisma.smsWebhookLog.create({
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

        console.log('[Webhook] Parsed SMS:', {
            amount: parsed.amount,
            dest: parsed.destAccountLast4,
            source: parsed.sourceAccountLast4,
            bank: parsed.sourceBank
        });

        // ============ LEVEL 1: Match Destination Account ============
        const systemBanks = await prisma.bankAccount.findMany({
            where: {
                type: 'deposit',
                isActive: true
            }
        });

        const matchedBank = systemBanks.find(bank =>
            matchAccountLast4(bank.accountNumber, parsed.destAccountLast4)
        );

        if (!matchedBank) {
            console.log('[Webhook] Level 1 FAILED: No matching system bank for', parsed.destAccountLast4);

            await prisma.smsWebhookLog.create({
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

        console.log('[Webhook] Level 1 PASSED: Matched system bank:', matchedBank.bankName, matchedBank.accountNumber);

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

        const matchedUser = allUsers.find(user =>
            matchAccountLast4(user.bankAccount, parsed.sourceAccountLast4)
        );

        if (!matchedUser) {
            console.log('[Webhook] Level 2 FAILED: No user with account ending', parsed.sourceAccountLast4);

            await prisma.smsWebhookLog.create({
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

        console.log('[Webhook] Level 2 PASSED: Matched user:', matchedUser.username);

        // ============ LEVEL 3: Verify Bank Name ============
        const bankMatch = matchBankName(parsed.sourceBank, matchedUser.bankName);

        if (!bankMatch) {
            console.log('[Webhook] Level 3 FAILED: Bank mismatch', parsed.sourceBank, 'vs', matchedUser.bankName);

            await prisma.smsWebhookLog.create({
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

        console.log('[Webhook] Level 3 PASSED: Bank verified');
        console.log('[Webhook] ✅ All 3 levels matched! Processing deposit for', matchedUser.username, 'amount:', parsed.amount);

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

        console.log('[Webhook] Created pending transaction:', transaction.id);

        // Deposit to Betflix
        let betflixSuccess = false;
        let betflixError = '';

        if (matchedUser.betflixUsername) {
            try {
                betflixSuccess = await BetflixService.transfer(
                    matchedUser.betflixUsername,
                    depositAmount,
                    `AUTO_SMS_${transaction.id}`
                );
                console.log('[Webhook] Betflix transfer result:', betflixSuccess);
            } catch (err: any) {
                betflixError = err.message || 'Betflix transfer failed';
                console.error('[Webhook] Betflix transfer error:', betflixError);
            }
        } else {
            betflixError = 'User has no Betflix account - will register on first game';
            console.log('[Webhook]', betflixError);
            betflixSuccess = true; // Allow deposit without Betflix for now
        }

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
            const log = await prisma.smsWebhookLog.create({
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

            const elapsed = Date.now() - startTime;
            console.log(`[Webhook] ✅ Deposit completed in ${elapsed}ms`);

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

            await prisma.smsWebhookLog.create({
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

    } catch (error: any) {
        console.error('[Webhook] Unexpected error:', error);
        return res.status(500).json({
            success: false,
            status: 'ERROR',
            message: error.message || 'Internal server error'
        });
    }
});

/**
 * GET /api/notify/webhook/logs
 * Get recent webhook logs (for admin debugging)
 */
router.get('/webhook/logs', async (req, res) => {
    try {
        const logs = await prisma.smsWebhookLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        res.json({ success: true, data: logs });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/notify/webhook/test
 * Test endpoint to verify webhook is accessible
 */
router.get('/webhook/test', (req, res) => {
    res.json({
        success: true,
        message: 'SMS Webhook is ready',
        endpoint: '/api/notify/webhook',
        method: 'POST or GET',
        expectedBody: { message: 'SMS content here' },
        queryParams: '?message=SMS+content+here'
    });
});

/**
 * GET /api/notify/webhook/debug
 * Debug endpoint to see exactly what the app sends
 */
router.get('/webhook/debug', (req, res) => {
    console.log('[Webhook Debug] Full Request:', {
        query: req.query,
        body: req.body,
        params: req.params,
        headers: req.headers,
        url: req.url,
        originalUrl: req.originalUrl
    });

    res.json({
        success: true,
        message: 'Debug info logged',
        query: req.query,
        body: req.body,
        url: req.url,
        // Echo back keys found in query/body
        keys: [...Object.keys(req.query), ...Object.keys(req.body)]
    });
});

/**
 * GET /api/notify/webhook
 * Handle SMS via query params (for apps that only support GET)
 * Example: /api/notify/webhook?message=SMS+content+here
 */
router.get('/webhook', async (req, res) => {
    const startTime = Date.now();

    try {
        // Get message from query params
        const message = (req.query.message || req.query.body || req.query.text || '') as string;

        if (!message) {
            console.log('[Webhook GET] No message in query params');
            return res.status(400).json({
                success: false,
                error: 'No message provided',
                hint: 'Use ?message=YOUR_SMS_TEXT',
                received: req.query
            });
        }

        console.log('[Webhook GET] Received SMS:', message.substring(0, 100) + '...');

        // Generate hash for deduplication
        const messageHash = generateMessageHash(message);

        // Check for duplicate
        const existing = await prisma.smsWebhookLog.findUnique({
            where: { messageHash }
        });

        if (existing) {
            console.log('[Webhook GET] Duplicate message detected');
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
            await prisma.smsWebhookLog.create({
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

        console.log('[Webhook GET] Parsed:', parsed.amount, parsed.destAccountLast4, parsed.sourceAccountLast4);

        // Level 1: Match Destination Account
        const systemBanks = await prisma.bankAccount.findMany({
            where: { type: 'deposit', isActive: true }
        });

        const matchedBank = systemBanks.find(bank =>
            matchAccountLast4(bank.accountNumber, parsed.destAccountLast4)
        );

        if (!matchedBank) {
            await prisma.smsWebhookLog.create({
                data: {
                    rawMessage: message, messageHash,
                    parsedData: JSON.stringify(parsed),
                    amount: parsed.amount,
                    destAccount: parsed.destAccountLast4,
                    sourceAccount: parsed.sourceAccountLast4,
                    sourceBank: parsed.sourceBank,
                    sourceName: parsed.sourceName,
                    status: 'NO_MATCH',
                    errorMessage: 'Destination account not found',
                    matchLevel: 0
                }
            });
            return res.json({ success: false, status: 'NO_MATCH', level: 1 });
        }

        // Level 2: Match Source Account to User
        const allUsers = await prisma.user.findMany({
            where: { status: 'ACTIVE' },
            select: { id: true, username: true, bankAccount: true, bankName: true, balance: true, betflixUsername: true }
        });

        const matchedUser = allUsers.find(user =>
            matchAccountLast4(user.bankAccount, parsed.sourceAccountLast4)
        );

        if (!matchedUser) {
            await prisma.smsWebhookLog.create({
                data: {
                    rawMessage: message, messageHash,
                    parsedData: JSON.stringify(parsed),
                    amount: parsed.amount,
                    destAccount: parsed.destAccountLast4,
                    sourceAccount: parsed.sourceAccountLast4,
                    sourceBank: parsed.sourceBank,
                    sourceName: parsed.sourceName,
                    status: 'NO_MATCH',
                    errorMessage: 'Source account not found',
                    matchLevel: 1
                }
            });
            return res.json({ success: false, status: 'NO_MATCH', level: 2 });
        }

        // Level 3: Verify Bank Name
        if (!matchBankName(parsed.sourceBank, matchedUser.bankName)) {
            await prisma.smsWebhookLog.create({
                data: {
                    rawMessage: message, messageHash,
                    parsedData: JSON.stringify(parsed),
                    amount: parsed.amount,
                    destAccount: parsed.destAccountLast4,
                    sourceAccount: parsed.sourceAccountLast4,
                    sourceBank: parsed.sourceBank,
                    sourceName: parsed.sourceName,
                    matchedUserId: matchedUser.id,
                    status: 'NO_MATCH',
                    errorMessage: `Bank mismatch: ${parsed.sourceBank} vs ${matchedUser.bankName}`,
                    matchLevel: 2
                }
            });
            return res.json({ success: false, status: 'NO_MATCH', level: 3 });
        }

        // All matched - Process deposit
        const balanceBefore = Number(matchedUser.balance);
        const depositAmount = parsed.amount;

        const transaction = await prisma.transaction.create({
            data: {
                userId: matchedUser.id,
                type: 'DEPOSIT',
                subType: 'AUTO_SMS',
                amount: depositAmount,
                balanceBefore,
                balanceAfter: balanceBefore + depositAmount,
                status: 'PENDING',
                note: `Auto SMS - ${parsed.sourceBank} X${parsed.sourceAccountLast4}`
            }
        });

        // Betflix deposit
        let betflixSuccess = false;
        if (matchedUser.betflixUsername) {
            try {
                betflixSuccess = await BetflixService.transfer(matchedUser.betflixUsername, depositAmount, `SMS_${transaction.id}`);
            } catch (err) {
                console.error('[Webhook GET] Betflix error:', err);
            }
        } else {
            betflixSuccess = true;
        }

        if (betflixSuccess) {
            await prisma.transaction.update({ where: { id: transaction.id }, data: { status: 'COMPLETED' } });
            await prisma.user.update({ where: { id: matchedUser.id }, data: { balance: { increment: depositAmount } } });

            const log = await prisma.smsWebhookLog.create({
                data: {
                    rawMessage: message, messageHash,
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

            return res.json({
                success: true,
                status: 'SUCCESS',
                data: { logId: log.id, transactionId: transaction.id, username: matchedUser.username, amount: depositAmount },
                elapsed: `${Date.now() - startTime}ms`
            });
        } else {
            await prisma.transaction.update({ where: { id: transaction.id }, data: { status: 'FAILED' } });
            return res.json({ success: false, status: 'BETFLIX_FAILED' });
        }

    } catch (error: any) {
        console.error('[Webhook GET] Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

export default router;

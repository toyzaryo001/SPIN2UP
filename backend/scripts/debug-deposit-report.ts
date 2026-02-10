
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugDepositReport() {
    console.log('--- Debugging Deposit Report Data ---');

    // Simulate '1month' preset logic
    const now = new Date();
    const start = new Date();
    const end = new Date();

    // 1month logic from reports.routes.ts
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    console.log(`Date Range: ${start.toISOString()} to ${end.toISOString()}`);

    try {
        // 1. Fetch Valid Transactions
        const transactions = await prisma.transaction.findMany({
            where: {
                type: { in: ['DEPOSIT', 'MANUAL_ADD', 'BONUS', 'CASHBACK'] },
                createdAt: { gte: start, lte: end }
            },
            include: {
                user: { select: { username: true, fullName: true, phone: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`Found ${transactions.length} Transactions`);
        if (transactions.length > 0) {
            console.log('Sample Transaction:', JSON.stringify(transactions[0], null, 2));
        }

        // 2. Fetch Unmatched SMS Logs
        // Note: Using raw query or any cast if model missing, but here we import PrismaClient so it should work if generated
        // If getting error here, it confirms the model missing issue.
        let smsLogs = [];
        try {
            smsLogs = await (prisma as any).smsWebhookLog.findMany({
                where: {
                    status: { in: ['NO_MATCH', 'PARSE_FAILED', 'BETFLIX_FAILED'] },
                    createdAt: { gte: start, lte: end }
                },
                orderBy: { createdAt: 'desc' }
            });
            console.log(`Found ${smsLogs.length} Unmatched SMS Logs`);
            if (smsLogs.length > 0) {
                console.log('Sample SMS Log:', JSON.stringify(smsLogs[0], null, 2));
            }
        } catch (err: any) {
            console.log('Error fetching SMS logs (model might be missing):', err.message);
        }

    } catch (error) {
        console.error('Error running debug queries:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugDepositReport();

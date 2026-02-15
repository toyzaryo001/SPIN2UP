
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Inspecting Sync Status ---');

    try {
        const setting = await prisma.setting.findUnique({
            where: { key: 'BETFLIX_LAST_LOG_ID' }
        });
        console.log('BETFLIX_LAST_LOG_ID:', setting?.value || 'Not Set');

        const totalBets = await prisma.transaction.count({
            where: { type: 'BET' }
        });
        console.log('Total BET Transactions:', totalBets);

        const recentBets = await prisma.transaction.findMany({
            where: { type: 'BET' },
            orderBy: { createdAt: 'desc' },
            take: 3
        });
        console.log('Recent 3 BETs:', recentBets);
    } catch (error) {
        console.error('Inspection Failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();

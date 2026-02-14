
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Start fixing transaction types casing...');

    // Fix DEPOSIT
    const deposits = await prisma.transaction.updateMany({
        where: { type: 'deposit' },
        data: { type: 'DEPOSIT' }
    });
    console.log(`Updated ${deposits.count} deposits to DEPOSIT`);

    // Fix WITHDRAW
    const withdraws = await prisma.transaction.updateMany({
        where: { type: 'withdraw' },
        data: { type: 'WITHDRAW' }
    });
    console.log(`Updated ${withdraws.count} withdrawals to WITHDRAW`);

    // Fix BONUS (if any)
    const bonuses = await prisma.transaction.updateMany({
        where: { type: 'bonus' },
        data: { type: 'BONUS' }
    });
    console.log(`Updated ${bonuses.count} bonuses to BONUS`);

    // Fix PENDING status
    const pending = await prisma.transaction.updateMany({
        where: { status: 'pending' },
        data: { status: 'PENDING' }
    });
    console.log(`Updated ${pending.count} pending status to PENDING`);

    // Fix SUCCESS to COMPLETED (if mixed)
    // First, standardise lowercase 'success'/'completed' -> 'COMPLETED'
    const success = await prisma.transaction.updateMany({
        where: { status: { in: ['success', 'completed', 'APPROVED'] } },
        data: { status: 'COMPLETED' }
    });
    console.log(`Updated ${success.count} success/completed status to COMPLETED`);

    const failed = await prisma.transaction.updateMany({
        where: { status: 'failed' },
        data: { status: 'FAILED' }
    });
    console.log(`Updated ${failed.count} failed status to FAILED`);

    console.log('Migration completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

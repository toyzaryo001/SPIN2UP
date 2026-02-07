import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Check if exists first
    const existing = await prisma.bankAccount.findFirst({
        where: { accountNumber: { endsWith: '7109' } }
    });

    if (existing) {
        console.log('✅ Bank account ending in 7109 already exists:', existing.accountNumber);
        return;
    }

    // Create KBANK account ending in 7109
    const bank = await prisma.bankAccount.create({
        data: {
            bankName: 'KBANK',
            accountNumber: '0000007109',
            accountName: 'System Deposit Account',
            type: 'deposit',
            isActive: true,
            balance: 0
        }
    });

    console.log('✅ Created Bank Account:', bank.bankName, bank.accountNumber);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

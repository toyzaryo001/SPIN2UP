import prisma from '../src/lib/db.js';

async function main() {
    const banks = await prisma.bankAccount.findMany();
    console.log('All Bank Accounts:');
    banks.forEach(b => {
        console.log(`- ${b.bankName} (${b.accountNumber}) [Type: ${b.type}] [Active: ${b.isActive}]`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });

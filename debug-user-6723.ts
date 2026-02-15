
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Checking for users with bank account ending in '6723'...");

    // Check by endsWith
    const users = await prisma.user.findMany({
        where: {
            bankAccount: {
                endsWith: '6723'
            }
        },
        select: {
            id: true,
            username: true,
            bankName: true,
            bankAccount: true
        }
    });

    console.log(`Found ${users.length} users:`);
    console.log(JSON.stringify(users, null, 2));

    if (users.length === 0) {
        console.log("No exact match found. Listing all users to check formatting...");
        const allUsers = await prisma.user.findMany({
            select: { id: true, username: true, bankAccount: true }
        });
        // Filter manually to see if there are hidden chars
        const manualMatch = allUsers.filter(u => u.bankAccount.replace(/[^0-9]/g, '').endsWith('6723'));
        console.log(`Found ${manualMatch.length} users with manual regex check:`);
        console.log(JSON.stringify(manualMatch, null, 2));
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

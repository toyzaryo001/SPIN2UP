
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log("Checking for users with bank account ending in '6723'...");

    // Check by endsWith (standard)
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

    console.log(`Found ${users.length} users with endsWith('6723'):`);
    console.log(JSON.stringify(users, null, 2));

    if (users.length === 0) {
        // Fallback check: Read ALL users and check manually (in case of weird whitespace or formatting)
        console.log("Performing deep scan of all users...");
        const allUsers = await prisma.user.findMany({
            select: { id: true, username: true, bankAccount: true, bankName: true }
        });

        const manualMatch = allUsers.filter(u => {
            if (!u.bankAccount) return false;
            // Remove dashes, spaces, non-digits
            const clean = u.bankAccount.replace(/[^0-9]/g, '');
            return clean.endsWith('6723');
        });

        console.log(`Deep scan found ${manualMatch.length} users:`);
        if (manualMatch.length > 0) {
            console.log(JSON.stringify(manualMatch, null, 2));
            console.log("WARN: These users exist but were not found by standard query. Potential formatting issue in DB.");
        } else {
            console.log("No users found even with deep scan.");
        }
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

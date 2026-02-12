
import { BetflixService } from './services/betflix.service';
import prisma from './lib/db';

async function main() {
    console.log("--- Debugging Win/Loss Report V2 ---");

    try {
        // 1. Get users with betflixUsername (Active ones)
        // We'll trust lastLoginAt to find someone active
        const users = await prisma.user.findMany({
            where: {
                betflixUsername: { not: null },
            },
            take: 5,
            orderBy: { lastLoginAt: 'desc' }
        });

        console.log(`Found ${users.length} active users.`);

        if (users.length === 0) {
            console.log("No active users found.");
            return;
        }

        const targetUser = users[0];
        console.log(`Testing with user: ${targetUser.username} (${targetUser.betflixUsername})`);

        // 2. Define Dates (Assumed BKK Time)
        // Current User Time: Feb 13, 03:22 AM
        // BKK Today: 2026-02-13
        // BKK Yesterday: 2026-02-12

        const datesToCheck = ['2026-02-11', '2026-02-12', '2026-02-13'];

        for (const d of datesToCheck) {
            console.log(`\nChecking Date: ${d}`);
            const result = await BetflixService.getReportSummary(
                targetUser.betflixUsername!,
                d,
                d
            );
            console.log(`Result for ${d}:`, JSON.stringify(result));
        }

    } catch (error) {
        console.error("Error in debug script:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

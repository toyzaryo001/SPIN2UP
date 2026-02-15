
import dotenv from 'dotenv';
import prisma from '../src/lib/db.js';

dotenv.config();

async function main() {
    console.log('--- Inspecting User & Config ---');
    try {
        const config = await prisma.agentConfig.findFirst({ where: { isActive: true } });
        console.log('Config:', config);

        // Try to find the user mentioned in logs (or just first user with BF username)
        // I will list top 5 users
        const users = await prisma.user.findMany({
            take: 5,
            select: { id: true, username: true, betflixUsername: true, phone: true }
        });
        console.log('Users:', users);

        if (users.length > 0) {
            const u = users[0];
            const bfUser = u.betflixUsername;
            console.log(`\nTesting logic for user: ${u.username}`);
            console.log(`Stored Betflix Username: ${bfUser}`);

            // Emulate applyPrefix
            const p = (config?.prefix || '').toLowerCase();
            const s = (config?.sitePrefix || '').toLowerCase();
            const fullPrefix = p + s;
            console.log(`Expected Prefix: ${fullPrefix}`);

            let calculated = u.username;
            const digits = u.username.replace(/\D/g, '');
            if (digits.length >= 6) {
                calculated = (config?.prefix || '') + (config?.sitePrefix || '') + digits.slice(-6);
            }
            console.log(`Calculated Username: ${calculated}`);
        }

    } catch (error) {
        console.error('Script Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

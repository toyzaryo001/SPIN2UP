
import { BetflixService } from '../src/services/betflix.service';
import prisma from '../src/lib/db';

async function main() {
    console.log('--- Debugging Betflix Launch (Robust) ---');

    // 1. Check Config
    const config = await prisma.agentConfig.findFirst({ where: { code: 'BETFLIX' } });
    if (config) {
        console.log(`Config Found: URL=${config.apiKey} Prefix=${config.upline}`);
    } else {
        console.log('Error: Betflix Config Not Found!');
        return;
    }

    // 2. Find a User with Existing Betflix Account
    const externalAccount = await prisma.userExternalAccount.findFirst({
        where: { agent: { code: 'BETFLIX' } },
        include: { user: true }
    });

    let username = '';

    if (externalAccount) {
        username = externalAccount.externalUsername;
        console.log(`Found Existing Account: ${username} (User ID: ${externalAccount.userId})`);
    } else {
        console.log('No existing Betflix account found. Creating new...');
        const user = await prisma.user.findFirst();
        if (!user) { console.log('No users in DB.'); return; }

        const creds = await BetflixService.register(user.phone); // Or user.id?
        if (creds) {
            username = creds.username;
            console.log(`Registered New Account: ${username}`);
        } else {
            console.log('Registration Failed. Cannot proceed.');
            return;
        }
    }

    // 3. Try Launching
    console.log(`\n--- Attempting Launch for ${username} ---`);
    console.log('Game: PG Soft / Mahjong Ways (pg/mahjong-ways)');

    try {
        const url = await BetflixService.launchGame(username, 'pg', 'mahjong-ways', 'th');

        if (url) {
            console.log('✅ Launch Success!');
            console.log('URL:', url);
        } else {
            console.error('❌ Launch Failed (Returned null)');
        }
    } catch (e: any) {
        console.error('❌ Launch Exception:', e.message);
        if (e.response) {
            console.error('API Response:', e.response.data);
            console.error('API Status:', e.response.status);
        }
    }
}

main().catch(e => console.error('Script Error:', e)).finally(() => prisma.$disconnect());

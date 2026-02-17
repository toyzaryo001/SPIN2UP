
import { NexusProvider } from '../src/services/agents/NexusProvider';
import prisma from '../src/lib/db';

async function main() {
    console.log('--- Debugging Nexus Launch ---');

    // 1. Check Config
    const config = await prisma.agentConfig.findFirst({ where: { code: 'NEXUS' } });
    if (!config) {
        console.log('Error: Nexus Config Not Found!');
        return;
    }
    console.log(`Config Found: URL=${config.apiKey} Upline=${config.upline}`);

    // 2. Find a User
    // We need a user who has a Nexus account (UserExternalAccount)
    const externalAccount = await prisma.userExternalAccount.findFirst({
        where: { agent: { code: 'NEXUS' } },
        include: { user: true }
    });

    let username = '';
    if (externalAccount) {
        username = externalAccount.externalUsername;
        console.log(`Found Existing Account: ${username}`);
    } else {
        console.log('No existing Nexus account. Creating new...');
        const user = await prisma.user.findFirst();
        if (!user) return;
        const nexus = new NexusProvider();
        const creds = await nexus.register(user.id, user.phone);
        if (creds) {
            username = creds.username;
            console.log(`Registered: ${username}`);
        } else {
            console.log('Registration Failed');
            return;
        }
    }

    const nexus = new NexusProvider();

    // 3. Test Launch with 'pg'
    console.log(`\n--- Attempting Launch with 'pg' ---`);
    try {
        const url = await nexus.launchGame(username, 'mahjong-ways', 'pg', 'en'); // assuming game code
        console.log(`Result (pg): ${url ? '✅ Success' : '❌ Failed (null)'}`);
        if (url) console.log(url);
    } catch (e: any) {
        console.log(`Error (pg): ${e.message}`);
    }

    // 4. Test Launch with 'pgsoft'
    console.log(`\n--- Attempting Launch with 'pgsoft' ---`);
    try {
        const url2 = await nexus.launchGame(username, 'mahjong-ways', 'pgsoft', 'en');
        console.log(`Result (pgsoft): ${url2 ? '✅ Success' : '❌ Failed (null)'}`);
        if (url2) console.log(url2);
    } catch (e: any) {
        console.log(`Error (pgsoft): ${e.message}`);
    }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());

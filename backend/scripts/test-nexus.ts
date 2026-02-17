
import { NexusProvider } from '../src/services/agents/NexusProvider';
import prisma from '../src/lib/db';

async function main() {
    console.log('--- Testing Nexus Provider ---');
    try {
        const nexus = new NexusProvider();

        // 1. Check Status
        const status = await nexus.checkStatus();
        console.log(`Status: ${status ? 'Online' : 'Offline'}`);

        // 2. Get Providers
        console.log('Fetching Providers...');
        const providers = await nexus.getGameProviders();
        console.log(`Found ${providers.length} providers.`);
        // List top 5 to see format
        console.log('Sample Providers:', providers.slice(0, 5).map((p: any) => p.code || p.provider_code || p.name));

        // 3. Test PG Code
        console.log("Testing 'pg' provider...");
        const pgGames = await nexus.getGames('pg');
        console.log(`'pg' returned ${pgGames.length} games.`);

        if (pgGames.length === 0) {
            console.log("Testing 'pgsoft' provider...");
            const pgsoftGames = await nexus.getGames('pgsoft');
            console.log(`'pgsoft' returned ${pgsoftGames.length} games.`);
        }

    } catch (e: any) {
        console.error('Nexus Test Error:', e.message);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());

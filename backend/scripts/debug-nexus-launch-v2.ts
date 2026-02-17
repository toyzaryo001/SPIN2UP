
import { NexusProvider } from '../src/services/agents/NexusProvider';
import prisma from '../src/lib/db';

async function main() {
    console.log('--- Debugging Nexus Launch V2 ---');

    // 1. Config
    const config = await prisma.agentConfig.findFirst({ where: { code: 'NEXUS' } });
    if (!config) { console.log('Config Not Found'); return; }
    console.log(`Config: URL=${config.apiKey}`);

    // 2. User
    const externalAccount = await prisma.userExternalAccount.findFirst({
        where: { agent: { code: 'NEXUS' } },
        include: { user: true }
    });

    if (!externalAccount) { console.log('No Nexus User Found'); return; }
    const username = externalAccount.externalUsername;
    console.log(`User: ${username}`);

    const nexus = new NexusProvider();

    // 3. Test Cases
    const tests = [
        { prov: 'PGSOFT', code: 'pgsoft-medusa', label: 'Prefixed (pgsoft-medusa)' },
        { prov: 'PGSOFT', code: 'medusa', label: 'Raw (medusa)' },
        { prov: 'PG', code: 'medusa', label: 'Mapping Test (PG -> medusa)' }
    ];

    for (const t of tests) {
        console.log(`\n--- Test: ${t.label} ---`);
        try {
            const url = await nexus.launchGame(username, t.code, t.prov, 'en');
            console.log(`✅ Result: Success! URL=${url}`);
        } catch (e: any) {
            console.log(`❌ Failed: ${e.message}`);
            // Log full error object if available
            if (e.response && e.response.data) {
                console.log('API Response:', JSON.stringify(e.response.data, null, 2));
            }
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());

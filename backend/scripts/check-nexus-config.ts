
import prisma from '../src/lib/db';

async function main() {
    console.log('--- Checking Nexus Config ---');
    const config = await prisma.agentConfig.findFirst({
        where: { code: 'NEXUS' }
    });

    if (config) {
        console.log('Nexus Config Found:');
        console.log('ID:', config.id);
        console.log('Code:', config.code);
        console.log('Name:', config.name);
        console.log('API Key (BaseURL?):', config.apiKey);
        console.log('Upline (AgentCode?):', config.upline);
        console.log('Secret (Token?):', config.apiSecret);
        console.log('IsActive:', config.isActive);
    } else {
        console.log('No Nexus Config found.');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());


import prisma from '../src/lib/db';

async function main() {
    console.log('--- Checking Betflix Config ---');
    const config = await prisma.agentConfig.findFirst({
        where: { code: 'BETFLIX' }
    });

    if (config) {
        console.log('Betflix Config Found:');
        console.log('ID:', config.id);
        console.log('Name:', config.name);
        console.log('apiKey (URL):', config.apiKey);
        console.log('xApiKey (Key):', config.xApiKey);
        console.log('xApiCat (Cat):', config.xApiCat);
        console.log('upline (Prefix):', config.upline);
        console.log('IsActive:', config.isActive);
    } else {
        console.log('No Betflix Config found.');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());

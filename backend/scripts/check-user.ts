import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Find user by phone (from screenshot)
    const phone = '0642938073';
    const user = await prisma.user.findUnique({
        where: { phone }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log('User Found:');
    console.log('- ID:', user.id);
    console.log('- Username:', user.username);
    console.log('- Phone:', user.phone);
    console.log('- Betflix Username:', user.betflixUsername);
    console.log('- Local Balance:', user.balance);
    console.log('- Status:', user.status);

    // Check Agent Config to see prefix
    const config = await prisma.agentConfig.findFirst({ where: { isActive: true } });
    console.log('Agent Config:', config ? {
        upline: config.upline,
        prefix: config.upline // In code it maps upline to prefix
    } : 'None');

    const setting = await prisma.setting.findUnique({ where: { key: 'prefix' } });
    console.log('Site Prefix Setting:', setting?.value);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

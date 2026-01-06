import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAdminRole() {
    const result = await prisma.user.updateMany({
        where: { username: 'admin' },
        data: { role: 'SUPER_ADMIN' }
    });

    console.log('✅ Updated admin to SUPER_ADMIN:', result.count, 'record(s)');
    await prisma.$disconnect();
}

updateAdminRole().catch(console.error);

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAdminRole() {
    const result = await prisma.admin.updateMany({
        where: { username: 'admin' },
        data: { isSuperAdmin: true }
    });

    console.log('✅ Updated admin to SUPER_ADMIN:', result.count, 'record(s)');
    await prisma.$disconnect();
}

updateAdminRole().catch(console.error);

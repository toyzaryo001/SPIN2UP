import prisma from './src/lib/db.js';

async function main() {
    const admins = await prisma.admin.findMany({
        include: { role: true },
    });

    for (const admin of admins) {
        if (admin.username === 'superadmin' || admin.username === 'super03') {
            console.log(`User: ${admin.username}`);
            console.log(`isSuperAdmin: ${admin.isSuperAdmin}`);
            console.log(`Role: ${admin.role?.name}`);
            console.log(`Permissions: ${admin.role?.permissions ? 'Set' : 'Empty'}`);
            console.log('---');
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());

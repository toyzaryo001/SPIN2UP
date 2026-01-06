
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking Admin users...');

    // Check Admin table (separate from User)
    const admins = await prisma.admin.findMany({
        select: {
            id: true,
            username: true,
            fullName: true,
            isSuperAdmin: true,
            isActive: true,
        }
    });

    if (admins.length > 0) {
        console.log('✅ Admin users found:');
        admins.forEach(admin => {
            console.log(`   - ${admin.username} (${admin.fullName}) ${admin.isSuperAdmin ? '[Super Admin]' : ''} ${admin.isActive ? '✓' : '✗'}`);
        });
    } else {
        console.log('❌ No admin users found.');
        console.log('   Please run: npx prisma db seed');
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());

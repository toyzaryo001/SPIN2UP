import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // Create Super Admin in Admin table
    const existingAdmin = await prisma.admin.findUnique({
        where: { username: 'superadmin' },
    });

    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const admin = await prisma.admin.create({
            data: {
                username: 'superadmin',
                password: hashedPassword,
                fullName: 'Super Admin',
                phone: '0999999999',
                isSuperAdmin: true,
                isActive: true,
            },
        });
        console.log('✅ Created super admin:', admin.username);
    } else {
        console.log('ℹ️ Super admin already exists');
    }

    // Create Super Admin Role
    const existingRole = await prisma.adminRole.findUnique({
        where: { name: 'Super Admin' },
    });

    if (!existingRole) {
        const role = await prisma.adminRole.create({
            data: {
                name: 'Super Admin',
                description: 'Full access to all features',
                permissions: JSON.stringify({
                    members: { view: true, edit: true, delete: true },
                    manual: { view: true, deposit: true, withdraw: true },
                    reports: { view: true },
                    settings: { view: true, edit: true },
                    promotions: { view: true, edit: true, delete: true },
                    banners: { view: true, edit: true, delete: true },
                    games: { view: true, edit: true },
                    announcements: { view: true, edit: true, delete: true },
                    agents: { view: true, edit: true, delete: true },
                    staff: { view: true, edit: true, delete: true },
                }),
            },
        });
        console.log('✅ Created Super Admin role:', role.name);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

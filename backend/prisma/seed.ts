import { PrismaClient } from '@prisma/client';
// @ts-ignore
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seeding...');

    // 1. Seed Super Admin (Example)
    const superAdminEmail = 'admin@example.com';
    const superAdmin = await prisma.admin.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password: await bcrypt.hash('123456', 10),
            fullName: 'Super Admin',
            isSuperAdmin: true,
            roleId: null,
        },
    });
    console.log('👤 Admin seeded:', superAdmin.username);

    // 2. Seed Payment Gateways
    console.log('💳 Seeding Payment Gateways...');

    const gateways = [
        {
            code: 'bibpay',
            name: 'BIBPAY QR',
            config: '{}',
            isActive: true,
            logo: '/images/payments/bibpay.png',
            sortOrder: 1
        },
        // Add more defaults here if needed
    ];

    for (const gw of gateways) {
        await prisma.paymentGateway.upsert({
            where: { code: gw.code },
            update: {}, // Don't overwrite config if it exists
            create: gw,
        });
    }
    console.log(`✅ Seeded ${gateways.length} payment gateways.`);

    console.log('🌱 Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

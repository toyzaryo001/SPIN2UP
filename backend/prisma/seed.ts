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
            config: JSON.stringify({
                apiKey: process.env.BIBPAY_API_KEY || 'CONFIGURE_ME',
                apiEndpoint: process.env.BIBPAY_API_ENDPOINT || 'https://api.bibbyx.com/api/v1/mc',
                callbackUrl: process.env.API_BASE_URL ? `${process.env.API_BASE_URL}/api/webhooks/payment/bibpay` : 'http://localhost:3001/api/webhooks/payment/bibpay',
                ipWhitelist: process.env.BIBPAY_IP_WHITELIST
                    ? process.env.BIBPAY_IP_WHITELIST.split(',').map((ip: string) => ip.trim())
                    : [],  // Empty by default - MUST be configured via admin or env vars
                canDeposit: true,
                canWithdraw: true,
                isAutoWithdraw: true
            }),
            isActive: true,
            logo: '/images/payments/bibpay.png',
            sortOrder: 1
        },
        // Add more defaults here if needed
    ];

    for (const gw of gateways) {
        // @ts-ignore
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

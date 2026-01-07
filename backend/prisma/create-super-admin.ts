import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Run this script to create the initial Super Admin
// Usage: npx ts-node prisma/create-super-admin.ts

async function main() {
    const prisma = new PrismaClient();

    try {
        // Check if Super Admin already exists
        const existingAdmin = await prisma.superAdmin.findFirst();
        if (existingAdmin) {
            console.log('❌ Super Admin already exists!');
            console.log(`   Username: ${existingAdmin.username}`);
            return;
        }

        // Create Super Admin
        const hashedPassword = await bcrypt.hash('superadmin123', 10);

        const admin = await prisma.superAdmin.create({
            data: {
                username: 'superadmin',
                password: hashedPassword,
                fullName: 'Super Administrator',
                email: 'admin@playnex89.com',
                isActive: true
            }
        });

        console.log('✅ Super Admin created successfully!');
        console.log('   Username: superadmin');
        console.log('   Password: superadmin123');
        console.log('');
        console.log('⚠️  Please change the password after first login!');

        // Create first prefix (px89)
        const existingPrefix = await prisma.prefix.findFirst();
        if (!existingPrefix) {
            const prefix = await prisma.prefix.create({
                data: {
                    code: 'px89',
                    name: 'PLAYNEX89',
                    databaseUrl: process.env.DATABASE_URL || '',
                    adminDomain: 'admin.playnex89.com',
                    playerDomain: 'playnex89.com',
                    isActive: true
                }
            });
            console.log('');
            console.log('✅ First prefix created!');
            console.log(`   Code: ${prefix.code}`);
            console.log(`   Name: ${prefix.name}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

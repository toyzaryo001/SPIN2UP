// This script drops the problematic FK constraint on EditLog
// It runs before the server starts to fix the database

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Checking and fixing EditLog FK constraint...');

    try {
        // Drop the constraint if it exists
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "EditLog" DROP CONSTRAINT IF EXISTS "EditLog_targetId_fkey"
        `);
        console.log('✅ EditLog FK constraint removed (or was already removed)');
    } catch (error) {
        console.error('⚠️ Could not drop FK (might not exist):', error);
    }

    await prisma.$disconnect();
}

main();

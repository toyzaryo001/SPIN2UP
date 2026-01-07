import { PrismaClient } from '@prisma/client';

// Master database client - for prefix configs and super admins
// Note: This uses the same Prisma client but connects to MASTER_DATABASE_URL
// In production, you may want to use a separate Prisma schema with `prisma generate --schema=prisma/schema-master.prisma`

const masterPrisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL
        }
    }
});

export default masterPrisma;

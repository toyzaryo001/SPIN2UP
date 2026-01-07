import { PrismaClient } from '@prisma/client';

// Cache for tenant database connections
const tenantConnections: Map<string, PrismaClient> = new Map();

/**
 * Get or create a Prisma client for a specific tenant database
 * @param databaseUrl - The database connection string for the tenant
 * @param prefixCode - The prefix code (used as cache key)
 */
export function getTenantPrisma(databaseUrl: string, prefixCode: string): PrismaClient {
    // Check if connection already exists
    if (tenantConnections.has(prefixCode)) {
        return tenantConnections.get(prefixCode)!;
    }

    // Create new connection
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: databaseUrl
            }
        }
    });

    // Cache the connection
    tenantConnections.set(prefixCode, prisma);

    return prisma;
}

/**
 * Disconnect a specific tenant connection
 */
export async function disconnectTenant(prefixCode: string): Promise<void> {
    const client = tenantConnections.get(prefixCode);
    if (client) {
        await client.$disconnect();
        tenantConnections.delete(prefixCode);
    }
}

/**
 * Disconnect all tenant connections (for graceful shutdown)
 */
export async function disconnectAllTenants(): Promise<void> {
    const disconnectPromises = Array.from(tenantConnections.values()).map(
        client => client.$disconnect()
    );
    await Promise.all(disconnectPromises);
    tenantConnections.clear();
}

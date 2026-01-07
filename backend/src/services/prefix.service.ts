import prisma from '../lib/db.js';
import { getTenantPrisma } from '../lib/tenant-db.js';
import { PrismaClient } from '@prisma/client';

interface PrefixInfo {
    id: number;
    code: string;
    name: string;
    databaseUrl: string;
    adminDomain: string | null;
    playerDomain: string | null;
    logo: string | null;
    primaryColor: string | null;
    isActive: boolean;
}

/**
 * Get prefix info from database
 */
export async function getPrefixByCode(code: string): Promise<PrefixInfo | null> {
    const prefix = await prisma.prefix.findUnique({
        where: { code: code.toLowerCase() }
    });
    return prefix;
}

/**
 * Get active prefix info
 */
export async function getActivePrefix(code: string): Promise<PrefixInfo | null> {
    const prefix = await prisma.prefix.findFirst({
        where: {
            code: code.toLowerCase(),
            isActive: true
        }
    });
    return prefix;
}

/**
 * Get all prefixes
 */
export async function getAllPrefixes(): Promise<PrefixInfo[]> {
    return prisma.prefix.findMany({
        orderBy: { createdAt: 'desc' }
    });
}

/**
 * Create new prefix
 */
export async function createPrefix(data: {
    code: string;
    name: string;
    databaseUrl: string;
    adminDomain?: string;
    playerDomain?: string;
    logo?: string;
    primaryColor?: string;
}): Promise<PrefixInfo> {
    return prisma.prefix.create({
        data: {
            code: data.code.toLowerCase(),
            name: data.name,
            databaseUrl: data.databaseUrl,
            adminDomain: data.adminDomain,
            playerDomain: data.playerDomain,
            logo: data.logo,
            primaryColor: data.primaryColor
        }
    });
}

/**
 * Update prefix
 */
export async function updatePrefix(id: number, data: Partial<{
    code: string;
    name: string;
    databaseUrl: string;
    adminDomain: string;
    playerDomain: string;
    logo: string;
    primaryColor: string;
    isActive: boolean;
}>): Promise<PrefixInfo> {
    return prisma.prefix.update({
        where: { id },
        data: {
            ...data,
            code: data.code?.toLowerCase()
        }
    });
}

/**
 * Delete prefix
 */
export async function deletePrefix(id: number): Promise<void> {
    await prisma.prefix.delete({
        where: { id }
    });
}

/**
 * Get tenant database client for a prefix
 */
export function getTenantDbForPrefix(prefix: PrefixInfo): PrismaClient {
    return getTenantPrisma(prefix.databaseUrl, prefix.code);
}

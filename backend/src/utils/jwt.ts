import jwt from 'jsonwebtoken';
import prisma from '../lib/db.js';

// 7 days in seconds
const JWT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;

// Cache for JWT secret to avoid hitting DB on every request
let cachedSecret: string | null = null;
let cacheExpiry: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

export interface JwtPayload {
    userId: number;
    role: string;
    isAdmin?: boolean;
    prefix?: string;
}

/**
 * Get JWT secret from database with caching
 * Falls back to env variable if not found in DB
 */
async function getJwtSecret(): Promise<string> {
    const now = Date.now();

    // Return cached value if still valid
    if (cachedSecret && now < cacheExpiry) {
        return cachedSecret;
    }

    try {
        // Try to get from database
        const setting = await prisma.setting.findUnique({
            where: { key: 'jwtSecret' }
        });

        if (setting && setting.value) {
            cachedSecret = setting.value;
            cacheExpiry = now + CACHE_TTL;
            console.log('[JWT] Loaded secret from database');
            return cachedSecret;
        }
    } catch (error) {
        console.error('[JWT] Error loading secret from DB:', error);
    }

    // Fallback to environment variable
    const envSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    cachedSecret = envSecret;
    cacheExpiry = now + CACHE_TTL;
    console.log('[JWT] Using environment variable for secret');
    return envSecret;
}

/**
 * Get JWT secret synchronously (from cache only)
 * Use this only when you're sure the cache is populated
 */
function getJwtSecretSync(): string {
    if (cachedSecret) {
        return cachedSecret;
    }
    // Fallback to env if cache not populated yet
    return process.env.JWT_SECRET || 'fallback-secret-key';
}

/**
 * Initialize JWT secret on startup
 * Call this when the server starts
 */
export async function initJwtSecret(): Promise<void> {
    await getJwtSecret();
    console.log('[JWT] Secret initialized');
}

/**
 * Clear the cached secret (useful when settings are updated)
 */
export function clearJwtSecretCache(): void {
    cachedSecret = null;
    cacheExpiry = 0;
    console.log('[JWT] Secret cache cleared');
}

/**
 * Sign a JWT token (async - refreshes cache if needed)
 */
export async function signTokenAsync(payload: JwtPayload): Promise<string> {
    const secret = await getJwtSecret();
    return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRES_IN_SECONDS });
}

/**
 * Verify a JWT token (async - refreshes cache if needed)
 */
export async function verifyTokenAsync(token: string): Promise<JwtPayload> {
    const secret = await getJwtSecret();
    return jwt.verify(token, secret) as JwtPayload;
}

/**
 * Sign a JWT token (sync - uses cached secret)
 * Make sure initJwtSecret() was called on startup
 */
export function signToken(payload: JwtPayload): string {
    const secret = getJwtSecretSync();
    return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRES_IN_SECONDS });
}

/**
 * Verify a JWT token (sync - uses cached secret)
 * Make sure initJwtSecret() was called on startup
 */
export function verifyToken(token: string): JwtPayload {
    const secret = getJwtSecretSync();
    return jwt.verify(token, secret) as JwtPayload;
}

import axios, { AxiosInstance } from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Cache configuration to reduce DB hits
let configCache: {
    apiUrl: string;
    apiKey: string;
    apiCat: string;
    prefix: string;
    timestamp: number;
} | null = null;

const CACHE_DURATION = 60 * 1000; // 60 seconds

export class BetflixService {

    /**
     * Get Configuration from Database (with caching)
     */
    private static async getConfig() {
        // Return cached config if valid
        if (configCache && (Date.now() - configCache.timestamp < CACHE_DURATION)) {
            return configCache;
        }

        try {
            // Fetch from AgentConfig (assuming first record is the main one)
            const config = await prisma.agentConfig.findFirst({
                where: { isActive: true },
                orderBy: { id: 'asc' }
            });

            if (!config) {
                // Fallback to env if no DB config found (safety net)
                return {
                    apiUrl: process.env.BETFLIX_API_URL || 'https://api.betflix.co',
                    apiKey: process.env.BETFLIX_API_KEY || '',
                    apiCat: process.env.BETFLIX_API_CAT || '',
                    prefix: process.env.BETFLIX_USER_PREFIX || 'CHKK',
                    timestamp: 0 // Don't cache fallback indefinitely
                };
            }

            // Update cache
            configCache = {
                apiUrl: config.apiKey || '', // Mapping apiKey field to API URL based on schema usage
                apiKey: config.xApiKey || '',
                apiCat: config.xApiCat || '',
                prefix: config.upline || '', // Mapping upline to prefix
                timestamp: Date.now()
            };

            return configCache;

        } catch (error) {
            console.error('Failed to fetch Betflix config from DB:', error);
            // Return fallback or throw
            throw new Error('Could not load Betflix configuration');
        }
    }

    /**
     * Create Axios instance with current config
     */
    private static async getApi(): Promise<AxiosInstance> {
        const config = await this.getConfig();
        return axios.create({
            baseURL: config.apiUrl,
            headers: {
                'x-api-key': config.apiKey,
                'x-api-cat': config.apiCat,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }

    /**
     * Helper: Apply Prefix
     */
    private static async applyPrefix(userCode: string): Promise<string> {
        const config = await this.getConfig();
        const raw = userCode.trim();
        if (!raw) return raw;

        // Skip prefix for CK+digits (game_username format)
        if (/^CK\d{6,8}$/i.test(raw)) {
            return raw;
        }

        const p = config.prefix.toLowerCase();
        if (p && raw.toLowerCase().startsWith(p)) {
            return raw;
        }

        return config.prefix + raw;
    }

    /**
     * Register a new user to Betflix
     * @param phone User's phone number
     * @returns The full username returned by Betflix (with agent prefix)
     */
    static async register(phone: string): Promise<{ username: string, password: string } | null> {
        try {
            const config = await this.getConfig();
            const api = await this.getApi();

            // Logic ported from PHP: Try multiple variants if first fails
            // Variant 1: Prefix + Last 6 digits (Standard)
            const phoneDigits = phone.replace(/\D/g, '');
            const variants: string[] = [];

            // 1. Prefix + Last 6 (Standard)
            if (phoneDigits.length >= 6) {
                variants.push(config.prefix + phoneDigits.slice(-6));
            }

            // 2. Prefix + Full Phone
            variants.push(config.prefix + phoneDigits);

            // 3. Raw Phone (Some agents use phone as user)
            variants.push(phoneDigits);

            const password = phoneDigits; // Use phone as password

            // Try variants
            for (const username of variants) {
                if (!username || username.length > 20) continue; // Skip invalid lengths

                const params = new URLSearchParams();
                params.append('username', username);
                params.append('password', password);

                try {
                    const res = await api.post('/v4/user/register', params);

                    if (res.data.status === 'success' || res.data.status === 1 || res.data.error_code === 0) {
                        return {
                            username: res.data.data?.username || username,
                            password: password
                        };
                    }

                    // Idempotency: If already exists, consider it a success and return credentials
                    const msg = (res.data.msg || res.data.message || '').toLowerCase();
                    if (msg.includes('exist') || msg.includes('duplicate') || msg.includes('already')) {
                        return {
                            username: username,
                            password: password
                        };
                    }
                } catch (e) {
                    // Continue to next variant on error
                    continue;
                }
            }

            console.error('All Betflix register variants failed');
            return null;

        } catch (error) {
            console.error('Betflix Register Exception:', error);
            return null;
        }
    }

    /**
     * Get User Balance directly from Betflix
     * @param username Betflix Username
     */
    static async getBalance(username: string): Promise<number> {
        try {
            const api = await this.getApi();
            const params = new URLSearchParams();
            // Ensure username has prefix if needed (though stored username usually has it)
            // We assume 'username' passed here is the full betflix username from DB
            params.append('username', username);

            const res = await api.post('/v4/user/balance', params);

            if (res.data.status === 'success' && res.data.data) {
                return parseFloat(res.data.data.balance || '0');
            }
            return 0;
        } catch (error) {
            console.error('Betflix Balance Error:', error);
            return 0;
        }
    }

    /**
     * Transfer Credit (Deposit/Withdraw)
     * @param username Betflix Username
     * @param amount Amount to transfer (Positive = Deposit, Negative = Withdraw)
     * @param ref Reference ID (optional)
     */
    static async transfer(username: string, amount: number, ref: string = ''): Promise<boolean> {
        try {
            const api = await this.getApi();
            const params = new URLSearchParams();
            params.append('username', username);
            params.append('amount', amount.toString()); // API handles negative for withdraw
            params.append('ref', ref || Date.now().toString());

            const res = await api.post('/v4/user/transfer', params);

            if (res.data.status === 'success') {
                return true;
            }
            console.error('Betflix Transfer Failed:', res.data);
            return false;
        } catch (error) {
            console.error('Betflix Transfer Exception:', error);
            return false;
        }
    }

    /**
     * Direct Game Launch (Ported from PHP launchGame)
     * Supports Provider Mapping, QTech, and GameCode Variants
     */
    static async launchGame(username: string, providerCode: string, gameCode: string = '', lang: string = 'thai'): Promise<string | null> {
        try {
            const api = await this.getApi();

            // 1. Provider Mapping (Normalize)
            const providerMap: Record<string, string> = {
                'amb': 'askmebet',
                'pgsoft': 'pg',
                'pgsoft_mix': 'pg',
                'pg': 'pg',
                'pragmatic': 'pp',
                'pp': 'pp',
                'joker': 'joker',
                'jokergaming': 'joker',
                'sa': 'sa',
                'sagaming': 'sa',
                'wm': 'wm',
                'sexy': 'sexy',
                'dreamgaming': 'dg',
                'dg': 'dg',
                'jili': 'jili',
                'jl': 'jl',
                'fc': 'fc',
                'fachai': 'fc',
                // QTech Sub-providers
                'qtech': 'qtech',
                'nlc': 'qtech', 'hab': 'qtech', 'ygg': 'qtech', 'png': 'qtech',
                'elk': 'qtech', 'bng': 'qtech', 'bpg': 'qtech', 'kgl': 'qtech',
                'rlx': 'qtech', 'red': 'qtech', 'qs': 'qtech', 'ids': 'qtech',
                'tk': 'qtech', 'ds': 'qtech', 'ga': 'qtech', 'evoplay': 'ep'
            };

            const inputProvider = providerCode.toLowerCase().trim();
            const apiProvider = providerMap[inputProvider] || inputProvider;

            // 2. Build Attempt Templates (Provider + GameCode Combinations)
            const attempts: Array<{ provider: string, gamecode: string }> = [];

            if (apiProvider === 'qtech') {
                // QTech Logic: Handle prefixes like GA-crypcrusade
                // If gameCode has prefix (e.g., GA-...), use it.
                // If inputProvider is 'ga' but gameCode is 'crypcrusade', prepend 'GA-'.

                const qtechPrefixMap: Record<string, string> = { 'ga': 'GA', 'gamatron': 'GA' };
                const derivedPrefix = qtechPrefixMap[inputProvider] || '';

                const candidates: string[] = [];
                if (gameCode) {
                    candidates.push(gameCode);
                    if (derivedPrefix && !gameCode.includes('-')) {
                        candidates.push(`${derivedPrefix}-${gameCode}`);
                    }
                } else {
                    // Lobby
                    attempts.push({ provider: 'qtech', gamecode: '' });
                }

                candidates.forEach(gc => attempts.push({ provider: 'qtech', gamecode: gc }));

            } else {
                // Standard Logic
                // Variants for Provider: JILI -> [jl, jili]
                let provVars = [apiProvider];
                if (apiProvider === 'jili' || apiProvider === 'jl') provVars = ['jl', 'jili'];
                if (apiProvider === 'fc') provVars = ['fc'];

                // Variants for GameCode: Try raw, then underscore/hyphen swap
                let gameVars = gameCode ? [gameCode] : [''];
                if (gameCode && gameCode.includes('_')) {
                    gameVars.push(gameCode.replace(/_/g, '-'));
                }

                for (const p of provVars) {
                    for (const g of gameVars) {
                        attempts.push({ provider: p, gamecode: g });
                    }
                }
            }

            // Add Lobby Fallback if specific game fails
            attempts.push({ provider: apiProvider, gamecode: '' });

            // 3. Execution Loop
            for (const attempt of attempts) {
                const params = new URLSearchParams();
                params.append('username', username);
                params.append('provider', attempt.provider);
                if (attempt.gamecode) params.append('game', attempt.gamecode);
                params.append('lang', lang);

                // Use /v4/play/login (Unified endpoint)
                // Note: PHP uses /play/login which handles game specific launching
                try {
                    // console.log(`Attempting Launch: ${attempt.provider} / ${attempt.gamecode}`);
                    const res = await api.post('/v4/play/login', params);
                    if (res.data.status === 'success' && res.data.data && res.data.data.url) {
                        return res.data.data.url;
                    }
                } catch (e) {
                    // Log and continue
                    // console.warn(`Launch failed for ${attempt.provider}/${attempt.gamecode}`);
                }
            }

            return null;

        } catch (error) {
            console.error('Betflix Launch Game Error:', error);
            return null;
        }
    }

    /**
     * Get Play URL (Lobby Legacy Support)
     */
    static async getPlayUrl(username: string): Promise<string | null> {
        return this.launchGame(username, 'all'); // Fallback to 'all' or specific default
    }

    /**
     * Check Connection Status and Latency (Server + Auth)
     */
    static async checkStatus(): Promise<{
        server: { success: boolean; message: string; latency: number };
        auth: { success: boolean; message: string; latency: number };
        config: { apiUrl: string; prefix: string };
    }> {
        const config = await this.getConfig();
        const api = await this.getApi();

        // 1. Check Server Reachability
        const serverStart = Date.now();
        let serverResult = { success: false, message: '', latency: 0 };
        try {
            const res = await api.get('/v4/status');
            serverResult.latency = Date.now() - serverStart;
            if (res.data.status === 'success') {
                serverResult.success = true;
                serverResult.message = 'Online';
            } else {
                serverResult.message = res.data.msg || 'Error';
            }
        } catch (error: any) {
            serverResult.latency = Date.now() - serverStart;
            serverResult.message = error.response?.data?.msg || error.message || 'Unreachable';
        }

        // 2. Check Authorization (Only if server is reachable)
        const authStart = Date.now();
        let authResult = { success: false, message: '', latency: 0 };

        if (serverResult.success) {
            try {
                // Try to check balance for a dummy user to verify Signature/Keys
                const params = new URLSearchParams();
                params.append('username', `${config.prefix}_test_auth`); // Dummy

                const res = await api.post('/v4/user/balance', params);
                authResult.latency = Date.now() - authStart;

                const errorCode = res.data.error_code;
                // Error Codes that mean Auth Failed: 1, 4, 14, 15, 20
                const authFailCodes = [1, 4, 14, 15, 20];

                if (res.data.status === 'success') {
                    authResult.success = true;
                    authResult.message = 'Authorized';
                } else if (authFailCodes.includes(errorCode)) {
                    authResult.success = false;
                    authResult.message = `Auth Failed: ${res.data.msg} (Code ${errorCode})`;
                    if (errorCode === 4) authResult.message = 'IP Not Whitelisted';
                } else {
                    // Other errors (e.g. User not found) imply Auth passed the check
                    authResult.success = true;
                    authResult.message = 'Authorized (Service Error: ' + res.data.msg + ')';
                }
            } catch (error: any) {
                authResult.latency = Date.now() - authStart;
                authResult.message = error.response?.data?.msg || error.message || 'Request Failed';
            }
        } else {
            authResult.message = 'Skipped (Server Unreachable)';
        }

        return {
            server: serverResult,
            auth: authResult,
            config: {
                apiUrl: config.apiUrl,
                prefix: config.prefix
            }
        };
    }
}

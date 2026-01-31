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
     * Register a new user to Betflix
     * @param phone User's phone number
     * @returns The full username returned by Betflix (with agent prefix)
     */
    static async register(phone: string): Promise<{ username: string, password: string } | null> {
        try {
            const config = await this.getConfig();
            const api = await this.getApi();

            // Logic: Prefix + Last 6 digits
            const shortUsername = config.prefix + phone.slice(-6);
            const password = phone; // Use phone as password or valid random string

            const params = new URLSearchParams();
            params.append('username', shortUsername);
            params.append('password', password);

            const res = await api.post('/v4/user/register', params);

            if (res.data.status === 'success' && res.data.data) {
                return {
                    username: res.data.data.username, // Full username from Betflix
                    password: password
                };
            } else {
                console.error('Betflix Register Error:', res.data);
                // If error "Username already exists" (code 2), maybe we should try login or just return null
                if (res.data.error_code === 2) {
                    console.warn('User already exists in Betflix, might need to manually sync or handle.');
                }
                return null;
            }
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
            params.append('amount', amount.toString());
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
     * Get Direct Play URL
     */
    static async getPlayUrl(username: string): Promise<string | null> {
        try {
            const api = await this.getApi();
            const params = new URLSearchParams();
            params.append('username', username);

            const res = await api.post('/v4/play/login', params);

            if (res.data.status === 'success' && res.data.data && res.data.data.url) {
                return res.data.data.url;
            }
            return null;
        } catch (error) {
            console.error('Betflix Play URL Error:', error);
            return null;
        }
    }

    /**
     * Check Connection Status and Latency
     */
    static async checkStatus(): Promise<{ success: boolean; message: string; latency: number }> {
        const start = Date.now();
        try {
            const api = await this.getApi();
            const res = await api.get('/v4/status');
            const latency = Date.now() - start;

            if (res.data.status === 'success') {
                return { success: true, message: 'Connected', latency };
            } else {
                return { success: false, message: res.data.msg || 'Unknown Error', latency };
            }
        } catch (error: any) {
            const latency = Date.now() - start;
            // More detailed info for debugging
            const config = configCache;
            const errorMsg = error.response?.data?.msg || error.message || 'Connection Failed';
            return {
                success: false,
                message: `${errorMsg} (Target: ${config?.apiUrl})`,
                latency
            };
        }
    }
}

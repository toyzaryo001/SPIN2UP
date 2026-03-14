
import axios, { AxiosInstance } from 'axios';
import { IAgentService } from './IAgentService';
import prisma from '../../lib/db';
import crypto from 'crypto';

export class NexusProvider implements IAgentService {
    readonly agentCode = 'NEXUS';
    private api: AxiosInstance | null = null;
    private configCache: any = null;

    constructor() { }

    private async getConfig() {
        if (this.configCache && (Date.now() - this.configCache.timestamp < 60000)) {
            return this.configCache;
        }

        const config = await prisma.agentConfig.findUnique({
            where: { code: this.agentCode }
        });

        if (!config || !config.isActive) {
            throw new Error(`Agent ${this.agentCode} is not active or configured.`);
        }

        this.configCache = {
            ...config,
            timestamp: Date.now()
        };
        return this.configCache;
    }

    private async getApi(): Promise<AxiosInstance> {
        const config = await this.getConfig();
        if (!this.api) {
            // Flexible URL Logic: Check if apiKey is a URL or a Key
            let baseUrl = config.apiKey || 'https://api.nexusggr.com';
            if (baseUrl && !baseUrl.startsWith('http')) {
                console.warn(`[Nexus] Invalid API URL in config (starts with ${baseUrl.substring(0, 5)}...). Using default.`);
                baseUrl = 'https://api.nexusggr.com';
            }

            this.api = axios.create({
                baseURL: baseUrl, // Using validated Base URL
                timeout: 15000,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        return this.api;
    }

    private async request(method: string, data: any = {}) {
        try {
            const config = await this.getConfig();
            const api = await this.getApi();

            const payload = {
                method: method,
                agent_code: config.upline, // upline field acts as agent_code
                agent_token: config.apiSecret, // apiSecret field acts as agent_token
                ...data
            };

            const res = await api.post('/', payload);
            return res.data;
        } catch (error: any) {
            console.error(`Nexus API Error [${method}]:`, error.response?.data || error.message);
            return { status: 0, msg: 'NETWORK_ERROR' };
        }
    }

    async register(userId: number, phone: string): Promise<{ username: string; password?: string; } | null> {
        try {
            const config = await this.getConfig();
            // Generate unique user code. Nexus uses 'user_code'
            // Pattern: prefix + phone (last 10? or full?)
            // Let's use site prefix logic if possible, or just standard format
            const userCode = `${config.upline}_${phone}`; // Simple format: agent_phone

            const res = await this.request('user_create', {
                user_code: userCode
            });

            const status = String(res?.status ?? '');
            const responseCode = String(res?.code ?? '').toUpperCase();
            const responseMessage = String(res?.msg || res?.message || '');

            if (
                status === '1' ||
                responseMessage === 'DUPLICATED_USER' ||
                responseCode === 'DUPLICATED_USER'
            ) {
                return {
                    username: userCode,
                    password: '' // Nexus doesn't seem to require user password for API launch
                };
            }

            console.error('[Nexus] user_create failed:', {
                userCode,
                response: res,
            });

            throw new Error(
                `NEXUS_USER_CREATE_FAILED:${responseCode || status || 'UNKNOWN'}:${responseMessage || 'UNKNOWN'}`
            );

        } catch (e) {
            console.error('Nexus Register Failed', e);
            throw e;
        }
    }

    async getBalance(externalUsername: string): Promise<number> {
        const res = await this.request('money_info', {
            user_code: externalUsername
        });

        if (res.status === 1 && res.user) {
            return parseFloat(res.user.balance || 0);
        }
        return 0;
    }

    async deposit(externalUsername: string, amount: number, refId?: string): Promise<boolean> {
        const res = await this.request('user_deposit', {
            user_code: externalUsername,
            amount: amount,
            agent_sign: refId || Date.now().toString()
        });

        return res.status === 1;
    }

    async withdraw(externalUsername: string, amount: number | 'ALL', refId?: string): Promise<boolean | number> {
        let withdrawAmount = amount;

        if (amount === 'ALL') {
            const balance = await this.getBalance(externalUsername);
            if (balance <= 0) return 0; // Nothing to withdraw
            withdrawAmount = balance;
        }

        const res = await this.request('user_withdraw', {
            user_code: externalUsername,
            amount: withdrawAmount,
            agent_sign: refId || Date.now().toString()
        });

        if (res.status === 1) {
            return typeof amount === 'number' ? true : (withdrawAmount as number);
        }
        return false;
    }

    async launchGame(externalUsername: string, gameCode: string, providerCode: string, lang: string = 'en'): Promise<string | null> {
        // 1. Strip -mix suffix
        let finalProviderCode = providerCode.replace(/-mix$/i, '');

        // 2. Normalize to Uppercase (Nexus requires uppercase codes like PGSOFT, PRAGMATIC)
        finalProviderCode = finalProviderCode.toUpperCase();

        // 3. Specific Mappings
        if (finalProviderCode === 'PG') {
            finalProviderCode = 'PGSOFT';
        } else if (['PRAGMATICLIVE', 'PP_LIVE_PRO', 'PRAGMATIC'].includes(finalProviderCode)) {
            finalProviderCode = 'PP'; // Both Betflix and Nexus actually use 'PP' for Pragmatic
        } else if (['SA', 'SAGAMING'].includes(finalProviderCode)) {
            finalProviderCode = 'SA'; // SA Gaming
        } else if (['SEXY', 'SEXYGAMING', 'AE', 'AEGAMING'].includes(finalProviderCode)) {
            finalProviderCode = 'SEXY'; // Sexy Baccarat
        } else if (['WM', 'WMCASINO'].includes(finalProviderCode)) {
            finalProviderCode = 'WM'; // WM Casino
        } else if (['DG', 'DREAMGAMING'].includes(finalProviderCode)) {
            finalProviderCode = 'DG'; // Dream Gaming
        }

        // 4. Clean Game Code (Strip provider prefix if present)
        // Nexus often expects raw game codes (e.g. "medusa") not "pgsoft-medusa"
        let finalGameCode = gameCode;
        const prefixes = [
            `${finalProviderCode.toLowerCase()}-`, // pgsoft-
            `${finalProviderCode.toLowerCase()}_`, // pgsoft_
            'pg-', 'pp-', 'joker-', 'jili-', 'fc-', 'ka-', 'amb-' // Common short codes
        ];

        for (const prefix of prefixes) {
            if (finalGameCode.toLowerCase().startsWith(prefix)) {
                finalGameCode = finalGameCode.substring(prefix.length);
                break;
            }
        }

        console.log(`[Nexus] Launching: Provider=${finalProviderCode}, Game=${finalGameCode} (Original=${gameCode}), User=${externalUsername}`);

        const res = await this.request('game_launch', {
            user_code: externalUsername,
            provider_code: finalProviderCode,
            game_code: finalGameCode,
            lang: lang
        });

        if (res.status === 1 && res.launch_url) {
            let finalUrl = res.launch_url;

            // Validate protocol
            if (finalUrl && !finalUrl.startsWith('http')) {
                finalUrl = `https://${finalUrl}`;
            }

            // Domain Replacement Logic (Optional, if Game Entrance is configured)
            try {
                const config = await this.getConfig();
                if (config.gameEntrance) {
                    const urlObj = new URL(finalUrl);
                    let entranceHost = config.gameEntrance;
                    if (!entranceHost.startsWith('http')) {
                        entranceHost = `https://${entranceHost}`;
                    }
                    const entranceObj = new URL(entranceHost);

                    // Replace hostname
                    urlObj.hostname = entranceObj.hostname;
                    urlObj.protocol = entranceObj.protocol;

                    finalUrl = urlObj.toString();
                }
            } catch (e) {
                console.error('[Nexus] Error replacing launch URL domain:', e);
            }

            return finalUrl;
        }

        // Throw Error with Message (Fixes 500 Generic Error)
        throw new Error(res.msg || res.message || 'NEXUS_LAUNCH_FAILED');
    }

    async checkStatus(): Promise<boolean> {
        // Nexus doesn't have a direct ping, try getting provider list
        const res = await this.request('provider_list');
        return res.status === 1;
    }

    async getAgentBalance(): Promise<number> {
        const res = await this.request('money_info');
        if (res.status === 1 && res.agent) {
            return parseFloat(res.agent.balance || 0);
        }
        return 0;
    }

    async getGameProviders(): Promise<any[]> {
        const res = await this.request('provider_list');
        console.log('Nexus Provider List Response:', JSON.stringify(res)); // Debug Log
        if (res.status === 1 && Array.isArray(res.providers)) {
            return res.providers;
        }
        return [];
    }

    async getGames(providerCode: string): Promise<any[]> {
        const res = await this.request('game_list', { provider_code: providerCode });
        if (res.status === 1 && Array.isArray(res.games)) {
            return res.games;
        }
        return [];
    }

    /**
     * Get Game Log for a user (aggregated summary)
     * Nexus returns individual bet records — we sum them up
     * @param userCode External username on Nexus
     * @param start Start datetime "YYYY-MM-DD HH:mm:ss"
     * @param end End datetime "YYYY-MM-DD HH:mm:ss"
     */
    async getGameLog(userCode: string, start: string, end: string): Promise<{ totalBet: number; totalWin: number; count: number } | null> {
        try {
            let totalBet = 0;
            let totalWin = 0;
            let count = 0;
            let page = 0;
            const perPage = 1000;
            let hasMore = true;

            while (hasMore) {
                const res = await this.request('get_game_log', {
                    user_code: userCode,
                    game_type: 'slot',
                    start,
                    end,
                    page,
                    perPage,
                });

                if (res.status !== 1 || !res.slot) {
                    // If first page fails, return null
                    if (page === 0) return null;
                    break;
                }

                const records: any[] = res.slot || [];
                for (const r of records) {
                    // txn_type: debit (bet only), credit (win only), debit_credit (both)
                    if (r.txn_type === 'debit') {
                        totalBet += Number(r.bet_money || 0);
                    } else if (r.txn_type === 'credit') {
                        totalWin += Number(r.win_money || 0);
                    } else {
                        // debit_credit — both valid
                        totalBet += Number(r.bet_money || 0);
                        totalWin += Number(r.win_money || 0);
                    }
                    count++;
                }

                // Check if we need more pages
                const totalCount = res.total_count || 0;
                if ((page + 1) * perPage >= totalCount || records.length < perPage) {
                    hasMore = false;
                } else {
                    page++;
                }
            }

            return { totalBet, totalWin, count };
        } catch (error: any) {
            console.error(`[Nexus] getGameLog error for ${userCode}:`, error.message);
            return null;
        }
    }

    async debug(): Promise<any> {
        return await this.request('provider_list');
    }
}

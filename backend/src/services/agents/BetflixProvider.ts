import axios, { AxiosInstance } from 'axios';
import { IAgentService } from './IAgentService';
import prisma from '../../lib/db';
import { BetflixService } from '../betflix.service';

export class BetflixProvider implements IAgentService {
    readonly agentCode = 'BETFLIX';
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

        // Fallback or Error if not found
        if (!config) {
            // Try to find default if code lookup fails (migration safety)
            const defaultConfig = await prisma.agentConfig.findFirst({ orderBy: { id: 'asc' } });
            if (!defaultConfig) throw new Error('Betflix Agent Config not found');
            return { ...defaultConfig, timestamp: Date.now() };
        }

        // Get Site Prefix from Settings
        const siteSetting = await prisma.setting.findUnique({ where: { key: 'prefix' } });
        const sitePrefix = siteSetting ? siteSetting.value : (process.env.BETFLIX_USER_PREFIX || 'CHKK');

        this.configCache = {
            apiUrl: config.apiKey || 'https://api.bfx.fail',
            apiKey: config.xApiKey || '',
            apiCat: config.xApiCat || '',
            prefix: config.upline || 'be31kk',
            sitePrefix: sitePrefix,
            gameEntrance: config.gameEntrance || 'game.bfl88.com',
            timestamp: Date.now()
        };

        return this.configCache;
    }

    private async getApi(): Promise<AxiosInstance> {
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

    private async applyPrefix(userCode: string): Promise<string> {
        const config = await this.getConfig();
        let raw = userCode.trim();
        if (!raw) return raw;

        if (/^CK\d{6,8}$/i.test(raw)) return raw;

        const fullPrefix = (config.prefix + config.sitePrefix).toLowerCase();
        if (raw.toLowerCase().startsWith(fullPrefix)) return raw;

        const phoneMatch = raw.replace(/\D/g, '').match(/(\d{6})$/);
        if (phoneMatch) raw = phoneMatch[1];

        return config.prefix + config.sitePrefix + raw;
    }

    async register(userId: number, phone: string): Promise<{ username: string; password?: string; } | null> {
        try {
            const config = await this.getConfig();
            const api = await this.getApi();
            const phoneDigits = phone.replace(/\D/g, '');
            const variants: string[] = [];

            // Logic from original service
            if (phoneDigits.length >= 6) {
                variants.push(config.prefix + config.sitePrefix + phoneDigits.slice(-6));
            }
            variants.push(config.prefix + config.sitePrefix + phoneDigits);
            if (phoneDigits.length >= 6) {
                variants.push(config.prefix + phoneDigits.slice(-6));
            }

            const password = phoneDigits;

            for (const username of variants) {
                if (!username || username.length > 20) continue;

                const params = new URLSearchParams();
                params.append('username', username);
                params.append('password', password);

                try {
                    const res = await api.post('/v4/user/register', params);
                    if (res.data.status === 'success' || res.data.status === 1 || res.data.error_code === 0) {
                        return { username: res.data.data?.username || username, password };
                    }

                    const msg = (res.data.msg || res.data.message || '').toLowerCase();
                    if (msg.includes('exist') || msg.includes('duplicate') || msg.includes('already')) {
                        return { username, password };
                    }
                } catch (e) {
                    continue;
                }
            }
            return null;
        } catch (e) {
            console.error('Betflix Register Error:', e);
            return null;
        }
    }

    async getBalance(externalUsername: string): Promise<number> {
        try {
            const api = await this.getApi();
            const params = new URLSearchParams();
            const apiUser = await this.applyPrefix(externalUsername);
            params.append('username', apiUser);

            const res = await api.post('/v4/user/balance', params);
            if (res.data.status === 'success' && res.data.data) {
                return parseFloat(res.data.data.balance || '0');
            }
            return 0;
        } catch (e) {
            return 0;
        }
    }

    async deposit(externalUsername: string, amount: number, refId?: string): Promise<boolean> {
        return this.transfer(externalUsername, amount, refId);
    }

    async withdraw(externalUsername: string, amount: number | 'ALL', refId?: string): Promise<boolean | number> {
        let withdrawAmount = amount;
        if (amount === 'ALL') {
            const balance = await this.getBalance(externalUsername);
            if (balance <= 0) return 0;
            withdrawAmount = balance;
        }

        const success = await this.transfer(externalUsername, -(withdrawAmount as number), refId);
        return success ? (typeof amount === 'number' ? true : (withdrawAmount as number)) : false;
    }

    private async transfer(username: string, amount: number, ref: string = ''): Promise<boolean> {
        try {
            const api = await this.getApi();
            const params = new URLSearchParams();
            const apiUser = await this.applyPrefix(username);
            params.append('username', apiUser);
            params.append('amount', amount.toString());
            params.append('ref', ref || Date.now().toString());

            const res = await api.post('/v4/user/transfer', params);
            return res.data.status === 'success';
        } catch (e) {
            console.error('Betflix Transfer Error:', e);
            return false;
        }
    }

    async launchGame(externalUsername: string, gameCode: string, providerCode: string, lang: string = 'en'): Promise<string | null> {
        try {
            const config = await this.getConfig();
            const apiUser = await this.applyPrefix(externalUsername);
            const gameProvider = config.gameEntrance ? `${config.gameEntrance}/${providerCode}` : providerCode;

            const url = `${config.apiUrl}/play.php?`;
            const params = new URLSearchParams();
            params.append('username', apiUser);
            params.append('provider', gameProvider);
            params.append('code', gameCode);
            params.append('lang', lang);

            return url + params.toString();
        } catch (e) {
            return null;
        }
    }

    async checkStatus(): Promise<any> {
        return await BetflixService.checkStatus();
    }

    async getAgentBalance(): Promise<number> {
        return await BetflixService.getAgentBalance();
    }

    async getGameProviders(): Promise<any[]> {
        try {
            const api = await this.getApi();
            const res = await api.get('/v4/game/camps');
            if (res.data.status === 'success' || res.data.status === 1) {
                return res.data.data || [];
            }
            return [];
        } catch (e) {
            console.error('Betflix Get Providers Error', e);
            return [];
        }
    }

    async getGames(providerCode: string): Promise<any[]> {
        // Betflix doesn't support get games list easily
        return [];
    }

    async debug(): Promise<any> {
        return await BetflixService.checkStatus();
    }
}

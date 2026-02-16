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
            this.api = axios.create({
                baseURL: config.apiKey || 'https://api.nexusggr.com', // Using apiKey field as Base URL
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

            if (res.status === 1 || res.msg === 'DUPLICATED_USER') {
                return {
                    username: userCode,
                    password: '' // Nexus doesn't seem to require user password for API launch
                };
            }
            return null;
        } catch (e) {
            console.error('Nexus Register Failed', e);
            return null;
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
        const res = await this.request('game_launch', {
            user_code: externalUsername,
            provider_code: providerCode,
            game_code: gameCode,
            lang: lang
        });

        if (res.status === 1 && res.launch_url) {
            return res.launch_url;
        }
        return null;
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
}

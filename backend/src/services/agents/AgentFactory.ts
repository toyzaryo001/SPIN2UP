import { IAgentService } from './IAgentService';
import { BetflixProvider } from './BetflixProvider';
import { NexusProvider } from './NexusProvider';
import prisma from '../../lib/db';

export class AgentFactory {
    private static instances: Map<string, IAgentService> = new Map();

    static async getAgent(agentCode: string): Promise<IAgentService> {
        const code = agentCode.toUpperCase();

        if (this.instances.has(code)) {
            return this.instances.get(code)!;
        }

        let service: IAgentService;
        switch (code) {
            case 'BETFLIX':
                service = new BetflixProvider();
                break;
            case 'NEXUS':
                service = new NexusProvider();
                break;
            default:
                // Attempt fallback to Betflix if it looks like old config? 
                // Or throw error
                throw new Error(`Unknown Agent Code: ${code}`);
        }

        this.instances.set(code, service);
        return service;
    }

    static async getAgentById(agentId: number): Promise<IAgentService> {
        const config = await prisma.agentConfig.findUnique({
            where: { id: agentId }
        });

        if (!config) throw new Error(`Agent ID ${agentId} not found`);
        return this.getAgent(config.code);
    }

    static async getMainAgent(): Promise<IAgentService> {
        const config = await prisma.agentConfig.findFirst({
            where: { isMain: true, isActive: true }
        });

        if (!config) {
            // Fallback to BETFLIX
            return this.getAgent('BETFLIX');
        }

        return this.getAgent(config.code);
    }

    static clearCache(agentCode?: string) {
        if (agentCode) {
            this.instances.delete(agentCode.toUpperCase());
        } else {
            this.instances.clear();
        }
    }
}

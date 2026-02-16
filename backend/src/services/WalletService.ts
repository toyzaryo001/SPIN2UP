import prisma from '../lib/db';
import { AgentFactory } from './agents/AgentFactory';

export class WalletService {

    /**
     * Launch Game with Auto-Swap Logic
     */
    static async launchGame(userId: number, gameId: number, lang: string = 'en') {
        // 1. Get Game Info
        const game = await prisma.game.findUnique({
            where: { id: gameId },
            include: { provider: true, agent: true }
        });

        if (!game) throw new Error('Game not found');

        // 2. Determine Target Agent
        // Priority: Game-specific Agent -> Provider Default Agent -> Main Agent
        let targetAgentId = game.agentId;
        if (!targetAgentId && game.provider?.defaultAgentId) {
            targetAgentId = game.provider.defaultAgentId;
        }

        let targetAgentConfig;
        if (targetAgentId) {
            targetAgentConfig = await prisma.agentConfig.findUnique({ where: { id: targetAgentId } });
        } else {
            targetAgentConfig = await prisma.agentConfig.findFirst({ where: { isMain: true } });
        }

        if (!targetAgentConfig) throw new Error('Target Agent Config not found');
        const targetAgentService = await AgentFactory.getAgent(targetAgentConfig.code);

        // 3. Check User State & Swap if needed
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { externalAccounts: true }
        });
        if (!user) throw new Error('User not found');

        let currentAgentId = user.lastActiveAgentId;

        // Ensure Target Account Exists
        let targetAccount = user.externalAccounts.find(a => a.agentId === targetAgentConfig!.id);
        if (!targetAccount) {
            // Register if not exists
            const creds = await targetAgentService.register(user.id, user.phone);
            if (!creds) throw new Error('Failed to register user on target agent');

            targetAccount = await prisma.userExternalAccount.create({
                data: {
                    userId: user.id,
                    agentId: targetAgentConfig.id,
                    externalUsername: creds.username,
                    externalPassword: creds.password || '',
                }
            });
        }

        // SWAP LOGIC
        if (currentAgentId && currentAgentId !== targetAgentConfig.id) {
            console.log(`[WalletSwap] User ${userId} moving from Agent ${currentAgentId} to ${targetAgentConfig.id}`);

            // A. Withdraw from Source
            try {
                const sourceAgentService = await AgentFactory.getAgentById(currentAgentId);
                const sourceAccount = await prisma.userExternalAccount.findUnique({
                    where: { userId_agentId: { userId: user.id, agentId: currentAgentId } }
                });

                if (sourceAccount) {
                    const amount = await sourceAgentService.withdraw(sourceAccount.externalUsername, 'ALL');
                    const withdrawnAmount = typeof amount === 'number' ? amount : 0;

                    if (withdrawnAmount > 0) {
                        console.log(`[WalletSwap] Withdrew ${withdrawnAmount} from Source`);
                        // B. Deposit to Target
                        const success = await targetAgentService.deposit(targetAccount.externalUsername, withdrawnAmount);
                        if (!success) {
                            console.error('[CRITICAL] Deposit failed during swap! Money is stranded!');
                            // TODO: Implement refund or manual check log
                        } else {
                            console.log(`[WalletSwap] Deposited ${withdrawnAmount} to Target`);
                        }
                    }
                }
            } catch (e) {
                console.error('[WalletSwap] Error during swap:', e);
                // Allow to proceed? Or block?
                // If withdraw failed, money is still safely in source.
                // But user might want to play empty handed? Usually better to fail safely.
            }
        }

        // Update Last Active Agent
        if (user.lastActiveAgentId !== targetAgentConfig.id) {
            await prisma.user.update({
                where: { id: user.id },
                data: { lastActiveAgentId: targetAgentConfig.id }
            });
        }

        // 4. Launch
        const url = await targetAgentService.launchGame(
            targetAccount.externalUsername,
            game.slug, // Or game.code? Need to check game schema mapping
            game.provider?.slug || '', // Provider code
            lang
        );

        return url;
    }
}

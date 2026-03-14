import { AgentWalletService } from './agent-wallet.service.js';

export class WalletService {
    static async launchGame(userId: number, gameId: number, lang: string = 'th') {
        const result = await AgentWalletService.prepareLaunch({
            userId,
            gameId,
            lang,
        });

        return result.url;
    }
}

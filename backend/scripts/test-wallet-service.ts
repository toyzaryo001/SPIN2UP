
import { WalletService } from '../src/services/WalletService';
import prisma from '../src/lib/db';

async function main() {
    console.log('Testing WalletService...');
    try {
        const game = await prisma.game.findFirst({ where: { isActive: true } });
        if (!game) {
            console.log('No games found.');
            return;
        }
        console.log(`Found Game: ${game.slug}`);

        // Mock user (assuming ID 1 exists, or find one)
        const user = await prisma.user.findFirst();
        if (!user) {
            console.log('No user found.');
            return;
        }

        console.log('Attempting dry-run launch (might fail if agent not config, but checks imports)...');
        // We expect this might fail with "Config not found" or something, but we want to see if it CRASHES the process (500)
        await WalletService.launchGame(user.id, game.id, 'th');

    } catch (e: any) {
        console.error('Caught Execption:', e.message);
        if (e.message.includes('Config') || e.message.includes('API')) {
            console.log('✅ WalletService imports are fine, logic ran until config/api check.');
        } else {
            console.log('❌ Unexpected Error:', e);
        }
    }
}

main().catch(console.error).finally(async () => {
    await prisma.$disconnect();
});

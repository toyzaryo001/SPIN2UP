
import prisma from '../src/lib/db.js';

async function checkCasinoGames() {
    console.log("Checking Casino Games (DG, WM, SA)...");
    const providers = ['dg', 'wm', 'sa'];

    for (const code of providers) {
        const provider = await prisma.gameProvider.findFirst({
            where: { slug: code }
        });

        if (!provider) {
            console.log(`❌ Provider not found: ${code}`);
            continue;
        }

        const games = await prisma.game.findMany({
            where: { providerId: provider.id }
        });

        console.log(`✅ Provider: ${code} (ID: ${provider.id}) - Found ${games.length} games`);
        games.forEach(g => console.log(`   - [${g.slug}] ${g.name}`));
    }

    await prisma.$disconnect();
}

checkCasinoGames();

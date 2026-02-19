
import prisma from '../src/lib/db.js';

async function seedCasinoGames() {
    console.log("Seeding Casino Lobby Games...");

    const casinoProviders = [
        { code: 'dg', name: 'Dream Gaming', gameCode: 'dg-lobby', gameName: 'DG Casino Lobby' },
        { code: 'wm', name: 'WM Casino', gameCode: 'wm-lobby', gameName: 'WM Casino Lobby' },
        { code: 'sa', name: 'SA Gaming', gameCode: 'sa-lobby', gameName: 'SA Gaming Lobby' },
        { code: 'sexy', name: 'Sexy Baccarat', gameCode: 'sexy-lobby', gameName: 'Sexy Baccarat Lobby' }
    ];

    for (const p of casinoProviders) {
        // 1. Find Provider
        let provider = await prisma.gameProvider.findFirst({
            where: { slug: p.code }
        });

        if (!provider) {
            console.log(`⚠️ Provider ${p.code} not found. Creating...`);
            // Find or create 'Casino' category first
            let category = await prisma.gameCategory.findFirst({ where: { name: 'Casino' } });
            if (!category) {
                category = await prisma.gameCategory.create({ data: { name: 'Casino', slug: 'casino', isActive: true } });
            }

            provider = await prisma.gameProvider.create({
                data: {
                    name: p.name,
                    slug: p.code,
                    categoryId: category.id,
                    isActive: true
                }
            });
        }

        // 2. Find or Create Game
        const game = await prisma.game.findUnique({
            where: { slug: p.gameCode }
        });

        if (!game) {
            console.log(`➕ Creating game: ${p.gameName} (${p.gameCode})`);
            await prisma.game.create({
                data: {
                    name: p.gameName,
                    slug: p.gameCode,
                    providerId: provider.id,
                    isActive: true,
                    isHot: true,
                    thumbnail: `https://ui-avatars.com/api/?name=${p.code}&background=random` // Placeholder
                }
            });
        } else {
            console.log(`✅ Game exists: ${p.gameName}`);
        }
    }

    console.log("Seeding Complete!");
    await prisma.$disconnect();
}

seedCasinoGames();

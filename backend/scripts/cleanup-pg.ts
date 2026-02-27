import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const normalizeStr = (str: string) => str.toLowerCase().replace(/[\s\-_'’]/g, '');

const aliases: Record<string, string> = {
    'medusa': 'medusa1thecurseofathena',
    'vampirescharm': 'vampirescharm',
    'guardiansoficefire': 'guardiansoficeandfire',
    'sharkhunter': 'sharkbounty',
    'museumwonders': 'museummystery',
    'mrtreasuresfortune': 'mrtreasuresfortune',
};

const getBaseName = (name: string) => {
    let norm = normalizeStr(name);
    norm = norm.replace(/&/g, 'and');
    return aliases[norm] || norm;
};

async function main() {
    const provider = await prisma.gameProvider.findFirst({
        where: { name: 'PG-SLOT' },
        include: { games: { orderBy: { id: 'asc' } } }
    });

    if (!provider) {
        console.log("Not found");
        return;
    }

    console.log(`Initial Total: ${provider.games.length}`);

    const baseNameMap = new Map<string, number>(); // Name -> Game ID (to keep)
    const toDelete: number[] = [];
    const deleteNames: string[] = [];

    for (const g of provider.games) {
        const base = getBaseName(g.name);

        if (baseNameMap.has(base)) {
            // It's a duplicate. We keep the first one we saw, delete the current one
            toDelete.push(g.id);
            deleteNames.push(g.name);
        } else {
            baseNameMap.set(base, g.id);
        }
    }

    console.log(`Found ${toDelete.length} duplicates to remove:`);
    deleteNames.forEach(n => console.log(' - Delete: ' + n));

    if (toDelete.length > 0) {
        await prisma.game.deleteMany({
            where: { id: { in: toDelete } }
        });
        console.log(`\n✅ Deleted ${toDelete.length} duplicates from the database.`);
        console.log(`New PG-SLOT game count: ${provider.games.length - toDelete.length}`);
    } else {
        console.log("No duplicates found to delete.");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());

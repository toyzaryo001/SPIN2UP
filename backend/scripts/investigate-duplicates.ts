import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const normalizeStr = (str: string) => {
    let s = str.toLowerCase().replace(/[\s\-_]/g, '');
    return s;
};

// Known Aliases mapping (Normalized Alias -> Normalized Original)
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
    console.log("--- Fetching Games from PG-SLOT ---");

    // Fetch all games in PG-SLOT (assuming it's a provider, we search by slug or name)
    const provider = await prisma.gameProvider.findFirst({
        where: { name: 'PG-SLOT' }, // or slug: 'pg-slot'
        include: { games: true }
    });

    if (!provider) {
        console.log("Provider PG-SLOT not found");
        return;
    }

    console.log(`Total games in PG-SLOT: ${provider.games.length}`);

    // Let's find any duplicates inside this provider
    const gameNames = new Set<string>();
    const dupes: any[] = [];
    const baseNameMap = new Map<string, string>(); // baseName -> original name

    for (const g of provider.games) {
        const base = getBaseName(g.name);
        if (gameNames.has(base)) {
            dupes.push({ name: g.name, matchedWith: baseNameMap.get(base), baseName: base });
        } else {
            gameNames.add(base);
            baseNameMap.set(base, g.name);
        }
    }

    console.log(`\nFound ${dupes.length} duplicates inside PG-SLOT:`);
    dupes.forEach(d => {
        console.log(` - "${d.name}" clashes with "${d.matchedWith}" (Base: ${d.baseName})`);
    });

    // Also let's print games that might have slipped through
    // Group all games by the first 5 letters of normalized name to catch similar names
    const fuzzyMap = new Map<string, string[]>();
    for (const g of provider.games) {
        const simple = normalizeStr(g.name).substring(0, 8);
        if (!fuzzyMap.has(simple)) {
            fuzzyMap.set(simple, []);
        }
        fuzzyMap.get(simple)!.push(g.name);
    }

    console.log(`\nPotential similar names (first 8 chars match):`);
    for (const [key, names] of fuzzyMap.entries()) {
        if (names.length > 1) {
            console.log(` - Group [${key}]: ${names.join(' | ')}`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

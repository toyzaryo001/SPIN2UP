import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const normalizeStr = (str: string) => str.toLowerCase().replace(/[\s\-_]/g, '');

async function main() {
    console.log("--- Fetching Games ---");

    // Fetch Betflix PG Games (ID 18)
    const betflixGames = await prisma.game.findMany({
        where: { providerId: 18 }
    });
    console.log(`Betflix PG (ID 18) total games: ${betflixGames.length}`);

    // Fetch Nexus PG SOFT Games (ID 87)
    const nexusGames = await prisma.game.findMany({
        where: { providerId: 87 }
    });
    console.log(`Nexus PG SOFT (ID 87) total games: ${nexusGames.length}\n`);

    // Create a Set of normalized Betflix game names for fast lookup
    const betflixNames = new Set(betflixGames.map(g => normalizeStr(g.name)));

    let duplicateCount = 0;
    const missingInBetflix: any[] = [];

    // Check how many Nexus games exist in Betflix
    for (const nGame of nexusGames) {
        const normalizedName = normalizeStr(nGame.name);
        if (betflixNames.has(normalizedName)) {
            duplicateCount++;
        } else {
            missingInBetflix.push(nGame.name);
        }
    }

    console.log(`--- Duplicate Analysis ---`);
    console.log(`จำนวนเกมของ Nexus ที่มีชื่อซ้ำกับฝั่ง Betflix อย่างคล้ายคลึง (Fuzzy Match): ${duplicateCount} เกม`);
    console.log(`จำนวนเกมของ Nexus ที่ไม่เจอในฝั่ง Betflix เลย: ${missingInBetflix.length} เกม`);

    if (missingInBetflix.length > 0) {
        console.log(`\nรายชื่อเกมที่อยู่ฝั่ง Nexus แต่ไม่อยู่ใน Betflix:`);
        missingInBetflix.forEach((name, i) => console.log(`  ${i + 1}. ${name}`));
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

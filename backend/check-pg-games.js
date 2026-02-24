const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
    // Find PG provider
    const providers = await p.gameProvider.findMany({
        where: {
            OR: [
                { slug: { contains: 'pg', mode: 'insensitive' } },
                { name: { contains: 'PG', mode: 'insensitive' } },
                { name: { contains: 'PGSOFT', mode: 'insensitive' } },
            ]
        }
    });

    console.log('=== PG Providers Found ===');
    providers.forEach(pr => console.log(`ID:${pr.id} | Name:${pr.name} | Slug:${pr.slug}`));

    for (const prov of providers) {
        const games = await p.game.findMany({
            where: { providerId: prov.id },
            select: { id: true, name: true, slug: true, isActive: true },
            orderBy: { name: 'asc' }
        });

        console.log(`\n=== ${prov.name} (${prov.slug}) - Total: ${games.length} games ===`);
        games.forEach(g => console.log(`${g.id}|${g.name}|${g.slug}|${g.isActive ? 'ON' : 'OFF'}`));

        // Find similar names
        console.log('\n=== POTENTIAL DUPLICATES ===');
        const found = [];
        for (let i = 0; i < games.length; i++) {
            for (let j = i + 1; j < games.length; j++) {
                const a = games[i].name.toLowerCase().replace(/[^a-z0-9]/g, '');
                const b = games[j].name.toLowerCase().replace(/[^a-z0-9]/g, '');
                // Check similarity: same after stripping special chars, or one contains the other
                if (a === b || a.includes(b) || b.includes(a) || levenshtein(a, b) <= 3) {
                    console.log(`  SIMILAR: [ID:${games[i].id}] "${games[i].name}" (${games[i].slug})  <-->  [ID:${games[j].id}] "${games[j].name}" (${games[j].slug})`);
                    found.push({ a: games[i], b: games[j] });
                }
            }
        }
        if (found.length === 0) console.log('  No duplicates found');
        else console.log(`\n  Found ${found.length} potential duplicate pairs`);
    }

    await p.$disconnect();
})();

// Simple Levenshtein distance
function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)
            );
        }
    }
    return dp[m][n];
}

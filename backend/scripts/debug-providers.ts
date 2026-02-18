
import prisma from '../src/lib/db.js';

async function main() {
    const providers = await prisma.gameProvider.findMany({
        select: { id: true, name: true, defaultAgentId: true, _count: { select: { games: true } } }
    });
    console.log('Total Providers:', providers.length);
    console.table(providers.map(p => ({
        id: p.id,
        name: p.name,
        agentId: p.defaultAgentId ?? 'NULL',
        games: p._count.games
    })));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

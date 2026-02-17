import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- Agent Configs ---');
    const agents = await prisma.agentConfig.findMany();
    console.log(JSON.stringify(agents, null, 2));

    console.log('\n--- Game Counts by AgentId ---');
    const games = await prisma.game.groupBy({
        by: ['agentId'],
        _count: {
            id: true
        }
    });
    // Map null to "null" string for visibility
    const formatted = games.map(g => ({
        agentId: g.agentId === null ? "NULL (Default)" : g.agentId,
        count: g._count.id
    }));
    console.log(JSON.stringify(formatted, null, 2));

    console.log('\n--- Sample Games (AgentId = NULL) ---');
    const nullAgentGames = await prisma.game.findMany({
        where: { agentId: null },
        take: 5,
        select: { id: true, name: true, slug: true, provider: { select: { slug: true } } }
    });
    console.log(JSON.stringify(nullAgentGames, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

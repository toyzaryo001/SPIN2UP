
import prisma from '../src/lib/db';

async function main() {
    console.log('--- Inspecting Games with Specific Agents ---');
    const games = await prisma.game.findMany({
        where: {
            agentId: { not: null }
        },
        include: {
            provider: true,
            agent: true
        },
        take: 10
    });

    console.log(`Found ${games.length} games with assigned Agent.`);

    for (const g of games) {
        console.log(`Game: ${g.slug} | Provider: ${g.provider?.slug} | Agent: ${g.agent?.code} | Upstream: ${(g as any).upstreamProviderCode}`);
    }

    console.log('\n--- Inspecting Providers ---');
    const providers = await prisma.gameProvider.findMany();
    console.log('Providers:', providers.map(p => `${p.name} (${p.slug})`).join(', '));
}

main().catch(console.error).finally(() => prisma.$disconnect());

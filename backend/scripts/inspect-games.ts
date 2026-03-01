
import prisma from '../src/lib/db';

// Injected for Debug Scripts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });


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

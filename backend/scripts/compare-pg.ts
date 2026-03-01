import { PrismaClient } from '@prisma/client';

// Injected for Debug Scripts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });


const prisma = new PrismaClient();

async function main() {
    console.log("--- Loading Data ---");
    const agents = await prisma.agentConfig.findMany();
    console.log("Agents:");
    agents.forEach(a => console.log(` - ID: ${a.id} | Code: ${a.code} | Name: ${a.name}`));

    const pgProviders = await prisma.gameProvider.findMany({
        where: {
            name: { contains: 'PG', mode: 'insensitive' }
        },
        include: {
            games: {
                select: { id: true, name: true, slug: true, agentId: true, isActive: true }
            }
        }
    });

    console.log("\n--- PG Providers Analysis ---");
    for (const p of pgProviders) {
        console.log(`\nProvider: ${p.name} (Slug: ${p.slug}, ID: ${p.id})`);

        // Match with agents
        let defaultAgentName = "Unknown";
        if (p.defaultAgentId) {
            const agent = agents.find(a => a.id === p.defaultAgentId);
            defaultAgentName = agent ? `${agent.code} (${agent.name})` : String(p.defaultAgentId);
        } else {
            defaultAgentName = "Main Agent / None";
        }
        console.log(`Default Agent: ${defaultAgentName}`);

        const activeGames = p.games.filter(g => g.isActive);
        console.log(`Total Games: ${p.games.length} | Active Games: ${activeGames.length}`);

        const agentCounts: Record<string, number> = {};
        for (const g of p.games) {
            const targetAgentId = g.agentId || p.defaultAgentId || 0;
            const targetAgent = agents.find(a => a.id === targetAgentId);
            const agentName = targetAgent ? targetAgent.code : "Master/Main";
            agentCounts[agentName] = (agentCounts[agentName] || 0) + 1;
        }

        console.log("Games distributed by Agent Code:", agentCounts);

        // Print some sample games
        console.log("Sample games:", p.games.slice(0, 3).map(g => g.name).join(", "));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());

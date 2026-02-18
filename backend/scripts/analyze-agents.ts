
import prisma from '../src/lib/db.js';

async function analyzeAgents() {
    console.log("Analyze Agents & Games...");

    try {
        // 1. Get All Agents
        const agents = await prisma.agentConfig.findMany();
        console.log("Agents found:", agents);

        // 2. Count Games per Agent
        const gameCounts = await prisma.game.groupBy({
            by: ['agentId'],
            _count: { id: true }
        });
        console.log("Games distribution:", gameCounts);

        // 3. Check Provider Default Agents
        const providerDefaults = await prisma.gameProvider.findMany({
            where: { defaultAgentId: { not: null } },
            select: { name: true, defaultAgentId: true }
        });
        console.log("Provider Default Agents:", providerDefaults);

    } catch (error) {
        console.error("❌ Analysis Failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

analyzeAgents();


import prisma from '../src/lib/db.js';

async function testProviders() {
    console.log("Testing GET /admin/providers...");

    try {
        // Case 1: No params
        console.log("1. Fetching ALL providers...");
        const all = await prisma.gameProvider.findMany({
            where: {},
            include: { _count: { select: { games: true } } }
        });
        console.log(`   Success. Count: ${all.length}`);

        // Case 2: Filter by Agent = null (Nexus)
        console.log("2. Fetching Nexus providers (agentId: null)...");
        const nexus = await prisma.gameProvider.findMany({
            where: { games: { some: { agentId: null } } },
            include: { _count: { select: { games: true } } }
        });
        console.log(`   Success. Count: ${nexus.length}`);

        // Case 3: Filter by invalid Agent
        console.log("3. Fetching Invalid Agent providers...");
        const invalid = await prisma.gameProvider.findMany({
            where: { games: { some: { agentId: 999999 } } },
            include: { _count: { select: { games: true } } }
        });
        console.log(`   Success. Count: ${invalid.length}`);

    } catch (error) {
        console.error("❌ API Simulation Failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

testProviders();

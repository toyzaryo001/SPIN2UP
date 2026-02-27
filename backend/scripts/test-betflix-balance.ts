import { BetflixProvider } from '../src/services/agents/BetflixProvider';
import prisma from '../src/lib/db';

async function test() {
    const provider = new BetflixProvider();
    const phoneBase = '0642938073';

    console.log("Testing balance for:", phoneBase);

    // Test base
    let bal1 = await provider.getBalance(phoneBase);
    console.log(`Balance for ${phoneBase} (applyPrefix will modify this internally):`, bal1);

}
test().finally(() => void prisma.$disconnect());

import { BetflixProvider } from '../src/services/agents/BetflixProvider';
import prisma from '../src/lib/db';

// Injected for Debug Scripts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });


async function test() {
    const provider = new BetflixProvider();
    const phoneBase = '0642938073';

    console.log("Testing balance for:", phoneBase);

    // Test base
    let bal1 = await provider.getBalance(phoneBase);
    console.log(`Balance for ${phoneBase} (applyPrefix will modify this internally):`, bal1);

}
test().finally(() => void prisma.$disconnect());

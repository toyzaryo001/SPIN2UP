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
    console.log("Starting DB Connection...");
    // create a dummy user logic to test
    const phone = '0987654321';
    console.log(`Testing with phone: ${phone}`);
    
    // manual init for test
    const provider = new BetflixProvider();
    
    try {
        console.log("Calling BetflixProvider.register()...");
        const result = await provider.register(9999, phone);
        console.log("Result:", result);
    } catch (e) {
        console.error("Test Error:", e);
    }
}
test().finally(() => prisma.$disconnect());

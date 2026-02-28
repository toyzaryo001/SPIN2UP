import { BetflixProvider } from '../src/services/agents/BetflixProvider';
import prisma from '../src/lib/db';

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

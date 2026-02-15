
import dotenv from 'dotenv';
import { BetflixService } from '../src/services/betflix.service.js';
import prisma from '../src/lib/db.js';

dotenv.config();

async function main() {
    console.log('--- Testing getBetLog API ---');
    try {
        console.log('Fetching with lastId = 0...');
        const logs0 = await BetflixService.getBetLog(0);
        console.log(`Result (Id 0): Found ${logs0?.length || 0} logs`);
        if (logs0 && logs0.length > 0) {
            console.log('Sample Log (0):', logs0[0]);
        }

        console.log('Fetching with lastId = 1000...');
        const logs1000 = await BetflixService.getBetLog(1000);
        console.log(`Result (Id 1000): Found ${logs1000?.length || 0} logs`);
    } catch (error) {
        console.error('API Test Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

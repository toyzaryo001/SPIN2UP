
import dotenv from 'dotenv';
import { BetLogSyncService } from '../src/services/bet-log-sync.service.js';
import prisma from '../src/lib/db.js';

dotenv.config();

async function main() {
    console.log('Running Manual Sync Test...');
    try {
        await BetLogSyncService.syncLogs();
        console.log('Sync Completed.');
    } catch (error) {
        console.error('Sync Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

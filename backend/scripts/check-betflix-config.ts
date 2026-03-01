
import prisma from '../src/lib/db';

// Injected for Debug Scripts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });


async function main() {
    console.log('--- Checking Betflix Config ---');
    const config = await prisma.agentConfig.findFirst({
        where: { code: 'BETFLIX' }
    });

    if (config) {
        console.log('Betflix Config Found:');
        console.log('ID:', config.id);
        console.log('Name:', config.name);
        console.log('apiKey (URL):', config.apiKey);
        console.log('xApiKey (Key):', config.xApiKey);
        console.log('xApiCat (Cat):', config.xApiCat);
        console.log('upline (Prefix):', config.upline);
        console.log('IsActive:', config.isActive);
    } else {
        console.log('No Betflix Config found.');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());

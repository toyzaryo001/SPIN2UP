
import prisma from '../src/lib/db';

// Injected for Debug Scripts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });


async function main() {
    console.log('--- Checking Nexus Config ---');
    const config = await prisma.agentConfig.findFirst({
        where: { code: 'NEXUS' }
    });

    if (config) {
        console.log('Nexus Config Found:');
        console.log('ID:', config.id);
        console.log('Code:', config.code);
        console.log('Name:', config.name);
        console.log('API Key (BaseURL?):', config.apiKey);
        console.log('Upline (AgentCode?):', config.upline);
        console.log('Secret (Token?):', config.apiSecret);
        console.log('IsActive:', config.isActive);
    } else {
        console.log('No Nexus Config found.');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());

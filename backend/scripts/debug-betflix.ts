
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root (one level up from scripts)
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Debugging Betflix Configuration...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Loaded' : 'Missing');
    console.log('BETFLIX_API_URL (ENV):', process.env.BETFLIX_API_URL);
    console.log('BETFLIX_API_KEY (ENV):', process.env.BETFLIX_API_KEY ? '******' + process.env.BETFLIX_API_KEY.slice(-4) : 'Missing');

    try {
        console.log('Querying AgentConfig from DB...');
        const config = await prisma.agentConfig.findFirst({
            where: { isActive: true },
            orderBy: { id: 'asc' }
        });

        if (config) {
            console.log('✅ Found AgentConfig in DB:');
            console.log('ID:', config.id);
            console.log('Name:', config.name);
            console.log('API URL:', config.apiKey);

            // Replicate BetflixService.getAgentBalance() logic manually
            const axios = await import('axios');
            const client = axios.default.create({
                baseURL: config.apiKey || '', // mapped from apiKey column
                headers: {
                    'x-api-key': config.xApiKey || '',
                    'x-api-cat': config.xApiCat || '',
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            console.log('Testing GET /v4/agent/balance ...');
            const res = await client.get('/v4/agent/balance');
            console.log('✅ Balance Response:', res.status);
            console.log('Data:', res.data);

        } else {
            console.log('⚠️ No active AgentConfig found in DB. will fallback to ENV.');
        }

    } catch (error: any) {
        console.error('❌ Error testing API:', error.message);
        if (error.response) {
            console.log('--- Error Response ---');
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
            console.log('Headers:', error.response.headers);
        } else if (error.request) {
            console.log('--- No Response Received ---');
            console.log(error.request);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();

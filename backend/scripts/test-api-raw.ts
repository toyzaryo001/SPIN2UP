
import dotenv from 'dotenv';
import axios from 'axios';
import prisma from '../src/lib/db.js';

dotenv.config();

async function main() {
    console.log('--- Testing Raw API ---');
    try {
        const config = await prisma.agentConfig.findFirst({ where: { isActive: true } });
        if (!config) {
            console.log('No Config Found');
            return;
        }

        const api = axios.create({
            baseURL: config.apiKey || 'https://api.betflix.co',
            headers: {
                'x-api-key': config.xApiKey || '',
                'x-api-cat': config.xApiCat || '',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log('--- Testing v4/get_bet_log ---');
        try {
            const params = new URLSearchParams();
            params.append('lastedID', '0'); // Trying 0 first
            const res = await api.post('/v4/get_bet_log', params);
            console.log('Status:', res.status);

            if (res.data && res.data.data && Array.isArray(res.data.data)) {
                console.log(`Found ${res.data.data.length} logs.`);
                if (res.data.data.length > 0) {
                    console.log('Sample Log:', JSON.stringify(res.data.data[0]).substring(0, 300));
                }
            } else {
                console.log('Data:', JSON.stringify(res.data).substring(0, 300));
            }
        } catch (e: any) {
            console.log('POST v4/get_bet_log Failed:', e.message);
            if (e.response) console.log('Response:', JSON.stringify(e.response.data).substring(0, 300));
        }

    } catch (error) {
        console.error('Script Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

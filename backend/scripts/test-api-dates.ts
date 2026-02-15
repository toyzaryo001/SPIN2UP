
import dotenv from 'dotenv';
import axios from 'axios';
import prisma from '../src/lib/db.js';
import dayjs from 'dayjs';

dotenv.config();

async function main() {
    console.log('--- Testing API with Dates ---');
    try {
        const config = await prisma.agentConfig.findFirst({ where: { isActive: true } });
        if (!config) return;

        const api = axios.create({
            baseURL: config.apiKey || 'https://api.betflix.co',
            headers: {
                'x-api-key': config.xApiKey || '',
                'x-api-cat': config.xApiCat || '',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const start = dayjs().startOf('day').format('YYYY-MM-DD HH:mm:ss');
        const end = dayjs().endOf('day').format('YYYY-MM-DD HH:mm:ss');
        console.log(`Querying from ${start} to ${end}`);

        // Try GET v4/report/getBetlogNEW with dates
        try {
            const res = await api.get('/v4/report/getBetlogNEW', {
                params: { start, end }
            });
            console.log('GET with dates Status:', res.status);
            console.log('Data:', JSON.stringify(res.data).substring(0, 500));
        } catch (e: any) {
            console.log('GET with dates Failed:', e.message);
            if (e.response) console.log('Response:', e.response.data);
        }

    } catch (error) {
        console.error('Script Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();


import dotenv from 'dotenv';
import axios from 'axios';
import prisma from '../src/lib/db.js';
import dayjs from 'dayjs';

dotenv.config();

async function main() {
    console.log('--- Testing Summary API ---');
    try {
        const config = await prisma.agentConfig.findFirst({ where: { isActive: true } });
        if (!config) {
            console.log('No Config');
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

        const start = dayjs().startOf('day').format('YYYY-MM-DD HH:mm:ss');
        const end = dayjs().endOf('day').format('YYYY-MM-DD HH:mm:ss');

        console.log(`Fetching Summary from ${start} to ${end}`);

        const params = new URLSearchParams();
        params.append('start', start);
        params.append('end', end);

        // Try POST (Reports usually use POST)
        try {
            const res = await api.post('/v4/report/summaryNEW', params);
            console.log('Status:', res.status);

            if (res.data && res.data.data) {
                const data = res.data.data;
                console.log(`Found ${Array.isArray(data) ? data.length : 'Unknown'} records.`);
                if (Array.isArray(data) && data.length > 0) {
                    console.log('Sample Record:', data[0]);
                } else {
                    console.log('Data:', JSON.stringify(res.data).substring(0, 300));
                }
            } else {
                console.log('Raw:', JSON.stringify(res.data).substring(0, 300));
            }

        } catch (e: any) {
            console.log('POST summaryNEW Failed:', e.message);
            if (e.response) console.log('Response:', e.response.data);
        }

    } catch (error) {
        console.error('Script Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

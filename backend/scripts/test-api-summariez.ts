
import dotenv from 'dotenv';
import axios from 'axios';
import prisma from '../src/lib/db.js';
import dayjs from 'dayjs';

dotenv.config();

async function main() {
    console.log('--- Testing Summariez API ---');
    try {
        const config = await prisma.agentConfig.findFirst({ where: { isActive: true } });
        if (!config) return;

        console.log('Using Config Agent:', config.upline || 'UNKNOWN');
        // We need 'upline' param. It might be the agent username or site prefix.
        // Usually it's the Agent Username used to login to Betflix agent system.
        // In config, we have 'upline'.
        const upline = config.upline;

        if (!upline) {
            console.log('Error: Agent Upline (Username) not found in config. Cannot call summariez.');
            console.log('Config:', config);
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

        const date = dayjs().format('YYYY-MM-DD');
        console.log(`Fetching Summariez for Date: ${date}, Upline: ${upline}`);

        try {
            const res = await api.get('/v4/report/summariez', {
                params: { date, page: 1, upline }
            });
            console.log('Status:', res.status);

            if (res.data && res.data.data) {
                const data = res.data.data;
                console.log(`Found ${Array.isArray(data) ? data.length : 'Unknown'} records.`);
                if (Array.isArray(data) && data.length > 0) {
                    console.log('Sample:', data[0]);
                } else {
                    console.log('Data:', JSON.stringify(res.data).substring(0, 300));
                }
            } else {
                console.log('Raw:', JSON.stringify(res.data).substring(0, 300));
            }

        } catch (e: any) {
            console.log('GET summariez Failed:', e.message);
            if (e.response) console.log('Response:', e.response.data);
        }

    } catch (error) {
        console.error('Script Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

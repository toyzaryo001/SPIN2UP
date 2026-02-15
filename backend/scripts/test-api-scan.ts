
import dotenv from 'dotenv';
import axios from 'axios';
import prisma from '../src/lib/db.js';
import dayjs from 'dayjs';

dotenv.config();

async function main() {
    console.log('--- Scanning API Endpoints ---');
    try {
        const config = await prisma.agentConfig.findFirst({ where: { isActive: true } });
        if (!config) return;

        const upline = config.agentUsername;
        const api = axios.create({
            baseURL: config.apiKey || 'https://api.betflix.co',
            headers: {
                'x-api-key': config.xApiKey || '',
                'x-api-cat': config.xApiCat || '',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const date = dayjs().format('YYYY-MM-DD');
        const start = dayjs().startOf('day').format('YYYY-MM-DD HH:mm:ss');
        const end = dayjs().endOf('day').format('YYYY-MM-DD HH:mm:ss');

        const candidates = [
            { url: '/v4/report/summariez', params: { date, page: 1, upline } },
            { url: '/v4/report/summarer', params: { start, end, username: upline } }, // Requires username, maybe agent?
            { url: '/v4/report/summary2', params: { start, end, username: upline } },
            { url: '/v4/report/summary', params: { date, page: 1 } },
            { url: '/v4/report/daily', params: { date } }
        ];

        for (const c of candidates) {
            console.log(`Testing GET ${c.url}...`);
            try {
                const res = await api.get(c.url, { params: c.params });
                console.log(`  > HTTP ${res.status}`);
                if (res.data.status === 'success') {
                    console.log('  > SUCCESS!');
                    console.log('  > Sample:', JSON.stringify(res.data).substring(0, 100));
                } else {
                    console.log('  > Error:', res.data.msg || res.data.error_code);
                }
            } catch (e: any) {
                console.log(`  > Failed: ${e.response?.status || e.message}`);
                if (e.response?.data) console.log(`    Msg:`, e.response.data);
            }
        }

    } catch (error) {
        console.error('Script Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();


import dotenv from 'dotenv';
import axios from 'axios';
import prisma from '../src/lib/db.js';

dotenv.config();

async function main() {
    console.log('--- Guessing ID ---');
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

        const tryIds = ['1', '1000', '10000', '', '-1'];

        for (const id of tryIds) {
            console.log(`Trying lastedID='${id}'...`);
            try {
                // Try GET
                const res = await api.get('/v4/report/getBetlogNEW', { params: { lastedID: id } });
                console.log(`GET '${id}' Status:`, res.status);
                // console.log('Data:', JSON.stringify(res.data).substring(0, 100));
                if (res.data.status === 'success') {
                    console.log('SUCCESS w/ GET!');
                    return;
                } else {
                    console.log('Msg:', res.data.msg);
                }
            } catch (e: any) {
                // console.log(`GET '${id}' Failed:`, e.message);
                if (e.response) console.log(`GET '${id}' Resp:`, e.response.data);
            }
        }

    } catch (error) {
        console.error('Script Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

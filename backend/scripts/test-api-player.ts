
import dotenv from 'dotenv';
import axios from 'axios';
import prisma from '../src/lib/db.js';
import dayjs from 'dayjs';

dotenv.config();

async function main() {
    console.log('--- Testing API with Real Player ---');
    try {
        const config = await prisma.agentConfig.findFirst({ where: { isActive: true } });
        if (!config) {
            console.log('No Config');
            return;
        }

        // Find a user who might have played
        const user = await prisma.user.findFirst();
        if (!user) {
            console.log('No users found in DB.');
            return;
        }

        let fullUsername = user.username;
        // Logic to emulate applyPrefix
        const digits = user.username.replace(/\D/g, '');
        if (digits.length >= 6) {
            fullUsername = (config.prefix || '') + (config.sitePrefix || '') + digits.slice(-6);
        }

        console.log(`Testing with User: ${user.username} -> Querying as: ${fullUsername}`);

        const api = axios.create({
            baseURL: config.apiKey || 'https://api.betflix.co',
            headers: {
                'x-api-key': config.xApiKey || '',
                'x-api-cat': config.xApiCat || '',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const start = dayjs().format('YYYY-MM-DD');
        const end = dayjs().format('YYYY-MM-DD');

        // Test summaryNEW
        try {
            console.log(`Calling summaryNEW for ${user.username}...`);
            const res = await api.get('/v4/report/summaryNEW', {
                params: { username: user.username, start, end }
            });
            console.log('Status:', res.status);
            console.log('Data:', JSON.stringify(res.data).substring(0, 300));
        } catch (e: any) {
            console.log('summaryNEW Failed:', e.message);
            if (e.response) console.log('Response:', e.response.data);
        }

    } catch (error) {
        console.error('Script Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

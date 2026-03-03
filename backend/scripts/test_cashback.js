const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

// Betflix Service Mock to test getReportSummary
async function getBetflixConfig() {
    const config = await prisma.agentConfig.findFirst({ where: { isActive: true }, orderBy: { id: 'asc' } });
    const siteSetting = await prisma.setting.findUnique({ where: { key: 'prefix' } });
    return {
        apiUrl: config?.apiKey && config.apiKey.startsWith('http') ? config.apiKey : 'https://api.bfx.fail',
        apiKey: config?.xApiKey || config?.apiKey || '',
        apiCat: config?.xApiCat || '',
        prefix: config?.upline || '',
        sitePrefix: siteSetting ? siteSetting.value : 'CHKK'
    };
}

async function testBetflixReport(username) {
    const config = await getBetflixConfig();
    const headers = { 'x-api-key': config.apiKey, 'x-api-cat': config.apiCat, 'Content-Type': 'application/x-www-form-urlencoded' };

    // Test logic from RewardService
    const dayjs = require('dayjs');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    console.log(`\n--- Fetching Betflix Report for ${username} on ${yesterday} ---`);
    console.log(`API URL: ${config.apiUrl}`);

    try {
        const fullUsername = (config.prefix + config.sitePrefix + username).toLowerCase();
        console.log(`Formatted Username: ${fullUsername}`);

        const res = await axios.get(`${config.apiUrl}/v4/report/summaryNEW`, {
            params: { username: fullUsername, start: yesterday, end: yesterday },
            headers
        });

        console.log('API Response:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('API Error:', e?.response?.data || e.message);
    }
}

async function main() {
    console.log('--- Testing Cashback DB Settings ---');
    const cbSetting = await prisma.cashbackSetting.findFirst();
    console.log('Cashback Settings:', cbSetting);

    const user = await prisma.user.findFirst({
        where: { betflixUsername: { not: null } },
        orderBy: { id: 'desc' }
    });

    if (user) {
        console.log('\nFound User:', user.username, 'Betflix Name:', user.betflixUsername);
        await testBetflixReport(user.betflixUsername);
    } else {
        console.log('No user with betflixUsername found.');
    }

    process.exit(0);
}

main();

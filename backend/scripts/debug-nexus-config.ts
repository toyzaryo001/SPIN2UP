
import prisma from '../src/lib/db';
import axios from 'axios';
import fs from 'fs';

async function main() {
    const config = await prisma.agentConfig.findUnique({
        where: { code: 'NEXUS' }
    });

    console.log('--- Current Nexus Config in DB ---');
    if (config) {
        console.log('ID:', config.id);
        console.log('Code:', config.code);
        console.log('Endpoint (apiKey):', config.apiKey);
        console.log('Agent Code (upline):', config.upline);
        console.log('Agent Token (apiSecret):', config.apiSecret ? `${config.apiSecret.substring(0, 10)}...[LEN=${config.apiSecret.length}]` : 'NULL');
    }

    if (!config) {
        console.error('Nexus config not found!');
        return;
    }

    const endpoint = config.apiKey || 'https://api.nexusggr.com';
    const payload = {
        method: 'provider_list',
        agent_code: config.upline, // UI: Agent Code
        agent_token: config.apiSecret // UI: Agent Token
    };

    console.log('\n--- Testing provider_list ---');
    console.log('URL:', endpoint);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    try {
        const res = await axios.post(endpoint, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });
        const output = `Response Status: ${res.status}\nResponse Data: ${JSON.stringify(res.data, null, 2)}`;
        console.log(output);
        fs.writeFileSync('debug_nexus_output.txt', output);
    } catch (error: any) {
        console.error('\nRequest Failed!');
        let errorOutput = `Message: ${error.message}\n`;
        if (error.response) {
            errorOutput += `Response Data: ${JSON.stringify(error.response.data, null, 2)}`;
        }
        console.error(errorOutput);
        fs.writeFileSync('debug_nexus_output.txt', errorOutput);
    }
}

main();

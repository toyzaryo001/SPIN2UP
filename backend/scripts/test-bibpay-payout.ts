import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

/**
 * Test BibPay Payout Endpoint
 *
 * This script tests whether the BibPay /payout endpoint exists and is accessible.
 * If the endpoint is not available, it provides helpful error messages.
 *
 * Usage: npx ts-node backend/scripts/test-bibpay-payout.ts
 */
async function run() {
    console.log('🧪 BibPay Payout Endpoint Test\n');
    console.log('─'.repeat(60));

    try {
        // 1. Fetch BibPay Configuration
        console.log('\n📋 Step 1: Fetching BibPay configuration...');
        const gateway = await prisma.paymentGateway.findFirst({
            where: { code: 'bibpay' }
        });

        if (!gateway) {
            console.error('❌ BibPay gateway not found in database');
            console.log('   Please configure BibPay payment gateway first');
            return;
        }

        const config = JSON.parse(gateway.config);
        console.log('✅ Configuration loaded');
        console.log(`   API Key: ${config.apiKey ? config.apiKey.substring(0, 10) + '***' : 'NOT SET'}`);
        console.log(`   API Endpoint: ${config.apiEndpoint || 'https://api.bibbyx.com/api/v1/mc'}`);

        // 2. Prepare Payout Request
        console.log('\n📝 Step 2: Preparing test payout request...');
        const baseUrl = config.apiEndpoint?.replace(/\/$/, '') ||  'https://api.bibbyx.com/api/v1/mc';
        const payoutUrl = baseUrl.endsWith('/api/v1/mc') ? baseUrl : baseUrl + '/api/v1/mc';

        const testPayload = {
            bankName: 'Test User',
            bankNumber: '1234567890',
            bankCode: '014',  // SCB
            amount: 1.00,     // Minimal test amount
            refferend: `TEST_PAYOUT_${Date.now()}`,
            signatrure: config.apiKey,
            callbackUrl: config.callbackUrl || 'https://api.check24m.com/api/webhooks/payment/bibpay'
        };

        console.log(`   URL: POST ${payoutUrl}/payout`);
        console.log(`   Reference: ${testPayload.refferend}`);
        console.log(`   Amount: ${testPayload.amount} THB`);

        // 3. Test Payout Endpoint
        console.log('\n🌐 Step 3: Testing /payout endpoint...');
        console.log('   Sending request...');

        try {
            const response = await axios.post(`${payoutUrl}/payout`, testPayload, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': config.apiKey
                },
                timeout: 10000
            });

            console.log('✅ Payout endpoint EXISTS and responded\n');
            console.log('Response Status:', response.status);
            console.log('Response Data:', JSON.stringify(response.data, null, 2));

            if (response.data?.status === true) {
                console.log('\n🎉 Payout endpoint is working correctly!');
                console.log('Transaction ID:', response.data.data?.transactionId);
            } else {
                console.log('\n⚠️  Endpoint responded but returned error status');
                console.log('Error Message:', response.data?.msg || response.data?.message);
            }

        } catch (error: any) {
            if (error.response?.status === 404) {
                console.error('❌ PAYOUT ENDPOINT NOT FOUND (404)\n');
                console.log('Possible causes:');
                console.log('  1. BibPay may not support /payout endpoint');
                console.log('  2. Endpoint URL might be different');
                console.log('  3. API may use different endpoint path\n');
                console.log('Next steps:');
                console.log('  1. Check BibPay API documentation');
                console.log('  2. Confirm endpoint URL with BibPay support');
                console.log('  3. Try alternative endpoints: /withdraw, /transfer, /manual-transfer/');
            } else if (error.response?.status === 401) {
                console.error('❌ UNAUTHORIZED (401)\n');
                console.log('Possible causes:');
                console.log('  1. Invalid API key');
                console.log('  2. Expired API key');
                console.log('  3. API key not whitelisted for payout endpoint\n');
                console.log('Next steps:');
                console.log('  1. Verify API key in configuration');
                console.log('  2. Contact BibPay support to check key status');
            } else if (error.code === 'ECONNREFUSED') {
                console.error('❌ CONNECTION REFUSED\n');
                console.log('Possible causes:');
                console.log('  1. BibPay API server is down');
                console.log('  2. Network connectivity issue');
                console.log('  3. Firewall blocking the connection\n');
                console.log('Next steps:');
                console.log('  1. Check network connectivity');
                console.log('  2. Verify BibPay API status');
                console.log('  3. Check firewall rules');
            } else if (error.code === 'ENOTFOUND') {
                console.error('❌ DNS RESOLUTION FAILED\n');
                console.log('Possible causes:');
                console.log('  1. Invalid API endpoint domain');
                console.log('  2. DNS configuration issue\n');
                console.log('Next steps:');
                console.log('  1. Verify API endpoint URL in configuration');
                console.log('  2. Check DNS resolution: nslookup api.bibbyx.com');
            } else if (error.code === 'ETIMEDOUT') {
                console.error('❌ REQUEST TIMEOUT\n');
                console.log('Possible causes:');
                console.log('  1. BibPay API is slow to respond');
                console.log('  2. Network latency issue');
                console.log('  3. Firewall throttling\n');
                console.log('Next steps:');
                console.log('  1. Try again - might be temporary');
                console.log('  2. Contact BibPay support about API performance');
            } else {
                console.error('❌ REQUEST FAILED\n');
                console.log('Status:', error.response?.status);
                console.log('Error:', error.response?.data || error.message);
                console.log('Code:', error.code);

                if (error.response?.data) {
                    console.log('\nAPI Response:');
                    console.log(JSON.stringify(error.response.data, null, 2));
                }
            }
        }

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await prisma.$disconnect();
    }

    console.log('\n' + '─'.repeat(60));
    console.log('\n📚 Summary:');
    console.log('If payout endpoint exists: Implementation is ready');
    console.log('If payout endpoint not found: Need to update implementation');
    console.log('   → Add error handling in BibPayProvider.createPayout()');
    console.log('   → Disable auto-withdrawal feature until endpoint confirmed');
}

run().catch(console.error);

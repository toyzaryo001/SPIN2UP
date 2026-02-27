import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function run() {
    const gateway = await prisma.paymentGateway.findFirst({ where: { code: 'bibpay' } });
    if (!gateway) {
        console.log('BibPay gateway not found');
        return;
    }

    const config = JSON.parse(gateway.config);
    console.log('BibPay Config:', { ...config, apiKey: '***' });

    const payload = {
        bankName: 'Test Customer',
        bankNumber: '1234567890',
        bankCode: '014',
        amount: '10.00',
        refferend: 'TEST_PAYIN_' + Date.now().toString().slice(-6),
        signatrure: config.apiKey,
        callbackUrl: config.callbackUrl || 'http://localhost/callback'
    };

    console.log('\nSending Payload:', { ...payload, signatrure: '***' });

    try {
        const response = await axios.post(`${config.apiEndpoint}/api/v1/mc/payin`, payload, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey
            }
        });
        console.log('\nSuccess Response:', response.data);
    } catch (error: any) {
        console.log('\nError Response:', error.response?.status, error.response?.statusText);
        console.log('Data:', JSON.stringify(error.response?.data, null, 2));
    }
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

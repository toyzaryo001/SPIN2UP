import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function run() {
    const gateway = await prisma.paymentGateway.findFirst({ where: { code: 'bibpay' } });
    const config = JSON.parse(gateway.config);
    const baseUrl = config.apiEndpoint.replace(/\/$/, '');
    const finalUrl = baseUrl.endsWith('/api/v1/mc') ? baseUrl : baseUrl + '/api/v1/mc';

    const payload = {
        bankName: 'Test Customer',
        bankNumber: '1234567890',
        bankCode: '014',
        amount: 10,
        refferend: 'TEST_PAYIN_' + Date.now(),
        signatrure: config.apiKey,
        callbackUrl: config.callbackUrl || 'http://localhost'
    };

    try {
        console.log('Sending payload...', { ...payload, signatrure: '***' });
        const response = await axios.post(`${finalUrl}/payin`, payload, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey
            }
        });
        console.log('Success:', response.data);
    } catch (error: any) {
        console.log('Error Status:', error.response?.status);
        console.log('Error Data:', error.response?.data);
    }
}
run().finally(() => prisma.$disconnect());

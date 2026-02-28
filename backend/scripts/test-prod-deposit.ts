import axios from 'axios';

async function run() {
    try {
        console.log('Sending request to https://api.check24m.com/api/payment/deposit...');
        const res = await axios.post('https://api.check24m.com/api/payment/deposit', { amount: 10, gateway: 'bibpay' }, {
            headers: {
                'Content-Type': 'application/json',
                // Using a fake token or no token to see if it gives 401 Unauthorized or 400 Bad Request
                'Authorization': 'Bearer fake_token_for_test'
            }
        });
        console.log('Success:', res.status, res.data);
    } catch (e: any) {
        console.log('Error Status:', e.response?.status);
        console.log('Error Data:', e.response?.data);
        console.log('Error Headers:', e.response?.headers);
    }
}
run();

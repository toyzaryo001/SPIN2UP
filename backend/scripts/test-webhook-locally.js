const jwt = require('jsonwebtoken');

async function testWebhook() {
    const jwtSecret = '9505d891a369c054afc1a02475950166'; // from screenshot
    const payload = {
        sender_mobile: '0993432623',
        sender_name: 'TEST USER',
        amount: 10000, // 100 Baht in satang
        received_time: Date.now().toString(),
        transaction_id: 'TEST12345',
        message: 'โอนเงิน',
    };

    const token = jwt.sign(payload, jwtSecret);

    console.log('Sending webhook payload...');

    try {
        const response = await fetch('https://api.play-check24m.com/api/webhooks/truewallet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: token })
        });

        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Data:', data);
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

testWebhook();

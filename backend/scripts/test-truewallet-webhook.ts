import jwt from 'jsonwebtoken';
import prisma from '../src/lib/db.js';

async function testWebhook() {
    console.log('--- Testing TrueWallet Webhook ---');

    // 1. Get a test user with a phone number
    const user = await prisma.user.findFirst({
        where: { status: 'ACTIVE' }
    });

    if (!user) {
        console.error('❌ No active users found in DB to test with.');
        return;
    }

    console.log(`👤 Testing with user: ${user.fullName} (${user.phone})`);

    // 2. Get active wallet with JWT secret
    const wallet = await prisma.trueMoneyWallet.findFirst({
        where: { isActive: true, jwtSecret: { not: null } }
    });

    if (!wallet || !wallet.jwtSecret) {
        console.error('❌ No active TrueMoney Wallet with jwtSecret found.');
        console.log('Please add a wallet and set its Webhook Authorization Key in the Admin Panel first.');
        return;
    }

    console.log(`💳 Using Wallet: ${wallet.accountName} (${wallet.phoneNumber})`);

    // 3. Create simulated TrueWallet payload
    const transactionId = `TEST_TW_${Date.now()}`;
    const amountBaht = 50; // 50 THB

    // TrueWallet usually sends amount in Satang (100 satang = 1 baht)
    // but some versions of the gateway send it directly. In our code we divide amount/100
    // so let's send 5000 (50 THB * 100)
    const amountSatang = amountBaht * 100;

    const payload = {
        transaction_id: transactionId,
        ref1: user.phone,          // sender_mobile or ref1 is the sender's phone
        sender_mobile: user.phone,
        sender_name: user.fullName,
        amount: String(amountSatang),
        received_time: Date.now().toString(),
        personal_message: 'Test Deposit via Webhook Simulation'
    };

    console.log('📦 Generating JWT Payload...');
    console.log(payload);

    // 4. Sign JWT
    const token = jwt.sign(payload, wallet.jwtSecret);
    console.log(`\n🔑 JWT Token generated: ${token.substring(0, 50)}...`);

    // 5. Send to local webhook
    const webhookUrl = 'http://localhost:1337/api/webhook/truewallet';
    console.log(`\n🚀 Sending POST requested to: ${webhookUrl}`);

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: token })
        });

        const data = await response.json();

        console.log(`\n📡 Response Status: ${response.status}`);
        console.log('📩 Response Data:');
        console.dir(data, { depth: null, colors: true });

        if (data.success) {
            console.log(`\n✅ TEST PASSED: Successfully deposited ${amountBaht} THB to user ${user.id}!`);
        } else {
            console.error('\n❌ TEST FAILED: Endpoint returned success=false');
        }

    } catch (e) {
        console.error('\n❌ ERROR: Failed to connect to local server.', e);
        console.log('Is the backend server running? (npm run dev)');
    }
}

testWebhook().catch(console.error).finally(() => prisma.$disconnect());

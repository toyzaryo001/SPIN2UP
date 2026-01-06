
const phone = '0999999999';
const password = 'admin123';

async function testLogin() {
    console.log('Testing Login API...');
    try {
        const response = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone, password }),
        });

        const data = await response.json();

        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('✅ API Login Success!');
        } else {
            console.log('❌ API Login Failed:', data.message);
        }
    } catch (error) {
        console.error('❌ Connection Error:', error.message);
        console.log('Ensure the backend server is running on port 3001');
    }
}

testLogin();

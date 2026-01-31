import axios from 'axios';

const BETFLIX_API_URL = process.env.BETFLIX_API_URL || 'https://api.betflix.co'; // Placeholder
const BETFLIX_API_KEY = process.env.BETFLIX_API_KEY || '';
const BETFLIX_API_CAT = process.env.BETFLIX_API_CAT || '';

// Prefix for generating usernames (e.g., if phone is 0912345678, user sent is PREFIX+5678)
// User instruction: "Send prefix+last6"
const USER_PREFIX = process.env.BETFLIX_USER_PREFIX || 'CHKK';

const api = axios.create({
    baseURL: BETFLIX_API_URL,
    headers: {
        'x-api-key': BETFLIX_API_KEY,
        'x-api-cat': BETFLIX_API_CAT,
        'Content-Type': 'application/x-www-form-urlencoded'
    }
});

export class BetflixService {

    /**
     * Register a new user to Betflix
     * @param phone User's phone number
     * @returns The full username returned by Betflix (with agent prefix)
     */
    static async register(phone: string): Promise<{ username: string, password: string } | null> {
        try {
            // Logic: Prefix + Last 6 digits
            const shortUsername = USER_PREFIX + phone.slice(-6);
            const password = phone; // Use phone as password or valid random string

            const params = new URLSearchParams();
            params.append('username', shortUsername);
            params.append('password', password);

            const res = await api.post('/v4/user/register', params);

            if (res.data.status === 'success' && res.data.data) {
                return {
                    username: res.data.data.username, // Full username from Betflix
                    password: password
                };
            } else {
                console.error('Betflix Register Error:', res.data);
                // If error "Username already exists" (code 2), maybe we should try login or just return null
                if (res.data.error_code === 2) {
                    console.warn('User already exists in Betflix, might need to manually sync or handle.');
                    // In real world, we might want to return the expected username if we know the pattern
                }
                return null;
            }
        } catch (error) {
            console.error('Betflix Register Exception:', error);
            return null;
        }
    }

    /**
     * Get User Balance directly from Betflix
     * @param username Betflix Username
     */
    static async getBalance(username: string): Promise<number> {
        try {
            const params = new URLSearchParams();
            params.append('username', username);

            const res = await api.post('/v4/user/balance', params);

            if (res.data.status === 'success' && res.data.data) {
                return parseFloat(res.data.data.balance || '0');
            }
            return 0;
        } catch (error) {
            console.error('Betflix Balance Error:', error);
            return 0;
        }
    }

    /**
     * Transfer Credit (Deposit/Withdraw)
     * @param username Betflix Username
     * @param amount Amount to transfer (Positive = Deposit, Negative = Withdraw)
     * @param ref Reference ID (optional)
     */
    static async transfer(username: string, amount: number, ref: string = ''): Promise<boolean> {
        try {
            const params = new URLSearchParams();
            params.append('username', username);
            params.append('amount', amount.toString());
            params.append('ref', ref || Date.now().toString());

            const res = await api.post('/v4/user/transfer', params);

            if (res.data.status === 'success') {
                return true;
            }
            console.error('Betflix Transfer Failed:', res.data);
            return false;
        } catch (error) {
            console.error('Betflix Transfer Exception:', error);
            return false;
        }
    }

    /**
     * Get Direct Play URL
     */
    static async getPlayUrl(username: string): Promise<string | null> {
        try {
            const params = new URLSearchParams();
            params.append('username', username);

            const res = await api.post('/v4/play/login', params);

            if (res.data.status === 'success' && res.data.data && res.data.data.url) {
                return res.data.data.url;
            }
            return null;
        } catch (error) {
            console.error('Betflix Play URL Error:', error);
            return null;
        }
    }
    /**
     * Check Connection Status and Latency
     */
    static async checkStatus(): Promise<{ success: boolean; message: string; latency: number }> {
        const start = Date.now();
        try {
            const res = await api.get('/v4/status');
            const latency = Date.now() - start;

            if (res.data.status === 'success') {
                return { success: true, message: 'Connected', latency };
            } else {
                return { success: false, message: res.data.msg || 'Unknown Error', latency };
            }
        } catch (error: any) {
            const latency = Date.now() - start;
            return {
                success: false,
                message: error.response?.data?.msg || error.message || 'Connection Failed',
                latency
            };
        }
    }
}

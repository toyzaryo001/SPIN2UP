import axios from 'axios';

let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Force HTTPS if the page is served over HTTPS (runtime check, works in browser)
// This prevents Mixed Content warnings regardless of NODE_ENV at build time
if (typeof window !== 'undefined' && window.location.protocol === 'https:' && apiUrl.startsWith('http://')) {
    apiUrl = apiUrl.replace('http://', 'https://');
}

// Also force in production build (server-side rendering)
if (process.env.NODE_ENV === 'production' && apiUrl.startsWith('http://') && !apiUrl.includes('localhost')) {
    apiUrl = apiUrl.replace('http://', 'https://');
}

export const API_URL = apiUrl + '/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000, // 15 วินาที timeout (ป้องกันค้างนาน)
});

// =============================================
// Network Retry System — ลองใหม่อัตโนมัติเมื่อเน็ตมีปัญหา
// รองรับทุก ISP, ทุกเครือข่าย, iOS + Android
// =============================================
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 วินาที

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;

        // ถ้าเป็น network error หรือ timeout → ลองใหม่
        const isNetworkError = !error.response && (
            error.code === 'ECONNABORTED' ||
            error.code === 'ERR_NETWORK' ||
            error.code === 'ETIMEDOUT' ||
            error.message?.includes('Network Error') ||
            error.message?.includes('timeout')
        );

        // ถ้าเป็น 502/503/504 (server ยังไม่พร้อม) → ลองใหม่
        const isServerError = error.response?.status >= 502 && error.response?.status <= 504;

        if ((isNetworkError || isServerError) && config && !config._retryCount) {
            config._retryCount = 0;
        }

        if ((isNetworkError || isServerError) && config && config._retryCount < MAX_RETRIES) {
            config._retryCount += 1;
            console.log(`[API Retry] Attempt ${config._retryCount}/${MAX_RETRIES} for ${config.url}`);

            // รอก่อนลองใหม่ (เพิ่มขึ้นเรื่อยๆ: 1s, 2s, 3s)
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * config._retryCount));

            return api(config);
        }

        // 401 Unauthorized → auto logout
        if (error.response?.status === 401 && typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.dispatchEvent(new Event('user-logout'));

            if (window.location.pathname !== '/') {
                window.location.href = '/?action=login';
            }
        }

        return Promise.reject(error);
    }
);

// Public endpoints (no auth required)
export const publicApi = {
    // Get site settings and features
    getSettings: () => api.get('/public/settings'),

    // Get active banners
    getBanners: () => api.get('/public/banners'),

    // Get active promotions
    getPromotions: () => api.get('/public/promotions'),

    // Get games
    getGames: (params?: { type?: string; provider?: string; limit?: number }) =>
        api.get('/public/games', { params }),

    // Get announcements
    getAnnouncements: () => api.get('/public/announcements'),

    // Get bank accounts for deposit
    getBankAccounts: (type?: string) =>
        api.get('/public/bank-accounts', { params: { type } }),

    // Get TrueMoney wallets
    getTrueMoneyWallets: () => api.get('/public/truemoney'),
};

// Auth endpoints
export const authApi = {
    login: (phone: string, password: string) =>
        api.post('/auth/login', { phone, password }),

    register: (data: { phone: string; password: string; fullName: string; bankName: string; bankAccount: string }) =>
        api.post('/auth/register', data),
};

// Add token to requests if available
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

export default api;

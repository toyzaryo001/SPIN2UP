import axios, { AxiosError } from 'axios';

// =============================================
// Dual-URL System: Primary + Fallback
// เมื่อ ISP บล็อก domain หลัก (Wi-Fi) → สลับไปใช้ Railway URL อัตโนมัติ
// =============================================
const PRIMARY_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const FALLBACK_API_URL = process.env.NEXT_PUBLIC_FALLBACK_API_URL || '';

function getApiUrl(): string {
    let url = PRIMARY_API_URL;

    if (!url.startsWith('http')) {
        url = `https://${url}`;
    }

    // Force HTTPS if the page is served over HTTPS
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
        url = url.replace('http://', 'https://');
    }

    // Also force in production build (SSR)
    if (process.env.NODE_ENV === 'production' && url.startsWith('http://') && !url.includes('localhost')) {
        url = url.replace('http://', 'https://');
    }

    return url + '/api';
}

function getFallbackApiUrl(): string {
    if (!FALLBACK_API_URL) return '';
    let url = FALLBACK_API_URL;

    if (!url.startsWith('http')) {
        url = `https://${url}`;
    }

    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
        url = url.replace('http://', 'https://');
    }
    if (process.env.NODE_ENV === 'production' && url.startsWith('http://') && !url.includes('localhost')) {
        url = url.replace('http://', 'https://');
    }
    return url + '/api';
}

export const API_URL = getApiUrl();
const FALLBACK_URL = getFallbackApiUrl();

// เก็บสถานะว่าตอนนี้ใช้ URL ไหน
let currentApiUrl = API_URL;
let isUsingFallback = false;

const api = axios.create({
    baseURL: currentApiUrl,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 วินาที
});

// =============================================
// Network Retry + Fallback System
// 1. ลองซ้ำ 2 ครั้งกับ URL หลัก
// 2. ถ้ายังไม่ได้ → สลับไปใช้ Fallback URL (Railway)
// 3. ถ้า Fallback ใช้ได้ → จำไว้ใช้ต่อ
// =============================================
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const config = error.config as any;
        if (!config) return Promise.reject(error);

        // ตรวจว่าเป็น network error (DNS blocked, timeout, connection refused)
        const isNetworkError = !error.response && (
            error.code === 'ECONNABORTED' ||
            error.code === 'ERR_NETWORK' ||
            error.code === 'ETIMEDOUT' ||
            error.message?.includes('Network Error') ||
            error.message?.includes('timeout')
        );

        const isServerError = error.response?.status !== undefined &&
            error.response.status >= 502 && error.response.status <= 504;

        if (!config._retryCount) config._retryCount = 0;
        if (!config._triedFallback) config._triedFallback = false;

        // ขั้นตอนที่ 1: ลองซ้ำกับ URL เดิม
        if ((isNetworkError || isServerError) && config._retryCount < MAX_RETRIES) {
            config._retryCount += 1;
            console.log(`[API] Retry ${config._retryCount}/${MAX_RETRIES}: ${config.url}`);
            await new Promise(r => setTimeout(r, RETRY_DELAY * config._retryCount));
            return api(config);
        }

        // ขั้นตอนที่ 2: สลับไป Fallback URL (Railway)
        if ((isNetworkError || isServerError) && FALLBACK_URL && !config._triedFallback && !isUsingFallback) {
            console.log(`[API] Primary URL failed → switching to fallback: ${FALLBACK_URL}`);
            config._triedFallback = true;
            config._retryCount = 0;

            // เปลี่ยน baseURL เป็น Fallback
            const originalUrl = config.url || '';
            config.baseURL = FALLBACK_URL;
            config.url = originalUrl;

            try {
                const result = await api.request(config);

                // Fallback สำเร็จ → จำไว้ใช้ต่อเลย
                isUsingFallback = true;
                currentApiUrl = FALLBACK_URL;
                api.defaults.baseURL = FALLBACK_URL;
                console.log(`[API] ✅ Fallback works! Using ${FALLBACK_URL} from now on`);

                // บันทึกลง localStorage เพื่อโหลดหน้าถัดไปใช้เลย
                if (typeof window !== 'undefined') {
                    localStorage.setItem('api_fallback_active', 'true');
                }

                return result;
            } catch {
                // Fallback ก็ไม่ได้ → ส่ง error กลับไป
            }
        }

        // 401 Unauthorized → auto logout
        if (error.response?.status === 401 && typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('lastActive');
                window.dispatchEvent(new Event('user-logout'));
                // Prevent immediate redirect loop if already on home page login modal
                if (window.location.pathname !== '/') {
                    window.location.href = '/?action=login';
                }
            }
        }

        return Promise.reject(error);
    }
);

// เช็ค localStorage ว่าเคยใช้ Fallback สำเร็จมาก่อนไหม
if (typeof window !== 'undefined' && FALLBACK_URL) {
    const wasFallback = localStorage.getItem('api_fallback_active');
    if (wasFallback === 'true') {
        console.log(`[API] Restoring fallback URL from previous session`);
        isUsingFallback = true;
        currentApiUrl = FALLBACK_URL;
        api.defaults.baseURL = FALLBACK_URL;
    }
}

// Public endpoints (no auth required)
export const publicApi = {
    getSettings: () => api.get('/public/settings'),
    getBanners: () => api.get('/public/banners'),
    getPromotions: () => api.get('/public/promotions'),
    getGames: (params?: { type?: string; provider?: string; limit?: number }) =>
        api.get('/public/games', { params }),
    getAnnouncements: () => api.get('/public/announcements'),
    getBankAccounts: (type?: string) =>
        api.get('/public/bank-accounts', { params: { type } }),
    getTrueMoneyWallets: () => api.get('/public/truemoney'),
};

// Auth endpoints
export const authApi = {
    login: (phone: string, password: string) =>
        api.post('/auth/login', { phone, password }),
    register: (data: { phone: string; password: string; fullName: string; bankName: string; bankAccount: string }) =>
        api.post('/auth/register', data),
};

// Add token to requests
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

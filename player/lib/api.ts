import axios from 'axios';

let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Force HTTPS in production (client-side only or if we can detect env)
if (process.env.NODE_ENV === 'production' && !apiUrl.startsWith('https://')) {
    apiUrl = apiUrl.replace('http://', 'https://');
}

export const API_URL = apiUrl + '/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

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

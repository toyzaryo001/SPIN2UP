import axios from 'axios';


const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const baseUrl = rawApiUrl.replace(/\/$/, "").replace(/\/api$/, "");

const api = axios.create({
  baseURL: `${baseUrl}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the token if available
api.interceptors.request.use(
  async (config) => {
    if (typeof window !== 'undefined') {
      // Import dynamically to avoid build issues if used on server
      const { getSession } = await import('next-auth/react');
      const session = await getSession();

      const token = (session?.user as any)?.accessToken;

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle 401 (auto-logout)
api.interceptors.response.use(
  (response) => response,
  async (error: any) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Token expired or invalid - logout and redirect to login
      const { signOut } = await import('next-auth/react');
      await signOut({ callbackUrl: '/login' });
    }
    return Promise.reject(error);
  }
);

export default api;

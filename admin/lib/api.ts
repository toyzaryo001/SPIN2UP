import axios from 'axios';
import { signOut } from 'next-auth/react';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
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

      // @ts-ignore
      const token = session?.user?.accessToken;

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
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Token expired or invalid - logout and redirect to login
      await signOut({ callbackUrl: '/login' });
    }
    return Promise.reject(error);
  }
);

export default api;

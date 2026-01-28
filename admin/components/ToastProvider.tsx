'use client';

import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
    return (
        <Toaster
            position="top-center"
            reverseOrder={false}
            gutter={8}
            toastOptions={{
                duration: 3000,
                style: {
                    background: '#1e293b',
                    color: '#fff',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                },
                success: {
                    iconTheme: {
                        primary: '#22c55e',
                        secondary: '#fff',
                    },
                    style: {
                        border: '1px solid #22c55e40',
                    },
                },
                error: {
                    iconTheme: {
                        primary: '#ef4444',
                        secondary: '#fff',
                    },
                    style: {
                        border: '1px solid #ef444440',
                    },
                },
            }}
        />
    );
}

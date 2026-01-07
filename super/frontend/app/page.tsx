'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';

export default function HomePage() {
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('superAdminToken');
        if (token) {
            router.push('/prefixes');
        } else {
            router.push('/login');
        }
    }, [router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-black flex items-center justify-center">
            <div className="text-center">
                <Shield size={64} className="text-purple-500 animate-pulse mx-auto mb-4" />
                <p className="text-purple-300">กำลังโหลด...</p>
            </div>
        </div>
    );
}

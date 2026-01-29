'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, User, ExternalLink } from 'lucide-react';

import { toast } from 'react-hot-toast';

export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSetup, setShowSetup] = useState(false);
    const [setupData, setSetupData] = useState({ username: '', password: '', confirmPassword: '', fullName: '' });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

    useEffect(() => {
        const token = localStorage.getItem('superAdminToken');
        if (token) {
            router.push('/prefixes');
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (data.success) {
                localStorage.setItem('superAdminToken', data.data.token);
                localStorage.setItem('superAdminUser', JSON.stringify(data.data.user));
                toast.success('ยินดีต้อนรับเข้าสู่ระบบ');
                router.push('/prefixes');
            } else {
                setError(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
                toast.error(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
            }
        } catch (err) {
            setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
            toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setLoading(false);
        }
    };

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (setupData.password !== setupData.confirmPassword) {
            setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
            toast.error('รหัสผ่านไม่ตรงกัน');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/api/auth/setup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: setupData.username,
                    password: setupData.password,
                    fullName: setupData.fullName
                })
            });

            const data = await res.json();

            if (data.success) {
                toast.success('สร้าง Super Admin สำเร็จ! กรุณาเข้าสู่ระบบ');
                setShowSetup(false);
                setFormData({ username: setupData.username, password: setupData.password });
            } else {
                setError(data.message || 'ไม่สามารถสร้าง Super Admin ได้');
                toast.error(data.message || 'สร้างไม่สำเร็จ');
            }
        } catch (err) {
            setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
            toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-black flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl mb-4 shadow-lg shadow-purple-500/30">
                        <Shield size={40} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">PREFIX MASTER</h1>
                    <p className="text-purple-300 mt-2">ระบบจัดการ Prefix</p>
                </div>

                {/* Login Form */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-xl">
                    {!showSetup ? (
                        <>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <h2 className="text-xl font-semibold text-white text-center mb-6">เข้าสู่ระบบ Super Admin</h2>

                                {error && (
                                    <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-purple-200 text-sm font-medium mb-2">
                                        Username
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" size={20} />
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            className="w-full bg-white/10 border border-white/20 rounded-lg pl-10 pr-4 py-3 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            placeholder="superadmin"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-purple-200 text-sm font-medium mb-2">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" size={20} />
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full bg-white/10 border border-white/20 rounded-lg pl-10 pr-4 py-3 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30"
                                >
                                    <Shield size={20} />
                                    {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                                </button>
                            </form>
                            <div className="mt-4 text-center">
                                <button
                                    type="button"
                                    onClick={() => setShowSetup(true)}
                                    className="text-sm text-purple-400 hover:text-purple-300 underline"
                                >
                                    ตั้งค่า Super Admin คนแรก? (First Time Setup)
                                </button>
                            </div>
                        </>
                    ) : (
                        <form onSubmit={handleSetup} className="space-y-4">
                            <h2 className="text-xl font-semibold text-white text-center mb-6">สร้าง Super Admin คนแรก</h2>

                            {error && (
                                <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-purple-200 text-sm mb-1">NAME_ADMIN (ชื่อ-นามสกุล) *</label>
                                <input
                                    type="text"
                                    value={setupData.fullName}
                                    onChange={(e) => setSetupData({ ...setupData, fullName: e.target.value })}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-purple-200 text-sm mb-1">USERNAME *</label>
                                <input
                                    type="text"
                                    value={setupData.username}
                                    onChange={(e) => setSetupData({ ...setupData, username: e.target.value })}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-purple-200 text-sm mb-1">PASSWORD *</label>
                                <input
                                    type="password"
                                    value={setupData.password}
                                    onChange={(e) => setSetupData({ ...setupData, password: e.target.value })}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-purple-200 text-sm mb-1">CONFIRM_PASSWORD (ยืนยันรหัสผ่าน) *</label>
                                <input
                                    type="password"
                                    value={setupData.confirmPassword}
                                    onChange={(e) => setSetupData({ ...setupData, confirmPassword: e.target.value })}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white"
                                    required
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowSetup(false)}
                                    className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg disabled:opacity-50"
                                >
                                    {loading ? 'กำลังสร้าง...' : 'สร้าง Super Admin'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                <p className="text-center text-purple-400/60 text-sm mt-6">
                    © 2026 PREFIX MASTER SYSTEM
                </p>
            </div>
        </div>
    );
}

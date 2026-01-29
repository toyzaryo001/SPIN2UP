"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Lock, User, AlertCircle, Key } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [prefix, setPrefix] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [brandName, setBrandName] = useState("ADMIN");
    const [fixedPrefix, setFixedPrefix] = useState(false);
    const [isCheckingDomain, setIsCheckingDomain] = useState(true);

    // Auto-fix URL to ensure no double /api/api
    const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const API_URL = rawApiUrl.replace(/\/$/, "").replace(/\/api$/, "");

    useEffect(() => {


        const checkDomain = async () => {
            try {
                const hostname = window.location.hostname;

                // 1. Basic brand name fallback (existing logic)
                const parts = hostname.split('.');
                if (parts.length >= 2) {
                    const mainDomain = parts[parts.length - 2].toUpperCase();
                    if (mainDomain && mainDomain !== 'LOCALHOST') {
                        setBrandName(`${mainDomain} ADMIN`);
                    }
                }

                // 2. Fetch Config from Backend
                const res = await fetch(`${API_URL}/api/auth/config?domain=${hostname}`);
                const data = await res.json();

                if (data.success) {
                    // setPrefix(data.data.code.toUpperCase()); // User wants to type manually
                    setBrandName(data.data.name);
                    // setFixedPrefix(true); // User wants to see the field
                }
            } catch (err) {
                console.error("Domain config check failed", err);
            } finally {
                setIsCheckingDomain(false);
            }
        };

        checkDomain();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (!prefix) {
            setError("กรุณากรอก Prefix");
            setLoading(false);
            return;
        }

        try {
            const result = await signIn("credentials", {
                redirect: false,
                username,
                password,
                prefix: prefix.toLowerCase(),
            });

            if (result?.error) {
                setError(result.error);
            } else {

                router.push("/");
                router.refresh();
            }
        } catch (err) {
            setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
        } finally {
            setLoading(false);
        }
    };

    if (isCheckingDomain) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="text-white text-center">
                    <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p>กำลังตรวจสอบการติดตั้ง...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-500 to-amber-600 bg-clip-text text-transparent">
                            {brandName}
                        </h1>
                        <p className="text-slate-500 mt-2">เข้าสู่ระบบจัดการหลังบ้าน</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Username</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all text-slate-900"
                                    placeholder="admin"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">รหัสผ่าน</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all text-slate-900"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {/* Always show Prefix field */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Prefix</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    value={prefix}
                                    onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all text-slate-900 uppercase"
                                    placeholder=""
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                        </button>
                    </form>
                </div>
                <div className="bg-slate-50 p-4 text-center text-xs text-slate-400">
                    {brandName} Management System © 2026
                </div>
            </div>
        </div>
    );
}


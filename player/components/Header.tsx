"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, RotateCw, Wallet, Gift, Home, Gamepad2, Dices, Sparkles, Trophy } from "lucide-react";
import { API_URL } from "@/lib/api";
import axios from "axios";

interface HeaderProps {
    user?: any;
    settings?: any;
    onLogin?: () => void;
    onRegister?: () => void;
    onLogout?: () => void;
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

export default function Header({
    user: propUser,
    settings: propSettings,
    onLogin,
    onRegister,
    onLogout,
    onRefresh,
    isRefreshing: propIsRefreshing
}: HeaderProps) {
    const router = useRouter();

    // Internal state for when props are not provided (Inner pages)
    const [internalUser, setInternalUser] = useState<any>(null);
    const [internalSettings, setInternalSettings] = useState<any>(null);
    const [internalRefreshing, setInternalRefreshing] = useState(false);

    // Differentiate between controlled (props) and uncontrolled (internal) modes
    const user = propUser !== undefined ? propUser : internalUser;
    const settings = propSettings !== undefined ? propSettings : internalSettings;
    const isRefreshing = propIsRefreshing !== undefined ? propIsRefreshing : internalRefreshing;

    // --- INTERNAL DATA FETCHING (For Inner Pages) ---
    useEffect(() => {
        // Only fetch if props are not provided
        if (propUser === undefined) {
            const checkUser = () => {
                const userData = localStorage.getItem("user");
                if (userData && userData !== "undefined") {
                    try {
                        setInternalUser(JSON.parse(userData));
                    } catch (e) {
                        localStorage.removeItem("user");
                    }
                } else {
                    setInternalUser(null);
                }
            };

            checkUser();
            window.addEventListener('storage', checkUser);
            window.addEventListener('user-login', checkUser);
            window.addEventListener('user-logout', checkUser);

            return () => {
                window.removeEventListener('storage', checkUser);
                window.removeEventListener('user-login', checkUser);
                window.removeEventListener('user-logout', checkUser);
            };
        }
    }, [propUser]);

    useEffect(() => {
        if (propSettings === undefined) {
            const fetchSettings = async () => {
                try {
                    const res = await axios.get(`${API_URL}/public/settings`);
                    if (res.data && res.data.settings) {
                        setInternalSettings(res.data.settings);
                    }
                } catch (error) {
                    console.error("Failed to fetch settings", error);
                }
            };
            fetchSettings();
        }
    }, [propSettings]);

    // --- HANDLERS ---
    const handleLogin = onLogin || (() => router.push("/?action=login"));
    const handleRegister = onRegister || (() => router.push("/?action=register"));

    const handleLogout = onLogout || (async () => {
        // Call backend to clear sessionToken
        const token = localStorage.getItem("token");
        if (token) {
            try {
                await axios.post(`${API_URL}/auth/logout`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (e) { /* ignore */ }
        }
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setInternalUser(null);
        window.dispatchEvent(new Event('user-logout'));
        router.push("/");
    });

    const handleRefresh = onRefresh || (async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        setInternalRefreshing(true);
        try {
            const res = await axios.get(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setInternalUser(res.data.data);
                localStorage.setItem("user", JSON.stringify(res.data.data));
            }
        } catch (err) {
            console.error("Failed to refresh user:", err);
        } finally {
            setInternalRefreshing(false);
        }
    });

    const siteName = settings?.siteName;
    const logoUrl = settings?.logoUrl;

    return (
        <header className="sticky top-0 z-50 glass-card border-b-0 transition-all duration-300 bg-[#0D1117]/95 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 py-3 md:py-0 md:h-20 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0 relative">

                {/* Logo Area */}
                <div className="w-full md:w-auto flex justify-center md:justify-start relative cursor-pointer group z-10" onClick={() => router.push('/')}>
                    {logoUrl ? (
                        <img src={logoUrl} alt={siteName || "Logo"} className="h-20 md:h-24 object-contain animate-fade-in drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                    ) : siteName ? (
                        <div className="flex items-center gap-2 md:gap-3">
                            <span className="text-3xl">🎮</span>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white uppercase">
                                    {siteName}
                                </h1>
                                <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50"></div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-10 w-32 bg-white/5 rounded animate-pulse" />
                    )}
                </div>

                {/* Mobile Language Flag (Absolute Right) */}
                <div className="md:hidden absolute right-4 top-4 z-20">
                    <div className="w-7 h-7 rounded-full border border-white/10 overflow-hidden shadow-lg">
                        <img src="https://flagcdn.com/w80/th.png" alt="TH" className="w-full h-full object-cover" />
                    </div>
                </div>

                {/* Central Navigation (Desktop Only) */}
                <div className="flex-1 hidden md:flex items-center justify-center gap-2 lg:gap-8">
                    {[
                        { label: 'หน้าหลัก', href: '/', icon: Home },
                        { label: 'ฝาก/ถอน', href: '/deposit', icon: Wallet },
                        { label: 'กิจกรรม', href: '/activity', icon: Gift },
                        { label: 'โปรไฟล์', href: '/profile', icon: User },
                    ].map((item, index) => (
                        <button
                            key={index}
                            onClick={() => router.push(item.href)}
                            className="flex items-center gap-2 text-slate-300 hover:text-white hover:bg-white/5 py-2 px-4 rounded-full transition-all group"
                        >
                            <item.icon className="w-4 h-4 text-slate-400 group-hover:text-yellow-400 transition-colors" />
                            <span className="font-bold text-sm lg:text-base">{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* Auth / User Area */}
                <div className="w-full md:w-auto z-10">
                    {user ? (
                        <div className="flex items-center justify-between md:justify-end gap-4 bg-white/5 rounded-full p-1.5 pr-6 border border-white/10 hover:border-white/20 transition-all cursor-pointer group">
                            {/* User Info */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 p-0.5 shadow-lg">
                                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
                                        <User size={20} className="text-yellow-400" />
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Vip Level 1</span>
                                    <span className="text-sm font-black text-white group-hover:text-yellow-400 transition-colors">{user.username}</span>
                                </div>
                            </div>

                            {/* Balance */}
                            <div className="text-right mr-2">
                                <span className="text-xs text-green-400 block">Balance</span>
                                <span className="font-mono font-bold text-gradient-gold text-lg">฿{Number(user.balance).toLocaleString()}</span>
                            </div>

                            {/* Refresh Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRefresh();
                                }}
                                className={`p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-yellow-400 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                                title="อัพเดทยอดเงิน"
                            >
                                <RotateCw size={18} />
                            </button>

                            {/* Logout Button */}
                            <button
                                onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                                className="ml-2 p-2 rounded-full bg-red-500/10 hover:bg-red-500/30 border border-red-500/30 text-red-400 hover:text-red-300 transition-all"
                                title="ออกจากระบบ"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 w-full md:flex md:items-center mt-1 md:mt-0">
                            {/* Login Button (Blue) */}
                            <button
                                onClick={handleLogin}
                                className="w-full md:w-auto px-4 py-2.5 rounded-xl md:rounded-full font-bold text-sm md:text-base text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:to-blue-500 transition-all shadow-lg shadow-blue-500/20 border border-blue-500/50"
                            >
                                เข้าสู่ระบบ
                            </button>
                            {/* Register Button (Green) */}
                            <button
                                onClick={handleRegister}
                                className="w-full md:w-auto px-4 py-2.5 rounded-xl md:rounded-full font-bold text-sm md:text-base text-white bg-gradient-to-r from-green-500 to-green-600 hover:to-green-400 transition-all shadow-lg shadow-green-500/30 border border-green-400/50"
                            >
                                สมัครสมาชิก
                            </button>
                        </div>
                    )}
                </div>

                {/* Desktop Language Flag */}
                <div className="hidden md:block ml-4 w-10 h-10 rounded-full border border-white/10 overflow-hidden hover:scale-110 transition-transform cursor-pointer shadow-lg">
                    <img src="https://flagcdn.com/w80/th.png" alt="TH" className="w-full h-full object-cover opacity-80 hover:opacity-100" />
                </div>

            </div>
        </header>
    );
}

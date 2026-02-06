"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Globe, LogOut, Gift, MessageCircle, Home, Wallet, User } from "lucide-react";

export default function Header() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [brandName, setBrandName] = useState(""); // Default empty to show skeleton
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + "/api";

    useEffect(() => {
        const checkUser = () => {
            const userData = localStorage.getItem("user");
            if (userData && userData !== "undefined") {
                try {
                    setUser(JSON.parse(userData));
                } catch (e) {
                    localStorage.removeItem("user");
                }
            } else {
                setUser(null);
            }
        };

        checkUser();
        window.addEventListener('storage', checkUser);
        window.addEventListener('user-login', checkUser);
        window.addEventListener('user-logout', checkUser);

        // Fetch Branding
        const fetchBranding = async () => {
            const hostname = window.location.hostname;
            const setFallback = () => {
                const parts = hostname.split('.');
                if (parts.length >= 2) {
                    const mainDomain = parts[parts.length - 2].toUpperCase();
                    if (mainDomain !== 'LOCALHOST') {
                        setBrandName(mainDomain);
                    }
                }
            };

            try {
                const { default: axios } = await import("axios");
                const res = await axios.get(`${API_URL}/auth/config?domain=${hostname}`);
                if (res.data.success) {
                    setBrandName(res.data.data.name);
                    setLogoUrl(res.data.data.logo);
                } else {
                    setFallback();
                }
            } catch (error) {
                console.error("Branding error", error);
                setFallback();
            }
        };
        fetchBranding();

        return () => {
            window.removeEventListener('storage', checkUser);
            window.removeEventListener('user-login', checkUser);
            window.removeEventListener('user-logout', checkUser);
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        window.dispatchEvent(new Event('user-logout'));
        setShowMenu(false);
        router.push("/");
    };

    const handleNavigate = (path: string) => {
        setShowMenu(false);
        router.push(path);
    };

    return (
        <>
            <header className="sticky top-0 z-50 glass-card border-b-0 transition-all duration-300 bg-[#0D1117]/95 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 py-3 md:py-0 md:h-20 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0 relative">

                    {/* Logo Area */}
                    <div className="w-full md:w-auto flex justify-center md:justify-start relative cursor-pointer group z-10" onClick={() => router.push('/')}>
                        {logoUrl ? (
                            <img src={logoUrl} alt={brandName || "Logo"} className="h-20 md:h-24 object-contain animate-fade-in drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                        ) : brandName ? (
                            <div className="flex items-center gap-2 md:gap-3">
                                <span className="text-3xl">🎮</span>
                                <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white uppercase">
                                    {brandName}
                                </h1>
                            </div>
                        ) : (
                            <div className="h-10 w-32 bg-white/5 rounded animate-pulse" />
                        )}
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

                    {/* Right Section: User Info or Login/Register */}
                    <div className="w-full md:w-auto z-10 flex justify-center md:justify-end">
                        {user ? (
                            <div className="flex items-center justify-between md:justify-end gap-4 bg-white/5 rounded-full p-1.5 pr-6 border border-white/10 hover:border-white/20 transition-all cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 p-0.5 shadow-lg">
                                        <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
                                            <User size={20} className="text-yellow-400" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Member</span>
                                        <span className="text-sm font-black text-white group-hover:text-yellow-400 transition-colors">{user.username}</span>
                                    </div>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <span className="text-xs text-green-400 block">Balance</span>
                                    <span className="font-mono font-bold text-gradient-gold text-lg">฿{Number(user.balance).toLocaleString()}</span>
                                </div>
                                <button onClick={handleLogout} className="ml-2 p-2 rounded-full bg-red-500/10 hover:bg-red-500/30 border border-red-500/30 text-red-400 hover:text-red-300 transition-all" title="ออกจากระบบ">
                                    <LogOut size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 w-full md:flex md:items-center mt-1 md:mt-0 max-w-sm mx-auto md:max-w-none">
                                <button
                                    onClick={() => router.push('/?action=login')}
                                    className="w-full md:w-auto px-4 py-2.5 rounded-xl md:rounded-full font-bold text-sm md:text-base text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:to-blue-500 transition-all shadow-lg shadow-blue-500/20 border border-blue-500/50"
                                >
                                    เข้าสู่ระบบ
                                </button>
                                <button
                                    onClick={() => router.push('/?action=register')}
                                    className="w-full md:w-auto px-4 py-2.5 rounded-xl md:rounded-full font-bold text-sm md:text-base text-white bg-gradient-to-r from-green-500 to-green-600 hover:to-green-400 transition-all shadow-lg shadow-green-500/30 border border-green-400/50"
                                >
                                    สมัครสมาชิก
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Menu Drawer Overlay */}
            {showMenu && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.5)",
                        zIndex: 200,
                        animation: "fadeIn 0.2s ease"
                    }}
                    onClick={() => setShowMenu(false)}
                />
            )
            }

            {/* Menu Drawer */}
            <div style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                background: "linear-gradient(180deg, #161B22 0%, #0D1117 100%)",
                borderRadius: "24px 24px 0 0",
                zIndex: 300,
                transform: showMenu ? "translateY(0)" : "translateY(100%)",
                transition: "transform 0.3s ease",
                maxHeight: "80vh",
                overflow: "auto",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderBottom: "none"
            }}>
                {/* Close Button */}
                <button
                    onClick={() => setShowMenu(false)}
                    style={{
                        position: "absolute",
                        top: "16px",
                        right: "16px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "8px"
                    }}
                >
                    <X size={28} color="#FFD700" />
                </button>

                <div style={{ padding: "24px", paddingBottom: "40px" }}>
                    {/* Logo */}
                    <div style={{ textAlign: "center", marginBottom: "20px" }}>
                        {logoUrl ? (
                            <img src={logoUrl} alt={brandName} style={{ height: "60px", margin: "0 auto", objectFit: "contain" }} />
                        ) : (
                            <>
                                <span style={{ fontSize: "48px" }}>🎮</span>
                                <p style={{
                                    fontSize: "24px",
                                    fontWeight: 900,
                                    color: "#FFD700",
                                    textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                                    margin: "8px 0 0"
                                }}>{brandName}</p>
                            </>
                        )}
                    </div>

                    {/* User Info */}
                    {user ? (
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "rgba(255, 215, 0, 0.1)",
                            borderRadius: "16px",
                            padding: "16px",
                            marginBottom: "20px",
                            border: "1px solid rgba(255, 215, 0, 0.2)"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{
                                    width: "48px",
                                    height: "48px",
                                    background: "rgba(255, 215, 0, 0.2)",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "24px"
                                }}>
                                    👤
                                </div>
                                <div>
                                    <p style={{ fontSize: "16px", fontWeight: 700, color: "#FFD700", margin: 0 }}>
                                        {user.fullName}
                                    </p>
                                    <p style={{ fontSize: "12px", color: "#8B949E", margin: "4px 0 0" }}>
                                        {user.username}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleNavigate("/profile")}
                                style={{
                                    background: "rgba(0, 208, 132, 0.2)",
                                    color: "#00D084",
                                    border: "1px solid rgba(0, 208, 132, 0.3)",
                                    padding: "10px 16px",
                                    borderRadius: "10px",
                                    fontWeight: 600,
                                    fontSize: "13px",
                                    cursor: "pointer"
                                }}
                            >
                                ดูโปรไฟล์
                            </button>
                        </div>
                    ) : (
                        <div style={{
                            display: "flex",
                            gap: "12px",
                            marginBottom: "20px"
                        }}>
                            <button
                                onClick={() => handleNavigate("/?action=login")}
                                style={{
                                    flex: 1,
                                    background: "rgba(255, 255, 255, 0.1)",
                                    color: "#FFFFFF",
                                    border: "1px solid rgba(255, 255, 255, 0.2)",
                                    padding: "14px",
                                    borderRadius: "12px",
                                    fontWeight: 700,
                                    fontSize: "15px",
                                    cursor: "pointer"
                                }}
                            >
                                เข้าสู่ระบบ
                            </button>
                            <button
                                onClick={() => handleNavigate("/?action=register")}
                                style={{
                                    flex: 1,
                                    background: "linear-gradient(135deg, #FFD700, #FFC000)",
                                    color: "#0D1117",
                                    border: "none",
                                    padding: "14px",
                                    borderRadius: "12px",
                                    fontWeight: 700,
                                    fontSize: "15px",
                                    cursor: "pointer"
                                }}
                            >
                                สมัครสมาชิก
                            </button>
                        </div>
                    )}

                    {/* Deposit/Withdraw Buttons */}
                    {user && (
                        <div style={{
                            display: "flex",
                            gap: "12px",
                            marginBottom: "20px"
                        }}>
                            <button
                                onClick={() => handleNavigate("/deposit")}
                                style={{
                                    flex: 1,
                                    background: "linear-gradient(135deg, #10b981, #059669)",
                                    color: "white",
                                    border: "none",
                                    padding: "16px",
                                    borderRadius: "14px",
                                    fontWeight: 700,
                                    fontSize: "16px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    boxShadow: "0 4px 15px rgba(16,185,129,0.4)"
                                }}
                            >
                                💵 ฝากเงิน
                            </button>
                            <button
                                onClick={() => handleNavigate("/withdraw")}
                                style={{
                                    flex: 1,
                                    background: "linear-gradient(135deg, #F59E0B, #D97706)",
                                    color: "white",
                                    border: "none",
                                    padding: "16px",
                                    borderRadius: "14px",
                                    fontWeight: 700,
                                    fontSize: "16px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    boxShadow: "0 4px 15px rgba(245,158,11,0.4)"
                                }}
                            >
                                🎁 ถอน
                            </button>
                        </div>
                    )}

                    {/* Menu Items */}
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px"
                    }}>
                        <MenuItem
                            icon={<Home size={20} />}
                            label="เข้าสู่เว็บไซต์"
                            onClick={() => handleNavigate("/")}
                        />
                        <MenuItem
                            icon={<Gift size={20} />}
                            label="โปรโมชั่น"
                            onClick={() => handleNavigate("/promotions")}
                        />
                        <MenuItem
                            icon={<MessageCircle size={20} />}
                            label="ติดต่อแอดมิน"
                            onClick={() => {
                                setShowMenu(false);
                                // Trigger contact drawer on home page
                                router.push("/?showContact=true");
                            }}
                        />
                        {user && (
                            <MenuItem
                                icon={<LogOut size={20} />}
                                label="ออกจากระบบ"
                                onClick={handleLogout}
                                danger
                            />
                        )}
                    </div>

                    {/* Language/Flag */}
                    <div style={{
                        display: "flex",
                        justifyContent: "center",
                        marginTop: "24px"
                    }}>
                        <div style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "50%",
                            background: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "28px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                        }}>
                            🇹🇭
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// Menu Item Component
function MenuItem({ icon, label, onClick, danger }: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    danger?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "16px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "14px",
                cursor: "pointer",
                width: "100%",
                textAlign: "left"
            }}
        >
            <span style={{ color: danger ? "#EF4444" : "#FFD700" }}>{icon}</span>
            <span style={{
                fontSize: "15px",
                fontWeight: 600,
                color: danger ? "#EF4444" : "#FFFFFF"
            }}>
                {label}
            </span>
        </button>
    );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Globe, LogOut, Gift, MessageCircle, Home } from "lucide-react";

export default function Header() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [brandName, setBrandName] = useState("CASINO"); // Default
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

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
            <header className="sticky top-0 z-50 w-full bg-[#0D1117]/95 backdrop-blur-md border-b border-white/10 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 md:h-24">
                        {/* Logo Area */}
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/" className="flex items-center gap-2 group">
                                {logoUrl ? (
                                    <img
                                        src={logoUrl}
                                        alt={brandName}
                                        className="h-10 md:h-20 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                                    />
                                ) : (
                                    <>
                                        <span className="text-3xl md:text-5xl">🎮</span>
                                        <span className="text-xl md:text-3xl font-black text-[#FFD700] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] tracking-wide">
                                            {brandName}
                                        </span>
                                    </>
                                )}
                            </Link>
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center space-x-8">
                            <Link href="/" className="text-gray-300 hover:text-[#FFD700] hover:bg-white/5 px-3 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2">
                                <Home size={18} /> หน้าหลัก
                            </Link>
                            <Link href="/promotions" className="text-gray-300 hover:text-[#FFD700] hover:bg-white/5 px-3 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2">
                                <Gift size={18} /> โปรโมชั่น
                            </Link>
                            <button
                                onClick={() => router.push("/?showContact=true")}
                                className="text-gray-300 hover:text-[#FFD700] hover:bg-white/5 px-3 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2"
                            >
                                <MessageCircle size={18} /> ติดต่อเรา
                            </button>
                        </nav>

                        {/* Right Section: User Info or Login/Register */}
                        <div className="flex items-center gap-4">
                            {user ? (
                                <>
                                    {/* Desktop User Balance Panel */}
                                    <div className="hidden md:flex items-center gap-4 bg-[#161B22] border border-[#30363d] rounded-xl p-2 pr-6 shadow-inner">
                                        <div className="flex items-center gap-3 px-3 border-r border-gray-700">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD700] to-[#F59E0B] flex items-center justify-center text-black font-bold text-xl shadow-lg">
                                                {user.fullName.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[#FFD700] text-sm font-bold leading-tight">{user.username}</span>
                                                <span className="text-gray-400 text-xs cursor-pointer hover:text-white" onClick={() => handleNavigate("/profile")}>ดูโปรไฟล์</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end min-w-[100px]">
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Balance</span>
                                            <span className="text-white font-mono font-bold text-lg select-all">฿{Number(user.balance || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="h-8 w-px bg-gray-700 mx-2"></div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleNavigate("/deposit")}
                                                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-lg hover:shadow-green-500/20 transition-all transform hover:-translate-y-0.5"
                                            >
                                                ฝาก
                                            </button>
                                            <button
                                                onClick={() => handleNavigate("/withdraw")}
                                                className="bg-[#21262D] hover:bg-[#30363d] text-white border border-gray-600 hover:border-gray-500 text-sm font-bold px-4 py-2 rounded-lg transition-all"
                                            >
                                                ถอน
                                            </button>
                                        </div>
                                    </div>

                                    {/* Mobile/Tablet Balance (simplified) */}
                                    <div className="md:hidden flex items-center gap-2 bg-[#161B22]/80 backdrop-blur border border-white/10 rounded-full px-3 py-1.5">
                                        <span className="text-[#FFD700] text-sm font-bold">฿{Number(user.balance || 0).toLocaleString()}</span>
                                        <div className="w-px h-4 bg-white/20"></div>
                                        <div
                                            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center cursor-pointer active:scale-95"
                                            onClick={() => handleNavigate("/deposit")}
                                        >
                                            <span className="text-xs">💰</span>
                                        </div>
                                    </div>

                                    {/* Mobile Menu Button */}
                                    <button
                                        onClick={() => setShowMenu(true)}
                                        className="md:hidden p-2 rounded-lg border border-[#FFD700]/30 bg-[#FFD700]/10 text-[#FFD700]"
                                    >
                                        <div className="flex flex-col gap-[5px]">
                                            <div className="w-5 h-0.5 bg-[#FFD700] rounded-full"></div>
                                            <div className="w-5 h-0.5 bg-[#FFD700] rounded-full"></div>
                                            <div className="w-5 h-0.5 bg-[#FFD700] rounded-full"></div>
                                        </div>
                                    </button>
                                </>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Link
                                        href="/?action=login"
                                        className="hidden md:inline-flex px-6 py-2.5 rounded-full border border-white/20 text-white font-bold text-sm hover:bg-white/10 transition-all"
                                    >
                                        เข้าสู่ระบบ
                                    </Link>
                                    <Link
                                        href="/?action=register"
                                        className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFC000] text-[#0D1117] font-bold text-sm hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all transform hover:-translate-y-0.5"
                                    >
                                        สมัครสมาชิก
                                    </Link>
                                </div>
                            )}
                        </div>
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

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Globe, LogOut, Gift, MessageCircle, Home } from "lucide-react";

export default function Header() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [showMenu, setShowMenu] = useState(false);

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
            <header style={{
                background: "linear-gradient(135deg, #0D1117, #161B22, #1A1F26)",
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
                zIndex: 50,
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
            }}>
                {/* Logo */}
                <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "32px" }}>🎮</span>
                    <span style={{
                        fontSize: "22px",
                        fontWeight: 900,
                        color: "#FFD700",
                        textShadow: "2px 2px 4px rgba(0,0,0,0.5)"
                    }}>CHECK24M</span>
                </Link>

                {/* Balance Display (when logged in) + Hamburger */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {user ? (
                        <>
                            {/* Balance Info */}
                            <div style={{
                                background: "rgba(255,215,0,0.1)",
                                borderRadius: "12px",
                                padding: "8px 14px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-end",
                                backdropFilter: "blur(10px)",
                                border: "1px solid rgba(255, 215, 0, 0.3)"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <div style={{ textAlign: "right" }}>
                                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.8)" }}>เงิน</span>
                                        <p style={{ fontSize: "14px", fontWeight: 700, color: "white", margin: 0 }}>
                                            ฿ {Number(user.balance || 0).toFixed(2)}
                                        </p>
                                    </div>
                                    <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.3)" }} />
                                    <div style={{ textAlign: "right" }}>
                                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.8)" }}>เครดิต</span>
                                        <p style={{ fontSize: "14px", fontWeight: 700, color: "white", margin: 0 }}>
                                            {Number(user.bonusBalance || 0).toFixed(2)}
                                        </p>
                                    </div>
                                    <div style={{
                                        background: "rgba(255,255,255,0.2)",
                                        borderRadius: "8px",
                                        padding: "6px",
                                        cursor: "pointer"
                                    }} onClick={() => handleNavigate("/deposit")}>
                                        💰
                                    </div>
                                </div>
                            </div>

                            {/* Hamburger Menu Button - Only when logged in */}
                            <button
                                onClick={() => setShowMenu(true)}
                                style={{
                                    background: "rgba(255, 215, 0, 0.1)",
                                    border: "2px solid rgba(255, 215, 0, 0.4)",
                                    borderRadius: "10px",
                                    padding: "10px 12px",
                                    cursor: "pointer",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "4px"
                                }}
                            >
                                <div style={{ width: "22px", height: "3px", background: "#FFD700", borderRadius: "2px" }} />
                                <div style={{ width: "22px", height: "3px", background: "#FFD700", borderRadius: "2px" }} />
                                <div style={{ width: "22px", height: "3px", background: "#FFD700", borderRadius: "2px" }} />
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Login Button */}
                            <Link
                                href="/?action=login"
                                style={{
                                    background: "rgba(255, 255, 255, 0.1)",
                                    color: "#FFFFFF",
                                    padding: "6px 14px",
                                    borderRadius: "20px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    textDecoration: "none",
                                    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                                    border: "1px solid rgba(255, 255, 255, 0.2)"
                                }}
                            >
                                เข้าสู่ระบบ
                            </Link>

                            {/* Register Button */}
                            <Link
                                href="/?action=register"
                                style={{
                                    background: "linear-gradient(135deg, #FFD700, #FFC000)",
                                    color: "#0D1117",
                                    padding: "6px 14px",
                                    borderRadius: "20px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    textDecoration: "none",
                                    boxShadow: "0 2px 10px rgba(255, 215, 0, 0.3)",
                                    border: "1px solid rgba(255, 215, 0, 0.5)"
                                }}
                            >
                                สมัครสมาชิก
                            </Link>
                        </>
                    )}
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
                        <span style={{ fontSize: "48px" }}>🎮</span>
                        <p style={{
                            fontSize: "24px",
                            fontWeight: 900,
                            color: "#FFD700",
                            textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                            margin: "8px 0 0"
                        }}>CHECK24M</p>
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

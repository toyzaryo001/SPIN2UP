"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PlayerLayout from "@/components/PlayerLayout";
import ContactDrawer from "@/components/ContactDrawer";

export default function ActivityPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [showContactDrawer, setShowContactDrawer] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData && userData !== "undefined") {
            try {
                setUser(JSON.parse(userData));
            } catch (e) {
                console.error("Failed to parse user data");
            }
        }
    }, []);

    const handleNavigate = (path: string, requireAuth = true) => {
        if (requireAuth && !user) {
            router.push("/?action=login");
            return;
        }
        router.push(path);
    };

    // Quick action items based on reference image
    const quickActions = [
        {
            icon: "💰",
            label: "แชร์รับรายได้",
            path: "/referral",
            gradient: "linear-gradient(135deg, #FFD700, #FFA500)"
        },
        {
            icon: "💸",
            label: "คืนยอดเสีย",
            path: "/cashback",
            gradient: "linear-gradient(135deg, #10b981, #059669)"
        },
        {
            icon: "👑",
            label: "VIP",
            path: "/rank",
            gradient: "linear-gradient(135deg, #8B5CF6, #7C3AED)"
        },
        {
            icon: "🏆",
            label: "ค่าคอม 4 ชั้น",
            path: "/commission",
            gradient: "linear-gradient(135deg, #F59E0B, #D97706)"
        },
        {
            icon: "🎁",
            label: "โปรโมชั่น",
            path: "/promotions",
            gradient: "linear-gradient(135deg, #EC4899, #DB2777)"
        },
    ];

    return (
        <PlayerLayout>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Balance Card */}
                {/* Balance Card Removed as requested */}

                {/* Quick Actions Grid */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "12px"
                }}>
                    {quickActions.map((action, index) => (
                        <button
                            key={index}
                            onClick={() => handleNavigate(action.path)}
                            style={{
                                background: "#21262D",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "16px",
                                padding: "16px 8px",
                                cursor: "pointer",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "10px",
                                boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
                                transition: "transform 0.2s"
                            }}
                        >
                            <div style={{
                                width: "56px",
                                height: "56px",
                                borderRadius: "14px",
                                background: action.gradient,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "28px",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                            }}>
                                {action.icon}
                            </div>
                            <span style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                color: "#FFFFFF",
                                textAlign: "center",
                                lineHeight: 1.3
                            }}>
                                {action.label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Contact Button */}
                <button
                    onClick={() => setShowContactDrawer(true)}
                    style={{
                        background: "#21262D",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "16px",
                        padding: "16px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
                        width: "fit-content"
                    }}
                >
                    <div style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: "linear-gradient(135deg, #06C755, #00B744)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "24px",
                        color: "white",
                        fontWeight: 700
                    }}>
                        💬
                    </div>
                    <span style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#FFFFFF"
                    }}>
                        ติดต่อ
                    </span>
                </button>

                {/* Promo Banner Area */}
                <div style={{
                    marginTop: "10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px"
                }}>
                    {/* Streak Banner */}
                    <button
                        onClick={() => handleNavigate("/streak")}
                        style={{
                            background: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
                            border: "none",
                            borderRadius: "16px",
                            padding: "20px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "16px",
                            boxShadow: "0 4px 20px rgba(255,107,107,0.3)",
                            width: "100%",
                            textAlign: "left"
                        }}
                    >
                        <span style={{ fontSize: "40px" }}>🔥</span>
                        <div>
                            <p style={{ fontSize: "18px", fontWeight: 800, color: "white", margin: 0 }}>
                                Daily Streak
                            </p>
                            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", marginTop: "4px" }}>
                                เล่นทุกวันรับโบนัสสะสม!
                            </p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Contact Drawer */}
            <ContactDrawer isOpen={showContactDrawer} onClose={() => setShowContactDrawer(false)} />
        </PlayerLayout>
    );
}

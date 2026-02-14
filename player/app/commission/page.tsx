"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PlayerLayout from "@/components/PlayerLayout";
import { Share2, ChevronRight } from "lucide-react";
import axios from "axios";
import { API_URL } from "@/lib/api";

interface CommissionLevel {
    level: number;
    rate: number;
    description: string;
    isActive: boolean;
}

export default function CommissionPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [settings, setSettings] = useState<CommissionLevel[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"income" | "info">("income");

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

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get(`${API_URL}/public/commission`);
                if (Array.isArray(res.data)) {
                    setSettings(res.data);
                }
            } catch (error) {
                console.error("Failed to fetch commission settings", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    // Commission tiers from API or defaults
    const tiers = settings.length > 0
        ? settings.map(s => ({
            level: s.level,
            rate: `${Number(s.rate).toFixed(1)}%`,
            desc: s.description || `ชั้นที่ ${s.level}`
        }))
        : [
            { level: 1, rate: "0.5%", desc: "แนะนำตรง" },
            { level: 2, rate: "0.3%", desc: "ชั้นที่ 2" },
            { level: 3, rate: "0.2%", desc: "ชั้นที่ 3" },
            { level: 4, rate: "0.1%", desc: "ชั้นที่ 4" },
        ];

    const categories = [
        { name: "สล็อต", icon: "🎰", commission: "0.00" },
        { name: "คาสิโน", icon: "🎲", commission: "0.00" },
        { name: "กีฬา", icon: "⚽", commission: "0.00" },
        { name: "เกมโต๊ะ", icon: "🃏", commission: "0.00" },
    ];

    if (loading) {
        return <PlayerLayout><div style={{ padding: "40px", textAlign: "center" }}>กำลังโหลด...</div></PlayerLayout>;
    }

    return (
        <PlayerLayout>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Breadcrumb Header */}
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                            onClick={() => router.push("/activity")}
                            style={{ color: "#8B949E", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
                        >
                            กิจกรรม
                        </span>
                        <span style={{ color: "#555", fontSize: "14px" }}>/</span>
                        <span style={{ color: "#FFD700", fontSize: "14px", fontWeight: 600 }}>ค่าคอม 4 ชั้น</span>
                    </div>
                    <button style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        background: "transparent",
                        border: "none",
                        color: "#8B949E",
                        fontSize: "14px",
                        fontWeight: 600,
                        cursor: "pointer"
                    }}>
                        แชร์ <Share2 size={16} />
                    </button>
                </div>

                {/* Credit Section */}
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}>
                    <span style={{ fontSize: "16px", fontWeight: 600, color: "#FFFFFF" }}>
                        รับเครดิตฟรี
                    </span>
                    <button
                        onClick={() => { }}
                        style={{
                            background: "linear-gradient(135deg, #FFD700, #FFC000)",
                            color: "#0D1117",
                            border: "none",
                            padding: "10px 20px",
                            borderRadius: "10px",
                            fontWeight: 600,
                            fontSize: "14px",
                            cursor: "pointer"
                        }}
                    >
                        ประวัติ
                    </button>
                </div>

                {/* Main Banner */}
                <div style={{
                    position: "relative",
                    borderRadius: "20px",
                    overflow: "hidden",
                    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
                    padding: "24px",
                    minHeight: "180px"
                }}>
                    {/* Trophy Image */}
                    <div style={{
                        position: "absolute",
                        bottom: "-20px",
                        left: "20px",
                        fontSize: "120px",
                        opacity: 0.9
                    }}>
                        🏆
                    </div>

                    {/* Content */}
                    <div style={{
                        position: "relative",
                        zIndex: 1,
                        textAlign: "right"
                    }}>
                        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", marginBottom: "8px" }}>
                            ปัจจุบัน
                        </p>
                        <p style={{
                            fontSize: "36px",
                            fontWeight: 900,
                            color: "#FFD700",
                            textShadow: "0 0 20px rgba(255,215,0,0.5)",
                            margin: "0 0 16px"
                        }}>
                            ฿ 0.00
                        </p>
                        <button
                            onClick={() => router.push("/")}
                            style={{
                                background: "linear-gradient(135deg, #FFD700, #FFA500)",
                                color: "#1a1a2e",
                                border: "none",
                                padding: "14px 28px",
                                borderRadius: "12px",
                                fontWeight: 700,
                                fontSize: "16px",
                                cursor: "pointer",
                                boxShadow: "0 4px 15px rgba(255,215,0,0.4)"
                            }}
                        >
                            เล่นเกมเพิ่ม
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "40px",
                    borderBottom: "2px solid rgba(255,255,255,0.1)",
                    paddingBottom: "12px"
                }}>
                    <button
                        onClick={() => setActiveTab("income")}
                        style={{
                            background: "transparent",
                            border: "none",
                            fontSize: "16px",
                            fontWeight: 600,
                            color: activeTab === "income" ? "#FFD700" : "#8B949E",
                            cursor: "pointer",
                            position: "relative",
                            paddingBottom: "12px"
                        }}
                    >
                        รายได้
                        {activeTab === "income" && (
                            <div style={{
                                position: "absolute",
                                bottom: "-14px",
                                left: 0,
                                right: 0,
                                height: "3px",
                                background: "#FFD700",
                                borderRadius: "2px"
                            }} />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("info")}
                        style={{
                            background: "transparent",
                            border: "none",
                            fontSize: "16px",
                            fontWeight: 600,
                            color: activeTab === "info" ? "#FFD700" : "#8B949E",
                            cursor: "pointer",
                            position: "relative",
                            paddingBottom: "12px"
                        }}
                    >
                        ข้อมูลรายได้
                        {activeTab === "info" && (
                            <div style={{
                                position: "absolute",
                                bottom: "-14px",
                                left: 0,
                                right: 0,
                                height: "3px",
                                background: "#FFD700",
                                borderRadius: "2px"
                            }} />
                        )}
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === "income" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {/* Category List */}
                        {categories.map((cat, index) => (
                            <div
                                key={index}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    background: "#21262D",
                                    borderRadius: "14px",
                                    padding: "16px 20px",
                                    border: "2px solid #FFD700",
                                    boxShadow: "0 2px 10px rgba(0,0,0,0.15)"
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <span style={{ fontSize: "24px" }}>{cat.icon}</span>
                                    <span style={{ fontSize: "15px", fontWeight: 600, color: "#FFD700" }}>
                                        ประเภท {cat.name}
                                    </span>
                                </div>
                                <span style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF" }}>
                                    ฿ {cat.commission}
                                </span>
                            </div>
                        ))}

                        {/* Total */}
                        <div style={{
                            background: "linear-gradient(135deg, #FFD700, #FFC000)",
                            borderRadius: "14px",
                            padding: "20px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: "8px"
                        }}>
                            <span style={{ fontSize: "16px", fontWeight: 700, color: "#0D1117" }}>
                                รวมค่าคอมทั้งหมด
                            </span>
                            <span style={{ fontSize: "20px", fontWeight: 800, color: "#0D1117" }}>
                                ฿ 0.00
                            </span>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {/* Tier Info */}
                        <div style={{
                            background: "#21262D",
                            borderRadius: "16px",
                            padding: "20px",
                            boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
                            border: "1px solid rgba(255,255,255,0.1)"
                        }}>
                            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF", marginBottom: "16px" }}>
                                🏆 ระบบค่าคอม 4 ชั้น
                            </h3>
                            <p style={{ fontSize: "13px", color: "#8B949E", lineHeight: 1.6, marginBottom: "20px" }}>
                                รับค่าคอมมิชชั่นจากเพื่อนที่คุณแนะนำ และเพื่อนของเพื่อนอีก 4 ชั้น!
                                ยิ่งชวนมาก ยิ่งได้มาก!
                            </p>

                            {/* Tier List */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {tiers.map((tier, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "14px 16px",
                                            background: index === 0 ? "rgba(255, 215, 0, 0.1)" : "rgba(255,255,255,0.05)",
                                            borderRadius: "12px",
                                            border: index === 0 ? "2px solid #FFD700" : "1px solid rgba(255,255,255,0.1)"
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                            <div style={{
                                                width: "32px",
                                                height: "32px",
                                                borderRadius: "50%",
                                                background: index === 0
                                                    ? "linear-gradient(135deg, #F59E0B, #D97706)"
                                                    : "#ddd",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: "white",
                                                fontWeight: 700,
                                                fontSize: "14px"
                                            }}>
                                                {tier.level}
                                            </div>
                                            <span style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF" }}>
                                                {tier.desc}
                                            </span>
                                        </div>
                                        <span style={{
                                            fontSize: "16px",
                                            fontWeight: 700,
                                            color: index === 0 ? "#FFD700" : "#8B949E"
                                        }}>
                                            {tier.rate}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Referral Link */}
                        <button
                            onClick={() => router.push("/referral")}
                            style={{
                                background: "linear-gradient(135deg, #10b981, #059669)",
                                color: "white",
                                border: "none",
                                padding: "18px",
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
                            ไปหน้าแชร์รับรายได้ <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>
        </PlayerLayout>
    );
}

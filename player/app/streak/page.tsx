"use client";

import { useState, useEffect } from "react";
import PlayerLayout from "@/components/PlayerLayout";
import { Calendar, Flame } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface StreakDay {
    day: number;
    minDeposit: number;
    bonusAmount: number;
    isActive: boolean;
}

export default function StreakPage() {
    const { user, loading: authLoading } = useAuth(true);
    const [settings, setSettings] = useState<StreakDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentStreak] = useState(0); // TODO: Fetch from user data

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get(`${API_URL}/public/streak`);
                if (Array.isArray(res.data)) {
                    setSettings(res.data);
                }
            } catch (error) {
                console.error("Failed to fetch streak settings", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    if (authLoading || loading) {
        return <PlayerLayout><div style={{ padding: "40px", textAlign: "center" }}>กำลังโหลด...</div></PlayerLayout>;
    }

    if (!user) return null;

    // Create streak data from API or defaults
    const streakBonus = settings.length > 0
        ? settings.map(s => ({
            day: s.day,
            bonus: Number(s.bonusAmount),
            minDeposit: Number(s.minDeposit),
            claimed: s.day <= currentStreak
        }))
        : [
            { day: 1, bonus: 10, minDeposit: 100, claimed: false },
            { day: 2, bonus: 20, minDeposit: 100, claimed: false },
            { day: 3, bonus: 30, minDeposit: 100, claimed: false },
            { day: 4, bonus: 50, minDeposit: 100, claimed: false },
            { day: 5, bonus: 100, minDeposit: 100, claimed: false },
            { day: 6, bonus: 150, minDeposit: 100, claimed: false },
            { day: 7, bonus: 300, minDeposit: 100, claimed: false },
        ];

    return (
        <PlayerLayout>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Banner */}
                <div style={{
                    background: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
                    borderRadius: "16px",
                    padding: "20px",
                    color: "white",
                    boxShadow: "0 4px 20px rgba(255, 107, 107, 0.3)",
                    display: "flex", alignItems: "center", gap: "12px"
                }}>
                    <span style={{ fontSize: "40px", filter: "drop-shadow(2px 2px 4px rgba(0,0,0,0.2))" }}>🔥</span>
                    <div>
                        <h1 style={{ fontSize: "22px", fontWeight: 900, margin: 0, textShadow: "1px 1px 2px rgba(0,0,0,0.2)" }}>ฝากต่อเนื่อง</h1>
                        <p style={{ fontSize: "14px", opacity: 0.9, marginTop: "4px" }}>ทำภารกิจสะสมวันรับโบนัสฟรี</p>
                    </div>
                </div>

                {/* Current Streak */}
                <div style={{
                    background: "rgba(255,255,255,0.95)",
                    borderRadius: "16px",
                    padding: "24px",
                    textAlign: "center",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                    border: "2px solid rgba(255,149,0,0.2)"
                }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "8px" }}>
                        <Flame size={44} color="#FF9500" style={{ animation: "pulse 2s infinite" }} />
                        <span style={{
                            fontSize: "64px",
                            fontWeight: 900,
                            background: "linear-gradient(135deg, #FF9500, #EF4444)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent"
                        }}>
                            {currentStreak}
                        </span>
                    </div>
                    <p style={{ color: "#666", fontWeight: 600, fontSize: "15px" }}>วันที่ฝากต่อเนื่อง</p>
                    <div style={{ width: "100%", background: "#e5e5e5", height: "10px", borderRadius: "5px", marginTop: "16px", overflow: "hidden" }}>
                        <div style={{
                            height: "100%",
                            background: "linear-gradient(90deg, #FF9500, #EF4444)",
                            width: `${(currentStreak / 7) * 100}%`,
                            borderRadius: "5px",
                            transition: "width 0.5s"
                        }} />
                    </div>
                </div>

                {/* Calendar Grid */}
                <div style={{
                    background: "rgba(255,255,255,0.95)",
                    borderRadius: "16px",
                    padding: "20px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                        <Calendar size={20} color="#FF9500" />
                        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#333" }}>โบนัสประจำวัน</h3>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
                        {streakBonus.map((item) => (
                            <div
                                key={item.day}
                                style={{
                                    background: item.claimed
                                        ? "linear-gradient(135deg, #FF9500, #FF7A00)"
                                        : item.day === currentStreak + 1
                                            ? "#FFF7ED"
                                            : "#f8f8f8",
                                    borderRadius: "12px",
                                    padding: "12px 8px",
                                    textAlign: "center",
                                    border: item.day === currentStreak + 1 ? "2px solid #FF9500" : "none",
                                    boxShadow: item.claimed ? "0 4px 12px rgba(255,149,0,0.3)" : "none"
                                }}
                            >
                                <p style={{
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    color: item.claimed ? "rgba(255,255,255,0.9)" : "#888",
                                    marginBottom: "4px"
                                }}>
                                    วัน {item.day}
                                </p>
                                <p style={{
                                    fontSize: "16px",
                                    fontWeight: 800,
                                    color: item.claimed ? "white" : "#333"
                                }}>
                                    ฿{item.bonus}
                                </p>
                                {item.claimed && (
                                    <span style={{ fontSize: "14px" }}>✓</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Info */}
                <div style={{
                    background: "white",
                    borderRadius: "14px",
                    padding: "16px",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
                }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#333", marginBottom: "12px" }}>📋 เงื่อนไข</h3>
                    <ul style={{ fontSize: "13px", color: "#666", lineHeight: 1.8, paddingLeft: "20px", margin: 0 }}>
                        <li>ฝากขั้นต่ำ ฿{settings[0]?.minDeposit || 100} ต่อวัน</li>
                        <li>ฝากครบ 7 วันติดต่อกัน รับโบนัสรวม ฿{streakBonus.reduce((a, b) => a + b.bonus, 0)}</li>
                        <li>หากขาดวันใดวันหนึ่ง ต้องเริ่มนับใหม่</li>
                        <li>โบนัสจะเข้าบัญชีอัตโนมัติเมื่อฝากสำเร็จ</li>
                    </ul>
                </div>
            </div>
        </PlayerLayout>
    );
}

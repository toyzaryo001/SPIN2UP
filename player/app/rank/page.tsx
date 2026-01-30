"use client";

import { useState, useEffect } from "react";
import PlayerLayout from "@/components/PlayerLayout";
import { Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

const ranks = [
    { name: "Bronze", gradient: "linear-gradient(135deg, #CD7F32, #A0522D)", icon: "🥉", minDeposit: 0, benefit: "Cashback 3%" },
    { name: "Silver", gradient: "linear-gradient(135deg, #C0C0C0, #A8A8A8)", icon: "🥈", minDeposit: 5000, benefit: "Cashback 4%" },
    { name: "Gold", gradient: "linear-gradient(135deg, #FFD700, #FFA500)", icon: "🥇", minDeposit: 20000, benefit: "Cashback 5%" },
    { name: "Platinum", gradient: "linear-gradient(135deg, #00CED1, #4169E1)", icon: "💎", minDeposit: 50000, benefit: "Cashback 7%" },
    { name: "Diamond", gradient: "linear-gradient(135deg, #9B59B6, #E91E63)", icon: "👑", minDeposit: 100000, benefit: "Cashback 10%" },
];

export default function RankPage() {
    const { user, loading: authLoading } = useAuth(true);
    const [totalDeposit, setTotalDeposit] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem("token");
            if (!token) return;
            try {
                const res = await axios.get(`${API_URL}/users/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data.success) {
                    setTotalDeposit(Number(res.data.data.totalDeposit || 0));
                }
            } catch (error) {
                console.error("Failed to fetch user data for rank", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    if (authLoading || loading) {
        return <PlayerLayout><div style={{ padding: "40px", textAlign: "center" }}>กำลังโหลด...</div></PlayerLayout>;
    }
    if (!user) return null;

    // Calculate Rank Logic
    let currentRank = 0;
    for (let i = ranks.length - 1; i >= 0; i--) {
        if (totalDeposit >= ranks[i].minDeposit) {
            currentRank = i;
            break;
        }
    }

    const nextRankIndex = currentRank + 1;
    const nextRank = ranks[nextRankIndex];
    const nextRankDeposit = nextRank ? nextRank.minDeposit : ranks[currentRank].minDeposit; // Maxed out?

    // Progress Calculation
    let progress = 0;
    if (nextRank) {
        const currentLevelBase = ranks[currentRank].minDeposit;
        const gap = nextRankDeposit - currentLevelBase;
        const achieved = totalDeposit - currentLevelBase;
        // Basic progress within the level
        progress = (achieved / gap) * 100;
        // Or simpler absolute progress towards goal:
        // progress = (totalDeposit / nextRankDeposit) * 100; // This usually looks better for "Total Deposit 5000/10000"
        progress = (totalDeposit / nextRankDeposit) * 100;
    } else {
        progress = 100; // Max Rank
    }

    return (
        <PlayerLayout>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Banner */}
                <div style={{
                    background: "linear-gradient(135deg, #FFD700 0%, #FFC000 100%)",
                    borderRadius: "16px",
                    padding: "20px",
                    color: "#0D1117",
                    boxShadow: "0 4px 20px rgba(255, 215, 0, 0.3)",
                    display: "flex", alignItems: "center", gap: "12px"
                }}>
                    <span style={{ fontSize: "40px" }}>👑</span>
                    <div>
                        <h1 style={{ fontSize: "22px", fontWeight: 900, margin: 0, textShadow: "1px 1px 2px rgba(0,0,0,0.1)" }}>VIP Club</h1>
                        <p style={{ fontSize: "14px", opacity: 0.9, marginTop: "4px" }}>ยิ่งเล่นยิ่งได้ ยิ่งฝากยิ่งคุ้ม</p>
                    </div>
                </div>

                {/* Current Rank Card */}
                <div style={{
                    background: ranks[currentRank].gradient,
                    borderRadius: "16px",
                    padding: "28px",
                    textAlign: "center",
                    color: "white",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
                    position: "relative",
                    overflow: "hidden"
                }}>
                    <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.1)" }} />
                    <div style={{ position: "relative", zIndex: 1 }}>
                        <span style={{ fontSize: "64px", display: "block", marginBottom: "12px", filter: "drop-shadow(2px 2px 4px rgba(0,0,0,0.3))" }}>
                            {ranks[currentRank].icon}
                        </span>
                        <h2 style={{ fontSize: "32px", fontWeight: 900, margin: "0 0 4px", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}>
                            {ranks[currentRank].name}
                        </h2>
                        <p style={{ opacity: 0.9, fontWeight: 600 }}>ระดับปัจจุบันของคุณ</p>
                        <p style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>ยอดฝากสะสม: ฿{totalDeposit.toLocaleString()}</p>
                    </div>
                </div>

                {/* Progress to Next Rank */}
                {nextRank ? (
                    <div style={{
                        background: "#21262D",
                        borderRadius: "16px",
                        padding: "20px",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                        border: "1px solid rgba(255,255,255,0.1)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                            <span style={{ fontSize: "14px", fontWeight: 700, color: "#8B949E" }}>
                                เลื่อนขั้นถัดไป: <span style={{ color: "#FFD700" }}>{nextRank.name}</span>
                            </span>
                            <span style={{ fontSize: "14px", fontWeight: 700, color: "#FFD700" }}>{progress.toFixed(0)}%</span>
                        </div>
                        <div style={{
                            height: "14px",
                            background: "rgba(255,255,255,0.1)",
                            borderRadius: "7px",
                            overflow: "hidden"
                        }}>
                            <div style={{
                                height: "100%",
                                background: "linear-gradient(90deg, #FFD700, #FFC000)",
                                borderRadius: "7px",
                                width: `${Math.min(progress, 100)}%`,
                                transition: "width 1s ease-out"
                            }} />
                        </div>
                        <p style={{ fontSize: "13px", color: "#8B949E", marginTop: "10px", textAlign: "center" }}>
                            ฝากอีก <span style={{ fontWeight: 700, color: "#FFFFFF" }}>฿{Math.max(0, nextRankDeposit - totalDeposit).toLocaleString()}</span> เพื่อเลื่อนขั้น
                        </p>
                    </div>
                ) : (
                    <div className="text-center p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
                        <span className="text-yellow-400 font-bold">คุณอยู่ในระดับสูงสุดแล้ว! 👑</span>
                    </div>
                )}

                {/* All Ranks */}
                <div style={{
                    background: "#21262D",
                    borderRadius: "16px",
                    padding: "20px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                    border: "1px solid rgba(255,255,255,0.1)"
                }}>
                    <h3 style={{ fontWeight: 700, marginBottom: "16px", color: "#FFFFFF", display: "flex", alignItems: "center", gap: "8px", fontSize: "16px" }}>
                        <Crown size={20} color="#FFD700" />
                        สิทธิพิเศษแต่ละระดับ
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {ranks.map((rank, index) => (
                            <div
                                key={rank.name}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "14px",
                                    padding: "14px",
                                    borderRadius: "14px",
                                    border: index === currentRank ? "2px solid #FFD700" : "1px solid rgba(255,255,255,0.1)",
                                    background: index === currentRank ? "rgba(255, 215, 0, 0.1)" : "rgba(255,255,255,0.05)",
                                    boxShadow: index === currentRank ? "0 4px 15px rgba(255,215,0,0.15)" : "none"
                                }}
                            >
                                <span style={{ fontSize: "32px" }}>{rank.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <p style={{
                                        fontWeight: 700,
                                        color: index === currentRank ? "#FFD700" : "#FFFFFF",
                                        fontSize: "15px",
                                        margin: 0
                                    }}>{rank.name}</p>
                                    <p style={{ fontSize: "12px", color: "#8B949E", marginTop: "2px" }}>ฝากสะสม ฿{rank.minDeposit.toLocaleString()}</p>
                                </div>
                                <div style={{
                                    padding: "8px 14px",
                                    background: "rgba(0, 208, 132, 0.1)",
                                    border: "1px solid rgba(0, 208, 132, 0.3)",
                                    borderRadius: "10px"
                                }}>
                                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#00D084", margin: 0 }}>{rank.benefit}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </PlayerLayout>
    );
}

"use client";

import PlayerLayout from "@/components/PlayerLayout";
import { Users, Copy, Check, Share2, Gift, Coins } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function ReferralPage() {
    const { user, loading } = useAuth(true);
    const [copied, setCopied] = useState(false);
    const referralCode = user?.username || "REF12345678";
    const referralLink = `https://spinup.com/r/${referralCode}`;
    const totalReferrals = 5;
    const totalCommission = 500.00;

    const referrals = [
        { id: 1, username: "user***01", date: "01/01/2025", commission: 100 },
        { id: 2, username: "user***02", date: "02/01/2025", commission: 100 },
        { id: 3, username: "user***03", date: "03/01/2025", commission: 100 },
    ];

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return <PlayerLayout><div style={{ padding: "40px", textAlign: "center" }}>กำลังโหลด...</div></PlayerLayout>;
    }

    if (!user) return null;

    return (
        <PlayerLayout>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Banner */}
                <div style={{
                    background: "linear-gradient(135deg, #29B6F6 0%, #0288D1 100%)",
                    borderRadius: "16px",
                    padding: "20px",
                    color: "white",
                    boxShadow: "0 4px 20px rgba(41, 182, 246, 0.3)",
                    display: "flex", alignItems: "center", gap: "12px"
                }}>
                    <span style={{ fontSize: "40px" }}>👥</span>
                    <div>
                        <h1 style={{ fontSize: "22px", fontWeight: 900, margin: 0, textShadow: "1px 1px 2px rgba(0,0,0,0.2)" }}>แนะนำเพื่อน</h1>
                        <p style={{ fontSize: "14px", opacity: 0.9, marginTop: "4px" }}>ชวนเพื่อนเล่น รับรายได้ไม่จำกัด</p>
                    </div>
                </div>

                {/* Referral Link Card */}
                <div style={{
                    background: "rgba(255,255,255,0.95)",
                    borderRadius: "16px",
                    padding: "24px",
                    textAlign: "center",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
                }}>
                    <div style={{
                        width: "64px",
                        height: "64px",
                        margin: "0 auto 16px",
                        background: "linear-gradient(135deg, #29B6F6, #4DD0E1)",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 6px 20px rgba(41,182,246,0.3)"
                    }}>
                        <Share2 size={32} color="white" />
                    </div>
                    <p style={{ fontSize: "14px", color: "#888", marginBottom: "8px", fontWeight: 600 }}>รหัสแนะนำของคุณ</p>
                    <p style={{ fontSize: "28px", fontWeight: 900, color: "#0288D1", marginBottom: "16px", letterSpacing: "2px" }}>{referralCode}</p>

                    <div style={{
                        background: "#f5f5f5",
                        borderRadius: "14px",
                        padding: "10px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "16px",
                        border: "1px solid #eee"
                    }}>
                        <input
                            type="text"
                            value={referralLink}
                            readOnly
                            style={{
                                flex: 1,
                                background: "transparent",
                                fontSize: "13px",
                                color: "#666",
                                border: "none",
                                outline: "none",
                                fontWeight: 500
                            }}
                        />
                        <button
                            onClick={handleCopy}
                            style={{
                                padding: "10px",
                                background: "white",
                                borderRadius: "10px",
                                border: "none",
                                cursor: "pointer",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
                            }}
                        >
                            {copied ? <Check size={18} color="#22C55E" /> : <Copy size={18} color="#999" />}
                        </button>
                    </div>

                    <button style={{
                        width: "100%",
                        background: "linear-gradient(135deg, #FF9500, #FF7A00)",
                        color: "white",
                        border: "none",
                        padding: "14px",
                        borderRadius: "14px",
                        fontSize: "16px",
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: "0 6px 20px rgba(255,149,0,0.4)"
                    }}>
                        คัดลอกลิงก์
                    </button>
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div style={{
                        background: "rgba(255,255,255,0.95)",
                        borderRadius: "14px",
                        padding: "20px",
                        textAlign: "center",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.06)"
                    }}>
                        <Users size={28} color="#0288D1" style={{ marginBottom: "8px" }} />
                        <p style={{ fontSize: "28px", fontWeight: 900, color: "#333", margin: "4px 0" }}>{totalReferrals}</p>
                        <p style={{ fontSize: "12px", color: "#888", fontWeight: 600 }}>เพื่อนที่แนะนำ</p>
                    </div>
                    <div style={{
                        background: "rgba(255,255,255,0.95)",
                        borderRadius: "14px",
                        padding: "20px",
                        textAlign: "center",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.06)"
                    }}>
                        <Coins size={28} color="#FFB800" style={{ marginBottom: "8px" }} />
                        <p style={{ fontSize: "28px", fontWeight: 900, color: "#FFB800", margin: "4px 0" }}>฿{totalCommission}</p>
                        <p style={{ fontSize: "12px", color: "#888", fontWeight: 600 }}>รายได้รวม</p>
                    </div>
                </div>

                {/* Referral List */}
                <div style={{
                    background: "rgba(255,255,255,0.95)",
                    borderRadius: "16px",
                    padding: "20px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
                }}>
                    <h3 style={{ fontWeight: 700, marginBottom: "16px", color: "#444", display: "flex", alignItems: "center", gap: "8px", fontSize: "16px" }}>
                        <Gift size={20} color="#0288D1" />
                        เพื่อนล่าสุด
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {referrals.map((ref) => (
                            <div key={ref.id} style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "14px",
                                borderRadius: "14px",
                                background: "#f8f9fa",
                                border: "1px solid #f0f0f0"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <div style={{
                                        width: "36px",
                                        height: "36px",
                                        borderRadius: "50%",
                                        background: "#E3F2FD",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "13px",
                                        fontWeight: 700,
                                        color: "#0288D1"
                                    }}>
                                        {ref.username.substring(0, 1).toUpperCase()}
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 700, color: "#333", fontSize: "14px", margin: 0 }}>{ref.username}</p>
                                        <p style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>{ref.date}</p>
                                    </div>
                                </div>
                                <span style={{
                                    color: "#22C55E",
                                    fontWeight: 700,
                                    background: "#F0FDF4",
                                    padding: "6px 12px",
                                    borderRadius: "10px",
                                    fontSize: "13px"
                                }}>+฿{ref.commission}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </PlayerLayout>
    );
}

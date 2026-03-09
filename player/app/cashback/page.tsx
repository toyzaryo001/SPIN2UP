"use client";

import { useState, useEffect } from "react";
import PlayerLayout from "@/components/PlayerLayout";
import { Wallet, TrendingDown, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";
import { API_URL } from "@/lib/api";

const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "ทุกวัน"];

interface CashbackSettings {
    rate: number;
    minLoss: number;
    maxCashback: number;
    dayOfWeek: number;
    claimStartHour: number;
    claimEndHour: number;
    isActive: boolean;
}

export default function CashbackPage() {
    const { user, loading: authLoading } = useAuth(true);
    const [settings, setSettings] = useState<CashbackSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [cashbackStats, setCashbackStats] = useState<any>(null);
    const [claiming, setClaiming] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [settingsRes, statsRes] = await Promise.all([
                    axios.get(`${API_URL}/public/cashback`),
                    user ? axios.get(`${API_URL}/users/rewards/stats`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    }) : Promise.resolve({ data: { success: false } })
                ]);
                setSettings(settingsRes.data);
                if (statsRes.data.success) {
                    setCashbackStats(statsRes.data.data.cashback);
                }
            } catch (error) {
                console.error("Failed to fetch cashback data", error);
                if (axios.isAxiosError(error) && error.response?.status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    localStorage.removeItem("lastActive");
                    window.dispatchEvent(new Event('user-logout'));
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const handleClaim = async () => {
        if (claiming || !cashbackStats) return;
        setClaiming(true);
        try {
            const res = await axios.post(`${API_URL}/users/rewards/claim`, { type: 'CASHBACK' }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.data.success) {
                alert(res.data.message);
                // Refresh stats
                const newStatsRes = await axios.get(`${API_URL}/users/rewards/stats`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                if (newStatsRes.data.success) {
                    setCashbackStats(newStatsRes.data.data.cashback);
                }
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'ไม่สามารถรับยอดเสียได้');
        } finally {
            setClaiming(false);
        }
    };

    if (authLoading || loading) {
        return <PlayerLayout><div style={{ padding: "40px", textAlign: "center" }}>กำลังโหลด...</div></PlayerLayout>;
    }

    if (!user) return null;
    if (!settings || !settings.isActive) {
        return (
            <PlayerLayout>
                <div style={{ padding: "40px", textAlign: "center", color: "#8B949E" }}>
                    ระบบคืนยอดเสียปิดใช้งานชั่วคราว
                </div>
            </PlayerLayout>
        );
    }

    const cashbackRate = cashbackStats?.rate || Number(settings.rate) || 5;
    const minLoss = cashbackStats?.minLoss || Number(settings.minLoss) || 100;
    const maxCashback = cashbackStats?.maxReward || Number(settings.maxCashback) || 10000;
    const claimDay = settings.dayOfWeek === 7 ? "ทุกวัน" : (DAYS[settings.dayOfWeek] || "จันทร์");
    const claimableAmount = cashbackStats?.claimable || 0;
    const isClaimed = cashbackStats?.isClaimed || false;

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
                    <span style={{ fontSize: "40px" }}>💸</span>
                    <div>
                        <h1 style={{ fontSize: "22px", fontWeight: 900, margin: 0, textShadow: "1px 1px 2px rgba(0,0,0,0.1)" }}>คืนยอดเสีย</h1>
                        <p style={{ fontSize: "14px", opacity: 0.9, marginTop: "4px" }}>เล่นเสียไม่ต้องเศร้า เราคืนให้</p>
                    </div>
                </div>

                {/* Cashback Card */}
                <div style={{
                    background: "#21262D",
                    borderRadius: "16px",
                    padding: "24px",
                    textAlign: "center",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255,255,255,0.1)"
                }}>
                    <p style={{ fontSize: "14px", color: "#8B949E", marginBottom: "4px", fontWeight: 600 }}>ยอดเสียคืนที่รับได้</p>
                    <p style={{
                        fontSize: "48px",
                        fontWeight: 900,
                        color: "#FFD700",
                        margin: "8px 0 24px",
                        textShadow: "1px 1px 2px rgba(0,0,0,0.1)"
                    }}>
                        ฿{claimableAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </p>
                    <button
                        onClick={handleClaim}
                        disabled={claiming || claimableAmount <= 0 || isClaimed}
                        style={{
                            width: "100%",
                            background: (claiming || claimableAmount <= 0 || isClaimed) ? "#30363D" : "linear-gradient(135deg, #FFD700, #FFC000)",
                            color: (claiming || claimableAmount <= 0 || isClaimed) ? "#8B949E" : "#0D1117",
                            border: "none",
                            padding: "16px",
                            borderRadius: "14px",
                            fontSize: "18px",
                            fontWeight: 700,
                            cursor: (claiming || claimableAmount <= 0 || isClaimed) ? "not-allowed" : "pointer",
                            boxShadow: (claiming || claimableAmount <= 0 || isClaimed) ? "none" : "0 6px 20px rgba(255,215,0,0.4)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px"
                        }}>
                        <Wallet size={22} />
                        {claiming ? 'กำลังดำเนินการ...' : isClaimed ? 'รับสิทธิ์ไปแล้วสัปดาห์นี้' : claimableAmount > 0 ? 'รับเงินคืนทันที' : 'ยังไม่มียอดให้รับ'}
                    </button>
                    <p style={{ fontSize: "12px", color: "#8B949E", marginTop: "12px" }}>
                        *รับได้{settings.dayOfWeek === 7 ? "ทุกวัน" : `ทุกวัน${claimDay}`} เวลา {String(settings.claimStartHour ?? 0).padStart(2, '0')}:00 น. - {String(settings.claimEndHour ?? 23).padStart(2, '0')}:59 น.
                        {cashbackStats && ` (คำนวณจากยอดเสีย ${new Date(cashbackStats.periodStart).toLocaleDateString()} ถึง ${new Date(cashbackStats.periodEnd).toLocaleDateString()})`}
                    </p>
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div style={{
                        background: "#21262D",
                        borderRadius: "14px",
                        padding: "16px",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
                        border: "1px solid rgba(255,255,255,0.1)"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                            <TrendingDown size={18} color="#FFD700" />
                            <p style={{ fontSize: "12px", color: "#8B949E", fontWeight: 600 }}>อัตราคืน</p>
                        </div>
                        <p style={{ fontSize: "24px", fontWeight: 800, color: "#FFFFFF" }}>{cashbackRate}%</p>
                    </div>
                    <div style={{
                        background: "#21262D",
                        borderRadius: "14px",
                        padding: "16px",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
                        border: "1px solid rgba(255,255,255,0.1)"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                            <CheckCircle size={18} color="#00D084" />
                            <p style={{ fontSize: "12px", color: "#8B949E", fontWeight: 600 }}>คืนสูงสุด</p>
                        </div>
                        <p style={{ fontSize: "24px", fontWeight: 800, color: "#FFFFFF" }}>฿{maxCashback.toLocaleString()}</p>
                    </div>
                </div>

                {/* Info */}
                <div style={{
                    background: "#21262D",
                    borderRadius: "14px",
                    padding: "16px",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
                    border: "1px solid rgba(255,255,255,0.1)"
                }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF", marginBottom: "12px" }}>📋 เงื่อนไข</h3>
                    <ul style={{ fontSize: "13px", color: "#8B949E", lineHeight: 1.8, paddingLeft: "20px", margin: 0 }}>
                        <li>ยอดเสียขั้นต่ำ ฿{minLoss.toLocaleString()} ขึ้นไป</li>
                        <li>คืนยอดเสียสูงสุด ฿{maxCashback.toLocaleString()}</li>
                        <li>รับได้{settings.dayOfWeek === 7 ? "ทุกวัน" : `ทุกวัน${claimDay}`} เวลา {String(settings.claimStartHour ?? 0).padStart(2, '0')}:00 น. - {String(settings.claimEndHour ?? 23).padStart(2, '0')}:59 น.</li>
                        <li>ยอดเสียคำนวณจากรอบบิลก่อนหน้า</li>
                    </ul>
                </div>
            </div>
        </PlayerLayout>
    );
}

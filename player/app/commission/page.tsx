"use client";

import { type CSSProperties, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import PlayerLayout from "@/components/PlayerLayout";
import { API_URL } from "@/lib/api";

interface CommissionSetting {
    rate: number;
    minTurnover: number;
    maxReward: number;
    isActive: boolean;
}

interface CommissionStats {
    claimable: number;
    rate: number;
    turnover: number;
    minTurnover: number;
    maxReward: number;
    periodStart: string;
    periodEnd: string;
    isClaimed: boolean;
}

export default function CommissionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(false);
    const [settings, setSettings] = useState<CommissionSetting | null>(null);
    const [commissionStats, setCommissionStats] = useState<CommissionStats | null>(null);

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const formatMoney = (value: number) =>
        Number(value || 0).toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const formatDateTime = (value?: string) => {
        if (!value) return "-";
        return new Date(value).toLocaleString("th-TH", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const handleUnauthorized = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("lastActive");
        window.dispatchEvent(new Event("user-logout"));
    };

    const fetchData = async () => {
        try {
            const [settingsRes, statsRes] = await Promise.all([
                axios.get(`${API_URL}/public/commission`),
                token
                    ? axios.get(`${API_URL}/users/rewards/stats`, {
                        headers: { Authorization: `Bearer ${token}` },
                    })
                    : Promise.resolve({ data: { success: false } }),
            ]);

            setSettings(settingsRes.data || null);
            if (statsRes.data.success) {
                setCommissionStats(statsRes.data.data.commission || null);
            }
        } catch (error) {
            console.error("Failed to fetch commission data", error);
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                handleUnauthorized();
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchData();
    }, []);

    const handleClaim = async () => {
        if (claiming || !commissionStats || commissionStats.claimable <= 0) return;

        setClaiming(true);
        try {
            const res = await axios.post(
                `${API_URL}/users/rewards/claim`,
                { type: "COMMISSION" },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.success) {
                alert(res.data.message || "รับค่าคอมสำเร็จ");
                await fetchData();
            }
        } catch (error: any) {
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                handleUnauthorized();
                return;
            }
            alert(error.response?.data?.message || "ไม่สามารถรับค่าคอมได้");
        } finally {
            setClaiming(false);
        }
    };

    if (loading) {
        return (
            <PlayerLayout>
                <div style={{ padding: "40px", textAlign: "center" }}>กำลังโหลด...</div>
            </PlayerLayout>
        );
    }

    const claimableAmount = commissionStats?.claimable || 0;
    const currentTurnover = commissionStats?.turnover || 0;
    const minTurnover = commissionStats?.minTurnover ?? settings?.minTurnover ?? 0;
    const rate = commissionStats?.rate ?? settings?.rate ?? 0;
    const maxReward = commissionStats?.maxReward ?? settings?.maxReward ?? 0;

    return (
        <PlayerLayout>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                        onClick={() => router.push("/activity")}
                        style={{ color: "#8B949E", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
                    >
                        กิจกรรม
                    </span>
                    <span style={{ color: "#555", fontSize: "14px" }}>/</span>
                    <span style={{ color: "#FFD700", fontSize: "14px", fontWeight: 600 }}>ค่าคอมมิชชั่น</span>
                </div>

                <div
                    style={{
                        position: "relative",
                        borderRadius: "20px",
                        overflow: "hidden",
                        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
                        padding: "24px",
                        minHeight: "180px",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            bottom: "-20px",
                            left: "20px",
                            fontSize: "120px",
                            opacity: 0.9,
                        }}
                    >
                        💸
                    </div>

                    <div style={{ position: "relative", zIndex: 1, textAlign: "right" }}>
                        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", marginBottom: "8px" }}>
                            ค่าคอมที่กดรับได้ตอนนี้
                        </p>
                        <p
                            style={{
                                fontSize: "36px",
                                fontWeight: 900,
                                color: "#FFD700",
                                textShadow: "0 0 20px rgba(255,215,0,0.5)",
                                margin: "0 0 16px",
                            }}
                        >
                            ฿ {formatMoney(claimableAmount)}
                        </p>
                        <button
                            onClick={handleClaim}
                            disabled={claiming || claimableAmount <= 0 || !settings?.isActive}
                            style={{
                                background: claiming || claimableAmount <= 0 || !settings?.isActive
                                    ? "#30363D"
                                    : "linear-gradient(135deg, #FFD700, #FFA500)",
                                color: claiming || claimableAmount <= 0 || !settings?.isActive ? "#8B949E" : "#1a1a2e",
                                border: "none",
                                padding: "14px 28px",
                                borderRadius: "12px",
                                fontWeight: 700,
                                fontSize: "16px",
                                cursor: claiming || claimableAmount <= 0 || !settings?.isActive ? "not-allowed" : "pointer",
                                boxShadow:
                                    claiming || claimableAmount <= 0 || !settings?.isActive
                                        ? "none"
                                        : "0 4px 15px rgba(255,215,0,0.4)",
                            }}
                        >
                            {claiming
                                ? "กำลังดำเนินการ..."
                                : !settings?.isActive
                                    ? "ระบบค่าคอมยังไม่เปิดใช้งาน"
                                    : claimableAmount > 0
                                        ? "กดรับค่าคอม"
                                        : "ยอดยังไม่ถึงขั้นต่ำ"}
                        </button>
                    </div>
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "12px",
                    }}
                >
                    <div style={cardStyle}>
                        <div style={cardLabelStyle}>ยอดเทิร์นสะสม</div>
                        <div style={cardValueStyle}>{formatMoney(currentTurnover)} ฿</div>
                    </div>
                    <div style={cardStyle}>
                        <div style={cardLabelStyle}>ขั้นต่ำที่กดรับได้</div>
                        <div style={cardValueStyle}>{formatMoney(minTurnover)} ฿</div>
                    </div>
                    <div style={cardStyle}>
                        <div style={cardLabelStyle}>อัตราคืน</div>
                        <div style={cardValueStyle}>{rate.toFixed(2)}%</div>
                    </div>
                    <div style={cardStyle}>
                        <div style={cardLabelStyle}>รับสูงสุด</div>
                        <div style={cardValueStyle}>{formatMoney(maxReward)} ฿</div>
                    </div>
                </div>

                <div style={panelStyle}>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "#FFD700", marginBottom: "12px" }}>
                        วิธีทำงานของค่าคอมมิชชั่น
                    </div>
                    <ul style={{ margin: 0, paddingLeft: "18px", color: "#C9D1D9", lineHeight: 1.9 }}>
                        <li>ระบบจะสะสมยอดเทิร์นให้อัตโนมัติหลังเดิมพันสำเร็จ</li>
                        <li>เมื่อยอดเทิร์นถึงขั้นต่ำ จะสามารถกดรับค่าคอมได้ทันที</li>
                        <li>หลังรับสำเร็จ ระบบจะเริ่มสะสมรอบใหม่ให้อัตโนมัติ</li>
                    </ul>
                </div>

                <div style={panelStyle}>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "#FFD700", marginBottom: "12px" }}>
                        สถานะรอบปัจจุบัน
                    </div>
                    <div style={detailRowStyle}>
                        <span style={detailLabelStyle}>เริ่มสะสมรอบนี้</span>
                        <span style={detailValueStyle}>{formatDateTime(commissionStats?.periodStart)}</span>
                    </div>
                    <div style={detailRowStyle}>
                        <span style={detailLabelStyle}>อัปเดตล่าสุด</span>
                        <span style={detailValueStyle}>{formatDateTime(commissionStats?.periodEnd)}</span>
                    </div>
                    <div style={detailRowStyle}>
                        <span style={detailLabelStyle}>สถานะ</span>
                        <span style={{ ...detailValueStyle, color: claimableAmount > 0 ? "#2ECC71" : "#F39C12" }}>
                            {claimableAmount > 0 ? "พร้อมกดรับ" : "กำลังสะสมยอด"}
                        </span>
                    </div>
                </div>
            </div>
        </PlayerLayout>
    );
}

const cardStyle: CSSProperties = {
    background: "#161B22",
    borderRadius: "14px",
    padding: "16px",
    border: "1px solid rgba(255,255,255,0.08)",
};

const cardLabelStyle: CSSProperties = {
    fontSize: "13px",
    color: "#8B949E",
    marginBottom: "8px",
};

const cardValueStyle: CSSProperties = {
    fontSize: "22px",
    fontWeight: 700,
    color: "#FFFFFF",
};

const panelStyle: CSSProperties = {
    background: "#161B22",
    borderRadius: "18px",
    padding: "20px",
    border: "1px solid rgba(255,255,255,0.08)",
};

const detailRowStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    padding: "10px 0",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const detailLabelStyle: CSSProperties = {
    color: "#8B949E",
    fontSize: "14px",
};

const detailValueStyle: CSSProperties = {
    color: "#FFFFFF",
    fontSize: "14px",
    fontWeight: 600,
    textAlign: "right",
};

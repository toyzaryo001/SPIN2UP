"use client";

import { useState, useEffect } from "react";
import PlayerLayout from "@/components/PlayerLayout";
import { X, ChevronRight, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

// Emoji and gradient mapping based on promotion type or index
const promoStyles = [
    { emoji: "👑", gradient: "linear-gradient(135deg, #A855F7, #EC4899)" },
    { emoji: "🐕", gradient: "linear-gradient(135deg, #22D3EE, #3B82F6)" },
    { emoji: "👥", gradient: "linear-gradient(135deg, #FB923C, #EF4444)" },
    { emoji: "💰", gradient: "linear-gradient(135deg, #FBBF24, #F97316)" },
    { emoji: "🎁", gradient: "linear-gradient(135deg, #F87171, #EC4899)" },
    { emoji: "🎮", gradient: "linear-gradient(135deg, #10B981, #059669)" },
    { emoji: "🔥", gradient: "linear-gradient(135deg, #EF4444, #DC2626)" },
    { emoji: "⚡", gradient: "linear-gradient(135deg, #6366F1, #4F46E5)" },
];

interface Promotion {
    id: number;
    name: string;
    description: string | null;
    bonusPercent: number;
    turnover: number;
    minDeposit: number;
    maxBonus: number;
    isActive: boolean;
}

type SelectedPromotion = Promotion & { emoji: string; gradient: string } | null;

export default function PromotionsPage() {
    const router = useRouter();
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPromo, setSelectedPromo] = useState<SelectedPromotion>(null);
    const [isClosing, setIsClosing] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData && userData !== "undefined") {
            try {
                setUser(JSON.parse(userData));
            } catch (e) { }
        }
        fetchPromotions();
    }, []);

    const fetchPromotions = async () => {
        try {
            const res = await axios.get(`${API_URL}/public/promotions`);
            if (Array.isArray(res.data)) {
                setPromotions(res.data);
            }
        } catch (error) {
            console.error("Fetch promotions error:", error);
        } finally {
            setLoading(false);
        }
    };

    const getPromoStyle = (index: number) => {
        return promoStyles[index % promoStyles.length];
    };

    const openPopup = (promo: Promotion, index: number) => {
        const style = getPromoStyle(index);
        setSelectedPromo({ ...promo, ...style });
        setIsClosing(false);
    };

    const closePopup = () => {
        setIsClosing(true);
        setTimeout(() => {
            setSelectedPromo(null);
            setIsClosing(false);
        }, 300);
    };

    const handleClaimPromotion = () => {
        if (!user) {
            closePopup();
            router.push("/?action=login");
            return;
        }
        closePopup();
        alert(`รับโปรโมชั่น "${selectedPromo?.name}" สำเร็จ!`);
    };

    return (
        <PlayerLayout>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Breadcrumb & Share */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                        <Link href="/" style={{ color: "#666", textDecoration: "none" }}>หน้าหลัก</Link>
                        <span style={{ color: "#aaa" }}>/</span>
                        <span style={{ color: "#22D3EE", fontWeight: 600 }}>โปรโมชั่น</span>
                    </div>
                    <button style={{ display: "flex", alignItems: "center", gap: "4px", color: "#666", background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}>
                        <span>แชร์</span>
                        <Share2 size={16} />
                    </button>
                </div>

                {/* Loading State */}
                {loading ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
                        กำลังโหลด...
                    </div>
                ) : promotions.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
                        ยังไม่มีโปรโมชั่นในขณะนี้
                    </div>
                ) : (
                    /* Promotions List */
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {promotions.map((promo, index) => {
                            const style = getPromoStyle(index);
                            return (
                                <div
                                    key={promo.id}
                                    onClick={() => openPopup(promo, index)}
                                    style={{
                                        background: "white",
                                        borderRadius: "16px",
                                        overflow: "hidden",
                                        boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "stretch",
                                        minHeight: "90px",
                                        transition: "all 0.2s",
                                        border: "1px solid rgba(0,0,0,0.05)"
                                    }}
                                >
                                    {/* Image/Icon Section */}
                                    <div
                                        style={{
                                            width: "100px",
                                            flexShrink: 0,
                                            background: style.gradient,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}
                                    >
                                        <span style={{ fontSize: "40px" }}>{style.emoji}</span>
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex: 1, padding: "14px", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
                                        <h3 style={{ fontWeight: 700, color: "#333", fontSize: "14px", lineHeight: 1.3, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {promo.name}
                                        </h3>
                                        <p style={{ fontSize: "12px", color: "#666", marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {promo.description || `โบนัส ${promo.bonusPercent}% สูงสุด ${promo.maxBonus} บาท`}
                                        </p>
                                        <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                                            <span style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "4px",
                                                fontSize: "10px",
                                                background: "#ECFEFF",
                                                color: "#0891B2",
                                                padding: "4px 10px",
                                                borderRadius: "20px",
                                                fontWeight: 600,
                                                border: "1px solid #A5F3FC"
                                            }}>
                                                🎯 โบนัส {promo.bonusPercent}%
                                            </span>
                                            {promo.turnover > 0 && (
                                                <span style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                    fontSize: "10px",
                                                    background: "#FFF7ED",
                                                    color: "#EA580C",
                                                    padding: "4px 10px",
                                                    borderRadius: "20px",
                                                    fontWeight: 600,
                                                    border: "1px solid #FDBA74"
                                                }}>
                                                    🔄 เทิร์น x{promo.turnover}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    <div style={{ display: "flex", alignItems: "center", paddingRight: "12px", color: "#ccc" }}>
                                        <ChevronRight size={24} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Popup Overlay */}
            {selectedPromo && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 200,
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        transition: "all 0.3s",
                        background: isClosing ? "rgba(0,0,0,0)" : "rgba(0,0,0,0.5)"
                    }}
                    onClick={closePopup}
                >
                    {/* Popup Content - Bottom Sheet Style */}
                    <div
                        style={{
                            width: "100%",
                            maxWidth: "512px",
                            background: "white",
                            borderRadius: "24px 24px 0 0",
                            boxShadow: "0 -10px 40px rgba(0,0,0,0.2)",
                            transform: isClosing ? "translateY(100%)" : "translateY(0)",
                            transition: "transform 0.3s ease-out",
                            maxHeight: "85vh",
                            overflowY: "auto"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={closePopup}
                            style={{
                                position: "absolute",
                                top: "16px",
                                right: "16px",
                                zIndex: 10,
                                width: "32px",
                                height: "32px",
                                background: "#EF4444",
                                color: "white",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "none",
                                cursor: "pointer",
                                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)"
                            }}
                        >
                            <X size={18} />
                        </button>

                        {/* Drag Handle */}
                        <div style={{ display: "flex", justifyContent: "center", paddingTop: "12px", paddingBottom: "8px" }}>
                            <div style={{ width: "40px", height: "4px", background: "#ddd", borderRadius: "2px" }}></div>
                        </div>

                        {/* Promo Image */}
                        <div style={{ padding: "0 16px" }}>
                            <div
                                style={{
                                    width: "100%",
                                    height: "180px",
                                    background: selectedPromo.gradient,
                                    borderRadius: "20px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                                    position: "relative",
                                    overflow: "hidden"
                                }}
                            >
                                <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.1)" }}></div>
                                <span style={{ fontSize: "72px", position: "relative", zIndex: 1 }}>{selectedPromo.emoji}</span>
                            </div>
                        </div>

                        {/* Title */}
                        <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#333", textAlign: "center", marginTop: "16px", padding: "0 16px" }}>
                            {selectedPromo.name}
                        </h2>

                        {/* Details Section */}
                        <div style={{
                            margin: "16px",
                            background: "#ECFEFF",
                            border: "1px solid #A5F3FC",
                            borderRadius: "16px",
                            padding: "16px"
                        }}>
                            <h3 style={{ color: "#0891B2", fontWeight: 700, fontSize: "14px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                                📋 รายละเอียด
                            </h3>
                            <p style={{ color: "#555", fontSize: "14px", lineHeight: 1.6 }}>
                                {selectedPromo.description || `รับโบนัส ${selectedPromo.bonusPercent}% สูงสุด ${selectedPromo.maxBonus} บาท เมื่อฝากขั้นต่ำ ${selectedPromo.minDeposit} บาท`}
                            </p>
                        </div>

                        {/* Info Badges */}
                        <div style={{ margin: "0 16px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            <span style={{
                                background: "#ECFEFF",
                                color: "#0891B2",
                                padding: "8px 14px",
                                borderRadius: "10px",
                                fontSize: "12px",
                                fontWeight: 700,
                                border: "1px solid #A5F3FC"
                            }}>
                                🎁 โบนัส: {selectedPromo.bonusPercent}%
                            </span>
                            <span style={{
                                background: "#F0FDF4",
                                color: "#16A34A",
                                padding: "8px 14px",
                                borderRadius: "10px",
                                fontSize: "12px",
                                fontWeight: 700,
                                border: "1px solid #86EFAC"
                            }}>
                                💵 ฝากขั้นต่ำ: {selectedPromo.minDeposit} บาท
                            </span>
                            <span style={{
                                background: "#FEF3C7",
                                color: "#D97706",
                                padding: "8px 14px",
                                borderRadius: "10px",
                                fontSize: "12px",
                                fontWeight: 700,
                                border: "1px solid #FCD34D"
                            }}>
                                💰 สูงสุด: {selectedPromo.maxBonus} บาท
                            </span>
                            {selectedPromo.turnover > 0 && (
                                <span style={{
                                    background: "#FFF7ED",
                                    color: "#EA580C",
                                    padding: "8px 14px",
                                    borderRadius: "10px",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    border: "1px solid #FDBA74"
                                }}>
                                    🔄 เทิร์น: x{selectedPromo.turnover}
                                </span>
                            )}
                        </div>

                        {/* Action Button */}
                        <div style={{ padding: "16px", marginTop: "8px" }}>
                            <button
                                onClick={handleClaimPromotion}
                                style={{
                                    width: "100%",
                                    background: "linear-gradient(135deg, #FF9500, #FF7A00)",
                                    color: "white",
                                    border: "none",
                                    padding: "16px",
                                    borderRadius: "14px",
                                    fontSize: "18px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    boxShadow: "0 6px 20px rgba(255,149,0,0.4)"
                                }}
                            >
                                รับโปรโมชั่นนี้
                            </button>
                        </div>

                        {/* Safe area padding */}
                        <div style={{ height: "16px" }}></div>
                    </div>
                </div>
            )}
        </PlayerLayout>
    );
}

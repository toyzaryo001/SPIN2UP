"use client";

import { useEffect, useState } from "react";
import PlayerLayout from "@/components/PlayerLayout";
import { X, ChevronRight, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { API_URL } from "@/lib/api";

const promoStyles = [
    { emoji: "🎉", gradient: "linear-gradient(135deg, #F59E0B, #EA580C)" },
    { emoji: "💎", gradient: "linear-gradient(135deg, #0EA5E9, #2563EB)" },
    { emoji: "🚀", gradient: "linear-gradient(135deg, #22C55E, #15803D)" },
    { emoji: "🔥", gradient: "linear-gradient(135deg, #EF4444, #B91C1C)" },
    { emoji: "🎁", gradient: "linear-gradient(135deg, #EC4899, #BE185D)" },
    { emoji: "⚡", gradient: "linear-gradient(135deg, #6366F1, #4338CA)" },
];

interface Promotion {
    id: number;
    name: string;
    description: string | null;
    type: string;
    value: number;
    minDeposit: number;
    maxBonus: number | null;
    requiresTurnover: boolean;
    turnoverMultiplier: number;
    image: string | null;
    isActive: boolean;
    startAt: string | null;
    endAt: string | null;
}

interface SelectedPromotionSummary {
    id: number;
    name: string;
    description: string | null;
    type: string;
    value: number;
    minDeposit: number;
    maxBonus: number | null;
    requiresTurnover: boolean;
    turnoverMultiplier: number;
    image: string | null;
    selectedAt: string | null;
}

type PopupPromotion = Promotion & { emoji: string; gradient: string };

const toNumber = (value: unknown) => Number(value || 0);

const normalizePromotion = (promotion: any): Promotion => ({
    id: promotion.id,
    name: promotion.name,
    description: promotion.description || null,
    type: promotion.type || "PERCENT",
    value: toNumber(promotion.value),
    minDeposit: toNumber(promotion.minDeposit),
    maxBonus: promotion.maxBonus == null ? null : toNumber(promotion.maxBonus),
    requiresTurnover: promotion.requiresTurnover === true,
    turnoverMultiplier: toNumber(promotion.turnoverMultiplier) || 1,
    image: promotion.image || null,
    isActive: promotion.isActive !== false,
    startAt: promotion.startAt || null,
    endAt: promotion.endAt || null,
});

const formatCurrency = (value: number | null | undefined) =>
    Number(value || 0).toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const getPromotionFormula = (promotion: Promotion | SelectedPromotionSummary) => {
    if (promotion.type === "FIXED") {
        return `รับโบนัส ${formatCurrency(promotion.value)} บาท`;
    }

    const maxBonusText = promotion.maxBonus ? ` สูงสุด ${formatCurrency(promotion.maxBonus)} บาท` : "";
    return `โบนัส ${promotion.value}%${maxBonusText}`;
};

const isPromotionAvailable = (promotion: Promotion) => {
    const now = new Date();
    const startsOk = !promotion.startAt || new Date(promotion.startAt) <= now;
    const endsOk = !promotion.endAt || new Date(promotion.endAt) >= now;
    return promotion.isActive && startsOk && endsOk;
};

export default function PromotionsPage() {
    const router = useRouter();
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [selectedPromotion, setSelectedPromotion] = useState<SelectedPromotionSummary | null>(null);
    const [popupPromotion, setPopupPromotion] = useState<PopupPromotion | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
    const [isClosing, setIsClosing] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const fetchPromotions = async (accessToken?: string | null) => {
        const promotionsPromise = axios.get(`${API_URL}/public/promotions`);
        const selectedPromise = accessToken
            ? axios.get(`${API_URL}/users/promotions/selected`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            })
            : Promise.resolve({ data: { data: null } });

        const [promotionRes, selectedRes] = await Promise.all([promotionsPromise, selectedPromise]);
        const rawPromotions = Array.isArray(promotionRes.data) ? promotionRes.data : [];

        setPromotions(rawPromotions.map(normalizePromotion).filter(isPromotionAvailable));
        setSelectedPromotion(selectedRes.data?.data || null);
    };

    useEffect(() => {
        const accessToken = localStorage.getItem("token");
        setIsLoggedIn(Boolean(accessToken));

        fetchPromotions(accessToken)
            .catch((error) => {
                console.error("Fetch promotions error:", error);
            })
            .finally(() => setLoading(false));
    }, []);

    const getPromoStyle = (index: number) => promoStyles[index % promoStyles.length];

    const openPopup = (promotion: Promotion, index: number) => {
        const style = getPromoStyle(index);
        setPopupPromotion({ ...promotion, ...style });
        setIsClosing(false);
    };

    const closePopup = () => {
        setIsClosing(true);
        setTimeout(() => {
            setPopupPromotion(null);
            setIsClosing(false);
        }, 220);
    };

    const handleShare = async () => {
        try {
            const shareUrl = typeof window !== "undefined" ? window.location.href : `${API_URL}/public/promotions`;
            if (navigator.share) {
                await navigator.share({ title: "โปรโมชั่น", url: shareUrl });
                return;
            }

            await navigator.clipboard.writeText(shareUrl);
            alert("คัดลอกลิงก์โปรโมชั่นแล้ว");
        } catch (error) {
            console.error("Share promotion error:", error);
        }
    };

    const handleSelectPromotion = async (promotionId: number) => {
        if (!token) {
            closePopup();
            router.push("/?action=login");
            return;
        }

        setActionLoadingId(promotionId);
        try {
            const res = await axios.post(
                `${API_URL}/users/promotions/${promotionId}/select`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setSelectedPromotion(res.data?.data || null);
            closePopup();
            router.push("/deposit");
        } catch (error: any) {
            console.error("Select promotion error:", error);
            alert(error.response?.data?.message || "เลือกโปรโมชั่นไม่สำเร็จ");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleClearSelectedPromotion = async () => {
        if (!token) {
            return;
        }

        setActionLoadingId(selectedPromotion?.id || popupPromotion?.id || -1);
        try {
            await axios.delete(`${API_URL}/users/promotions/selected`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setSelectedPromotion(null);
            if (popupPromotion?.id === selectedPromotion?.id) {
                closePopup();
            }
        } catch (error: any) {
            console.error("Clear selected promotion error:", error);
            alert(error.response?.data?.message || "ยกเลิกโปรโมชั่นไม่สำเร็จ");
        } finally {
            setActionLoadingId(null);
        }
    };

    return (
        <PlayerLayout>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                        <Link href="/" style={{ color: "#8B949E", textDecoration: "none" }}>หน้าหลัก</Link>
                        <span style={{ color: "#555" }}>/</span>
                        <span style={{ color: "#FFD700", fontWeight: 600 }}>โปรโมชั่น</span>
                    </div>
                    <button
                        onClick={handleShare}
                        style={{ display: "flex", alignItems: "center", gap: "4px", color: "#8B949E", background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}
                    >
                        <span>แชร์</span>
                        <Share2 size={16} />
                    </button>
                </div>

                {selectedPromotion && (
                    <div
                        style={{
                            background: "linear-gradient(135deg, rgba(255,215,0,0.12), rgba(249,115,22,0.18))",
                            border: "1px solid rgba(255,215,0,0.28)",
                            borderRadius: "18px",
                            padding: "18px",
                            boxShadow: "0 10px 24px rgba(0,0,0,0.16)",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, color: "#FFD700", fontWeight: 700, fontSize: "12px" }}>โปรโมชั่นที่เลือกอยู่</p>
                                <h2 style={{ margin: "6px 0 8px", color: "#FFFFFF", fontSize: "18px", fontWeight: 800 }}>{selectedPromotion.name}</h2>
                                <p style={{ margin: 0, color: "#D1D5DB", fontSize: "13px", lineHeight: 1.5 }}>
                                    {selectedPromotion.description || getPromotionFormula(selectedPromotion)}
                                </p>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
                                    <span style={{ fontSize: "11px", color: "#FFD700", border: "1px solid rgba(255,215,0,0.28)", borderRadius: "999px", padding: "6px 10px" }}>
                                        {getPromotionFormula(selectedPromotion)}
                                    </span>
                                    <span style={{ fontSize: "11px", color: "#E5E7EB", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "999px", padding: "6px 10px" }}>
                                        ฝากขั้นต่ำ {formatCurrency(selectedPromotion.minDeposit)} บาท
                                    </span>
                                    <span style={{ fontSize: "11px", color: selectedPromotion.requiresTurnover ? "#FCA5A5" : "#86EFAC", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "999px", padding: "6px 10px" }}>
                                        {selectedPromotion.requiresTurnover ? `ติดเทิร์น x${selectedPromotion.turnoverMultiplier}` : "ถอนได้เมื่อโบนัสเข้า"}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={handleClearSelectedPromotion}
                                disabled={actionLoadingId === selectedPromotion.id}
                                style={{
                                    border: "none",
                                    borderRadius: "12px",
                                    padding: "10px 14px",
                                    background: "rgba(239,68,68,0.14)",
                                    color: "#FCA5A5",
                                    cursor: actionLoadingId === selectedPromotion.id ? "not-allowed" : "pointer",
                                    fontWeight: 700,
                                    opacity: actionLoadingId === selectedPromotion.id ? 0.6 : 1,
                                }}
                            >
                                {actionLoadingId === selectedPromotion.id ? "กำลังยกเลิก..." : "ยกเลิก"}
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#8B949E" }}>กำลังโหลด...</div>
                ) : promotions.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#8B949E" }}>ยังไม่มีโปรโมชั่นในขณะนี้</div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {promotions.map((promotion, index) => {
                            const style = getPromoStyle(index);
                            const isSelected = selectedPromotion?.id === promotion.id;

                            return (
                                <div
                                    key={promotion.id}
                                    onClick={() => openPopup(promotion, index)}
                                    style={{
                                        background: "#21262D",
                                        borderRadius: "16px",
                                        overflow: "hidden",
                                        boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "stretch",
                                        minHeight: "96px",
                                        transition: "all 0.2s",
                                        border: isSelected ? "1px solid rgba(255,215,0,0.45)" : "1px solid rgba(255,255,255,0.1)",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "104px",
                                            flexShrink: 0,
                                            background: style.gradient,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            position: "relative",
                                        }}
                                    >
                                        <span style={{ fontSize: "42px" }}>{style.emoji}</span>
                                        {isSelected && (
                                            <span
                                                style={{
                                                    position: "absolute",
                                                    top: "10px",
                                                    left: "10px",
                                                    fontSize: "10px",
                                                    fontWeight: 800,
                                                    background: "rgba(0,0,0,0.24)",
                                                    color: "#FFF7CC",
                                                    padding: "5px 8px",
                                                    borderRadius: "999px",
                                                }}
                                            >
                                                เลือกอยู่
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ flex: 1, padding: "14px", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
                                        <h3 style={{ fontWeight: 700, color: "#FFFFFF", fontSize: "14px", lineHeight: 1.3, margin: 0 }}>
                                            {promotion.name}
                                        </h3>
                                        <p style={{ fontSize: "12px", color: "#8B949E", marginTop: "6px", lineHeight: 1.45 }}>
                                            {promotion.description || getPromotionFormula(promotion)}
                                        </p>
                                        <div style={{ display: "flex", gap: "6px", marginTop: "10px", flexWrap: "wrap" }}>
                                            <span style={{ fontSize: "10px", background: "rgba(255,215,0,0.1)", color: "#FFD700", padding: "4px 10px", borderRadius: "20px", fontWeight: 600, border: "1px solid rgba(255,215,0,0.3)" }}>
                                                {getPromotionFormula(promotion)}
                                            </span>
                                            <span style={{ fontSize: "10px", background: "rgba(255,255,255,0.06)", color: "#E5E7EB", padding: "4px 10px", borderRadius: "20px", fontWeight: 600, border: "1px solid rgba(255,255,255,0.08)" }}>
                                                ฝากขั้นต่ำ {formatCurrency(promotion.minDeposit)}
                                            </span>
                                            {promotion.requiresTurnover && (
                                                <span style={{ fontSize: "10px", background: "rgba(239,68,68,0.1)", color: "#FCA5A5", padding: "4px 10px", borderRadius: "20px", fontWeight: 600, border: "1px solid rgba(239,68,68,0.2)" }}>
                                                    ติดเทิร์น x{promotion.turnoverMultiplier}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", paddingRight: "12px", color: "#8B949E" }}>
                                        <ChevronRight size={24} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {popupPromotion && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 200,
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        transition: "all 0.22s",
                        background: isClosing ? "rgba(0,0,0,0)" : "rgba(0,0,0,0.72)",
                    }}
                    onClick={closePopup}
                >
                    <div
                        style={{
                            width: "100%",
                            maxWidth: "512px",
                            background: "#21262D",
                            borderRadius: "24px 24px 0 0",
                            boxShadow: "0 -10px 40px rgba(0,0,0,0.3)",
                            transform: isClosing ? "translateY(100%)" : "translateY(0)",
                            transition: "transform 0.22s ease-out",
                            maxHeight: "85vh",
                            overflowY: "auto",
                            border: "1px solid rgba(255,255,255,0.1)",
                        }}
                        onClick={(event) => event.stopPropagation()}
                    >
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
                            }}
                        >
                            <X size={18} />
                        </button>

                        <div style={{ display: "flex", justifyContent: "center", paddingTop: "12px", paddingBottom: "8px" }}>
                            <div style={{ width: "40px", height: "4px", background: "#444", borderRadius: "2px" }} />
                        </div>

                        <div style={{ padding: "0 16px" }}>
                            <div
                                style={{
                                    width: "100%",
                                    height: "180px",
                                    background: popupPromotion.gradient,
                                    borderRadius: "20px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <span style={{ fontSize: "72px" }}>{popupPromotion.emoji}</span>
                            </div>
                        </div>

                        <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#FFFFFF", textAlign: "center", marginTop: "16px", padding: "0 16px" }}>
                            {popupPromotion.name}
                        </h2>

                        <div style={{ margin: "16px", background: "rgba(255, 215, 0, 0.1)", border: "1px solid rgba(255, 215, 0, 0.3)", borderRadius: "16px", padding: "16px" }}>
                            <h3 style={{ color: "#FFD700", fontWeight: 700, fontSize: "14px", marginBottom: "8px" }}>รายละเอียด</h3>
                            <p style={{ color: "#D1D5DB", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
                                {popupPromotion.description || getPromotionFormula(popupPromotion)}
                            </p>
                        </div>

                        <div style={{ margin: "0 16px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            <span style={{ background: "rgba(255, 215, 0, 0.1)", color: "#FFD700", padding: "8px 14px", borderRadius: "10px", fontSize: "12px", fontWeight: 700, border: "1px solid rgba(255, 215, 0, 0.3)" }}>
                                {getPromotionFormula(popupPromotion)}
                            </span>
                            <span style={{ background: "rgba(34, 197, 94, 0.1)", color: "#86EFAC", padding: "8px 14px", borderRadius: "10px", fontSize: "12px", fontWeight: 700, border: "1px solid rgba(34, 197, 94, 0.2)" }}>
                                ฝากขั้นต่ำ {formatCurrency(popupPromotion.minDeposit)} บาท
                            </span>
                            <span style={{ background: "rgba(59, 130, 246, 0.1)", color: "#93C5FD", padding: "8px 14px", borderRadius: "10px", fontSize: "12px", fontWeight: 700, border: "1px solid rgba(59, 130, 246, 0.25)" }}>
                                {popupPromotion.maxBonus ? `รับสูงสุด ${formatCurrency(popupPromotion.maxBonus)} บาท` : "ไม่มีเพดานโบนัส"}
                            </span>
                            <span style={{ background: "rgba(255,255,255,0.05)", color: popupPromotion.requiresTurnover ? "#FCA5A5" : "#A7F3D0", padding: "8px 14px", borderRadius: "10px", fontSize: "12px", fontWeight: 700, border: "1px solid rgba(255,255,255,0.1)" }}>
                                {popupPromotion.requiresTurnover ? `ติดเทิร์น x${popupPromotion.turnoverMultiplier}` : "ไม่ติดเทิร์น"}
                            </span>
                        </div>

                        <div style={{ padding: "16px", display: "flex", gap: "10px", flexDirection: "column" }}>
                            {selectedPromotion?.id === popupPromotion.id ? (
                                <>
                                    <button
                                        onClick={() => router.push("/deposit")}
                                        style={{
                                            width: "100%",
                                            background: "linear-gradient(135deg, #FFD700, #FFC000)",
                                            color: "#0D1117",
                                            border: "none",
                                            borderRadius: "14px",
                                            padding: "16px",
                                            fontSize: "16px",
                                            fontWeight: 800,
                                            cursor: "pointer",
                                        }}
                                    >
                                        ไปหน้าฝากเงิน
                                    </button>
                                    <button
                                        onClick={handleClearSelectedPromotion}
                                        disabled={actionLoadingId === popupPromotion.id}
                                        style={{
                                            width: "100%",
                                            background: "rgba(239,68,68,0.12)",
                                            color: "#FCA5A5",
                                            border: "1px solid rgba(239,68,68,0.25)",
                                            borderRadius: "14px",
                                            padding: "14px",
                                            fontSize: "15px",
                                            fontWeight: 700,
                                            cursor: actionLoadingId === popupPromotion.id ? "not-allowed" : "pointer",
                                            opacity: actionLoadingId === popupPromotion.id ? 0.6 : 1,
                                        }}
                                    >
                                        {actionLoadingId === popupPromotion.id ? "กำลังยกเลิก..." : "ยกเลิกโปรโมชั่นนี้"}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => handleSelectPromotion(popupPromotion.id)}
                                    disabled={actionLoadingId === popupPromotion.id}
                                    style={{
                                        width: "100%",
                                        background: "linear-gradient(135deg, #FFD700, #FFC000)",
                                        color: "#0D1117",
                                        border: "none",
                                        borderRadius: "14px",
                                        padding: "16px",
                                        fontSize: "16px",
                                        fontWeight: 800,
                                        cursor: actionLoadingId === popupPromotion.id ? "not-allowed" : "pointer",
                                        opacity: actionLoadingId === popupPromotion.id ? 0.7 : 1,
                                    }}
                                >
                                    {actionLoadingId === popupPromotion.id
                                        ? "กำลังเลือก..."
                                        : isLoggedIn
                                            ? "เลือกโปรโมชั่นนี้แล้วไปฝาก"
                                            : "เข้าสู่ระบบเพื่อรับโปรโมชั่น"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </PlayerLayout>
    );
}

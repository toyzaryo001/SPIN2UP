"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PlayerLayout from "@/components/PlayerLayout";
import { Wallet, ArrowDownToLine, Copy, Check, Building2, Smartphone, QrCode, AlertCircle } from "lucide-react";

const channels = [
    { id: "bank", label: "ธนาคาร", icon: Building2, emoji: "🏦" },
    { id: "truemoney", label: "TrueMoney", icon: Smartphone, emoji: "📱" },
    { id: "promptpay", label: "PromptPay", icon: QrCode, emoji: "📲" },
];

const bankColors: Record<string, string> = {
    "KBANK": "#00A651",
    "SCB": "#4E2A84",
    "BBL": "#002F6C",
    "KTB": "#00A9E0",
    "BAY": "#FDD800",
    "TMB": "#003C71",
    "GSB": "#D91B5B",
};

interface BankAccount {
    id: number;
    bankName: string;
    accountNumber: string;
    accountName: string;
    type: string;
    isActive: boolean;
}

export default function DepositPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
    const [selectedChannel, setSelectedChannel] = useState("bank");
    const [copied, setCopied] = useState<string | null>(null);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);

    useEffect(() => {
        // Check if user is logged in
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");
        if (!token || !userData || userData === "undefined") {
            // Redirect to login
            router.push("/?action=login");
            return;
        }

        // Fetch fresh user data from API
        fetchUserProfile(token);
        // Fetch bank accounts from API
        fetchBankAccounts();
    }, [router]);

    const fetchUserProfile = async (token: string) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/wallet/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.user) {
                    setUser(data.user);
                    // Update localStorage with fresh data
                    localStorage.setItem("user", JSON.stringify(data.user));
                }
            }
        } catch (error) {
            console.error("Fetch user profile error:", error);
            // Fallback to localStorage data
            const userData = localStorage.getItem("user");
            if (userData && userData !== "undefined") {
                try {
                    setUser(JSON.parse(userData));
                } catch (e) {
                    console.error("Parse user data error:", e);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchBankAccounts = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/public/bank-accounts?type=deposit`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setBankAccounts(data);
                if (data.length > 0) {
                    setSelectedBank(data[0]);
                }
            }
        } catch (error) {
            console.error("Fetch bank accounts error:", error);
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    if (loading) {
        return (
            <PlayerLayout>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px" }}>
                    <p>กำลังโหลด...</p>
                </div>
            </PlayerLayout>
        );
    }

    if (!user) {
        return null;
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
                    <span style={{ fontSize: "40px" }}>💰</span>
                    <div>
                        <h1 style={{ fontSize: "22px", fontWeight: 900, margin: 0, textShadow: "1px 1px 2px rgba(0,0,0,0.2)" }}>ฝาก - ถอน</h1>
                        <p style={{ fontSize: "14px", opacity: 0.9, marginTop: "4px" }}>ทำรายการอัตโนมัติ 24 ชม.</p>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", background: "#21262D", borderRadius: "30px", padding: "4px", boxShadow: "0 4px 15px rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <button
                        onClick={() => setActiveTab("deposit")}
                        style={{
                            flex: 1,
                            padding: "14px",
                            borderRadius: "26px",
                            fontWeight: 700,
                            fontSize: "14px",
                            border: "none",
                            cursor: "pointer",
                            transition: "all 0.3s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            background: activeTab === "deposit" ? "linear-gradient(135deg, #FFD700, #FFC000)" : "transparent",
                            color: activeTab === "deposit" ? "#0D1117" : "#8B949E",
                            boxShadow: activeTab === "deposit" ? "0 4px 15px rgba(255,215,0,0.3)" : "none"
                        }}
                    >
                        <Wallet size={18} />
                        ฝากเงิน
                    </button>
                    <button
                        onClick={() => setActiveTab("withdraw")}
                        style={{
                            flex: 1,
                            padding: "14px",
                            borderRadius: "26px",
                            fontWeight: 700,
                            fontSize: "14px",
                            border: "none",
                            cursor: "pointer",
                            transition: "all 0.3s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            background: activeTab === "withdraw" ? "linear-gradient(135deg, #FFD700, #FFC000)" : "transparent",
                            color: activeTab === "withdraw" ? "#0D1117" : "#8B949E",
                            boxShadow: activeTab === "withdraw" ? "0 4px 15px rgba(255,215,0,0.3)" : "none"
                        }}
                    >
                        <ArrowDownToLine size={18} />
                        ถอนเงิน
                    </button>
                </div>

                {activeTab === "deposit" ? (
                    <>
                        {/* Channel Selection */}
                        <div style={{
                            background: "#21262D",
                            borderRadius: "16px",
                            padding: "20px",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                            border: "1px solid rgba(255,255,255,0.1)"
                        }}>
                            <p style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF", marginBottom: "16px" }}>เลือกช่องทางฝาก</p>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                                {channels.map((ch) => (
                                    <button
                                        key={ch.id}
                                        onClick={() => setSelectedChannel(ch.id)}
                                        style={{
                                            padding: "14px 10px",
                                            borderRadius: "14px",
                                            border: selectedChannel === ch.id ? "2px solid #FFD700" : "2px solid rgba(255,255,255,0.1)",
                                            background: selectedChannel === ch.id ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.05)",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: "8px",
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                            transform: selectedChannel === ch.id ? "scale(1.05)" : "scale(1)",
                                            boxShadow: selectedChannel === ch.id ? "0 4px 15px rgba(255,215,0,0.2)" : "none"
                                        }}
                                    >
                                        <span style={{ fontSize: "28px" }}>{ch.emoji}</span>
                                        <span style={{ fontSize: "11px", fontWeight: 700, color: selectedChannel === ch.id ? "#FFD700" : "#8B949E" }}>
                                            {ch.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bank Accounts from API */}
                        {bankAccounts.length === 0 ? (
                            <div style={{
                                background: "#21262D",
                                borderRadius: "16px",
                                padding: "32px",
                                textAlign: "center",
                                boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                                border: "1px solid rgba(255,255,255,0.1)"
                            }}>
                                <AlertCircle size={48} color="#FFD700" style={{ marginBottom: "16px" }} />
                                <p style={{ color: "#8B949E", fontWeight: 600 }}>ยังไม่มีบัญชีรับฝาก กรุณาติดต่อแอดมิน</p>
                            </div>
                        ) : (
                            <>
                                {/* Bank Selection */}
                                {bankAccounts.length > 1 && (
                                    <div style={{
                                        background: "#21262D",
                                        borderRadius: "16px",
                                        padding: "16px",
                                        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                                        border: "1px solid rgba(255,255,255,0.1)"
                                    }}>
                                        <p style={{ fontSize: "12px", color: "#8B949E", marginBottom: "12px" }}>เลือกบัญชี</p>
                                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                            {bankAccounts.map((bank) => (
                                                <button
                                                    key={bank.id}
                                                    onClick={() => setSelectedBank(bank)}
                                                    style={{
                                                        padding: "10px 16px",
                                                        borderRadius: "10px",
                                                        border: selectedBank?.id === bank.id ? "2px solid #FFD700" : "1px solid rgba(255,255,255,0.1)",
                                                        background: selectedBank?.id === bank.id ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.05)",
                                                        cursor: "pointer",
                                                        fontWeight: 700,
                                                        fontSize: "13px",
                                                        color: "#FFFFFF"
                                                    }}
                                                >
                                                    {bank.bankName}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Selected Bank Info */}
                                {selectedBank && (
                                    <div style={{
                                        background: "#21262D",
                                        borderRadius: "16px",
                                        padding: "24px",
                                        textAlign: "center",
                                        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                                        border: "1px solid rgba(255,255,255,0.1)"
                                    }}>
                                        <div style={{
                                            width: "64px",
                                            height: "64px",
                                            margin: "0 auto 12px",
                                            background: bankColors[selectedBank.bankName] || "linear-gradient(135deg, #22C55E, #16A34A)",
                                            borderRadius: "16px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "12px",
                                            fontWeight: 800,
                                            color: "white",
                                            boxShadow: "0 6px 20px rgba(0,0,0,0.2)"
                                        }}>
                                            {selectedBank.bankName}
                                        </div>
                                        <h3 style={{ fontWeight: 700, fontSize: "18px", color: "#FFD700", marginBottom: "16px" }}>
                                            {selectedBank.bankName === "KBANK" ? "ธนาคารกสิกรไทย" :
                                                selectedBank.bankName === "SCB" ? "ธนาคารไทยพาณิชย์" :
                                                    selectedBank.bankName === "BBL" ? "ธนาคารกรุงเทพ" :
                                                        selectedBank.bankName === "KTB" ? "ธนาคารกรุงไทย" :
                                                            selectedBank.bankName}
                                        </h3>

                                        <div style={{
                                            background: "rgba(255,255,255,0.05)",
                                            borderRadius: "14px",
                                            padding: "16px",
                                            marginBottom: "12px",
                                            border: "1px solid rgba(255,255,255,0.1)"
                                        }}>
                                            <p style={{ fontSize: "12px", color: "#8B949E", marginBottom: "6px" }}>เลขบัญชี</p>
                                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px" }}>
                                                <span style={{ fontSize: "24px", fontWeight: 900, color: "#FFFFFF", letterSpacing: "2px" }}>
                                                    {selectedBank.accountNumber}
                                                </span>
                                                <button
                                                    onClick={() => handleCopy(selectedBank.accountNumber.replace(/-/g, ""), "acc")}
                                                    style={{ padding: "8px", background: "none", border: "none", cursor: "pointer", borderRadius: "8px" }}
                                                >
                                                    {copied === "acc" ? <Check size={20} color="#22C55E" /> : <Copy size={20} color="#999" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div style={{
                                            background: "rgba(255,255,255,0.05)",
                                            borderRadius: "14px",
                                            padding: "14px",
                                            border: "1px solid rgba(255,255,255,0.1)"
                                        }}>
                                            <p style={{ fontSize: "12px", color: "#8B949E", marginBottom: "4px" }}>ชื่อบัญชี</p>
                                            <p style={{ fontWeight: 700, color: "#FFFFFF", fontSize: "16px" }}>{selectedBank.accountName}</p>
                                        </div>

                                        <div style={{
                                            marginTop: "16px",
                                            background: "rgba(255, 215, 0, 0.1)",
                                            border: "1px solid rgba(255, 215, 0, 0.3)",
                                            borderRadius: "14px",
                                            padding: "14px"
                                        }}>
                                            <p style={{ fontSize: "13px", color: "#FFD700", fontWeight: 600 }}>
                                                💡 โอนเงินแล้วรอ 1-3 นาที เครดิตเข้าอัตโนมัติ
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                ) : (
                    <>
                        {/* Withdraw Form */}
                        <div style={{
                            background: "#21262D",
                            borderRadius: "16px",
                            padding: "24px",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                            border: "1px solid rgba(255,255,255,0.1)"
                        }}>
                            <div style={{ textAlign: "center", marginBottom: "24px" }}>
                                <p style={{ fontSize: "14px", color: "#8B949E", marginBottom: "6px" }}>ยอดเงินคงเหลือ</p>
                                <p style={{ fontSize: "32px", fontWeight: 900, color: "#FFD700", textShadow: "1px 1px 2px rgba(0,0,0,0.1)" }}>
                                    ฿{(user?.balance || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </p>
                            </div>

                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF", display: "block", marginBottom: "10px" }}>จำนวนเงิน</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    style={{
                                        width: "100%",
                                        background: "rgba(255,255,255,0.05)",
                                        border: "2px solid rgba(255,255,255,0.1)",
                                        borderRadius: "14px",
                                        padding: "16px",
                                        fontSize: "28px",
                                        fontWeight: 700,
                                        textAlign: "center",
                                        outline: "none",
                                        color: "#FFFFFF"
                                    }}
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "24px" }}>
                                {[100, 300, 500, 1000].map((amt) => (
                                    <button
                                        key={amt}
                                        style={{
                                            padding: "12px",
                                            background: "rgba(255,255,255,0.05)",
                                            borderRadius: "12px",
                                            fontSize: "14px",
                                            fontWeight: 700,
                                            color: "#FFFFFF",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            cursor: "pointer",
                                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                                        }}
                                    >
                                        {amt}
                                    </button>
                                ))}
                            </div>

                            {/* User's bank account */}
                            <div style={{
                                background: "rgba(255,255,255,0.05)",
                                borderRadius: "14px",
                                padding: "16px",
                                marginBottom: "16px",
                                border: "1px solid rgba(255,255,255,0.1)"
                            }}>
                                <p style={{ fontSize: "12px", color: "#8B949E", marginBottom: "10px" }}>บัญชีรับเงิน (บัญชีที่ท่านผูกไว้)</p>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <div style={{
                                        width: "42px",
                                        height: "42px",
                                        background: bankColors[user?.bankName] || "#22C55E",
                                        borderRadius: "10px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "white",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        boxShadow: "0 4px 12px rgba(34,197,94,0.3)"
                                    }}>
                                        {user?.bankName || "N/A"}
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 700, color: "#FFFFFF", fontSize: "14px" }}>{user?.bankAccount || "-"}</p>
                                        <p style={{ fontSize: "12px", color: "#8B949E" }}>{user?.fullName || "-"}</p>
                                    </div>
                                </div>
                            </div>

                            <button style={{
                                width: "100%",
                                background: "linear-gradient(135deg, #FFD700, #FFC000)",
                                color: "#0D1117",
                                border: "none",
                                padding: "16px",
                                borderRadius: "14px",
                                fontSize: "18px",
                                fontWeight: 700,
                                cursor: "pointer",
                                boxShadow: "0 6px 20px rgba(255,215,0,0.4)"
                            }}>
                                ยืนยันถอนเงิน
                            </button>
                        </div>
                    </>
                )}
            </div>
        </PlayerLayout>
    );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PlayerLayout from "@/components/PlayerLayout";
import { Wallet, ArrowDownToLine, Copy, Check, Building2, Smartphone, QrCode, AlertCircle } from "lucide-react";
import BankLogo from "@/components/BankLogo";

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

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + "/api";

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
    const [user, setUser] = useState<any>(() => {
        // Load user from localStorage immediately on mount
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem("user");
                if (saved && saved !== "undefined") return JSON.parse(saved);
            } catch { }
        }
        return null;
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
    const [selectedChannel, setSelectedChannel] = useState("bank");
    const [copied, setCopied] = useState<string | null>(null);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [depositAmount, setDepositAmount] = useState<string>("");
    const [qrData, setQrData] = useState<any>(null);
    const [generatingQr, setGeneratingQr] = useState(false);

    // ... existing effects ...

    const handleDeposit = async () => {
        if (!depositAmount || Number(depositAmount) <= 0) {
            alert("กรุณาระบุจำนวนเงิน");
            return;
        }

        setGeneratingQr(true);
        setQrData(null);
        try {
            // Using 'bibpay' as default gateway for now, or fetch from active gateway
            // Ideally we should get the gateway code dynamically, but for now hardcoding or using a prop
            // The PaymentService picks default if not specified.
            const res = await fetch(`${API_URL}/payment/deposit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    amount: Number(depositAmount),
                    gateway: 'bibpay' // Optional: let backend pick default
                })
            });
            const data = await res.json();
            if (data.success) {
                setQrData(data.data);
            } else {
                alert(data.message || "สร้าง QR Code ไม่สำเร็จ");
            }
        } catch (error) {
            console.error("Deposit error:", error);
            alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        } finally {
            setGeneratingQr(false);
        }
    };

    // ... existing components ...

    // Filter logic for banks (Manual)
    const renderManualDeposit = () => {
        // ... reuse existing logic for bank/truemoney ...
        const filteredBanks = bankAccounts.filter(bank => {
            const name = (bank.bankName || "").toLowerCase().replace(/[^a-z0-9]/g, '');
            if (selectedChannel === "truemoney") return name.includes("true");
            // if (selectedChannel === "promptpay") return name.includes("promptpay"); // PromptPay is now Auto
            return !name.includes("true") && !name.includes("promptpay");
        });

        if (filteredBanks.length === 0) {
            return (
                <div style={{
                    background: "#21262D",
                    borderRadius: "16px",
                    padding: "32px",
                    textAlign: "center",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255,255,255,0.1)"
                }}>
                    <AlertCircle size={48} color="#FFD700" style={{ marginBottom: "16px" }} />
                    <p style={{ color: "#8B949E", fontWeight: 600 }}>
                        {selectedChannel === "truemoney" ? "ยังไม่มีบัญชี TrueMoney" : "ยังไม่มีบัญชีธนาคาร"}
                    </p>
                </div>
            );
        }

        return (
            <>
                {/* Bank Selection */}
                <div style={{
                    background: "#21262D",
                    borderRadius: "16px",
                    padding: "16px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255,255,255,0.1)"
                }}>
                    <p style={{ fontSize: "12px", color: "#8B949E", marginBottom: "12px" }}>เลือกบัญชี</p>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        {filteredBanks.map((bank) => (
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
                                    color: "#FFFFFF",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px"
                                }}
                            >
                                <BankLogo bankCode={bank.bankName} width={24} height={24} />
                                {bank.bankName}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Selected Bank Info Details ... reused ... */}
                {selectedBank && (
                    <div style={{
                        background: "#21262D",
                        borderRadius: "16px",
                        padding: "24px",
                        textAlign: "center",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        marginTop: "16px"
                    }}>
                        <div style={{
                            width: "64px",
                            height: "64px",
                            margin: "0 auto 12px",
                            background: "rgba(255,255,255,0.05)",
                            borderRadius: "16px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            fontWeight: 800,
                            color: "white",
                            boxShadow: "0 6px 20px rgba(0,0,0,0.2)"
                        }}>
                            <BankLogo bankCode={selectedBank.bankName} width={48} height={48} />
                        </div>
                        <h3 style={{ fontWeight: 700, fontSize: "18px", color: "#FFD700", marginBottom: "16px" }}>
                            {selectedBank.bankName}
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
                    </div>
                )}
            </>
        );
    }

    return (
        <PlayerLayout>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Banner ... existing ... */}
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

                {/* Tabs ... existing ... */}
                <div style={{ display: "flex", background: "#21262D", borderRadius: "30px", padding: "4px", boxShadow: "0 4px 15px rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {/* ... same buttons ... */}
                    <button
                        onClick={() => setActiveTab("deposit")}
                        style={{
                            flex: 1, padding: "14px", borderRadius: "26px", fontWeight: 700, fontSize: "14px", border: "none", cursor: "pointer", transition: "all 0.3s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                            background: activeTab === "deposit" ? "linear-gradient(135deg, #FFD700, #FFC000)" : "transparent",
                            color: activeTab === "deposit" ? "#0D1117" : "#8B949E",
                            boxShadow: activeTab === "deposit" ? "0 4px 15px rgba(255,215,0,0.3)" : "none"
                        }}
                    >
                        <Wallet size={18} /> ฝากเงิน
                    </button>
                    <button
                        onClick={() => setActiveTab("withdraw")}
                        style={{
                            flex: 1, padding: "14px", borderRadius: "26px", fontWeight: 700, fontSize: "14px", border: "none", cursor: "pointer", transition: "all 0.3s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                            background: activeTab === "withdraw" ? "linear-gradient(135deg, #FFD700, #FFC000)" : "transparent",
                            color: activeTab === "withdraw" ? "#0D1117" : "#8B949E",
                            boxShadow: activeTab === "withdraw" ? "0 4px 15px rgba(255,215,0,0.3)" : "none"
                        }}
                    >
                        <ArrowDownToLine size={18} /> ถอนเงิน
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
                                        onClick={() => { setSelectedChannel(ch.id); setQrData(null); }}
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

                        {/* Content based on Channel */}
                        {selectedChannel === "promptpay" ? (
                            <div style={{
                                background: "#21262D",
                                borderRadius: "16px",
                                padding: "24px",
                                boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                textAlign: "center"
                            }}>
                                {!qrData ? (
                                    <>
                                        <p style={{ fontSize: "14px", color: "#8B949E", marginBottom: "12px" }}>ระบุจำนวนเงินที่ต้องการฝาก</p>
                                        <input
                                            type="number"
                                            value={depositAmount}
                                            onChange={(e) => setDepositAmount(e.target.value)}
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
                                                color: "#FFFFFF",
                                                marginBottom: "24px"
                                            }}
                                        />

                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "24px" }}>
                                            {[100, 300, 500, 1000].map((amt) => (
                                                <button
                                                    key={amt}
                                                    onClick={() => setDepositAmount(amt.toString())}
                                                    style={{
                                                        padding: "10px",
                                                        background: "rgba(255,255,255,0.05)",
                                                        borderRadius: "10px",
                                                        fontSize: "13px",
                                                        fontWeight: 700,
                                                        color: "#FFFFFF",
                                                        border: "1px solid rgba(255,255,255,0.1)",
                                                        cursor: "pointer"
                                                    }}
                                                >
                                                    {amt}
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            onClick={handleDeposit}
                                            disabled={generatingQr}
                                            style={{
                                                width: "100%",
                                                background: "linear-gradient(135deg, #FFD700, #FFC000)",
                                                color: "#0D1117",
                                                border: "none",
                                                padding: "16px",
                                                borderRadius: "14px",
                                                fontSize: "18px",
                                                fontWeight: 700,
                                                cursor: generatingQr ? "not-allowed" : "pointer",
                                                opacity: generatingQr ? 0.7 : 1,
                                                boxShadow: "0 6px 20px rgba(255,215,0,0.4)"
                                            }}
                                        >
                                            {generatingQr ? "กำลังสร้าง QR..." : "สร้าง QR Code"}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ marginBottom: "20px" }}>
                                            <p style={{ fontSize: "16px", color: "#FFD700", fontWeight: 700, marginBottom: "8px" }}>สแกนเพื่อจ่ายเงิน</p>
                                            <div style={{
                                                background: "white",
                                                padding: "16px",
                                                borderRadius: "16px",
                                                display: "inline-block",
                                                boxShadow: "0 0 20px rgba(255, 255, 255, 0.1)"
                                            }}>
                                                <img src={qrData.qrCode} alt="QR Code" style={{ width: "200px", height: "auto" }} />
                                            </div>
                                        </div>
                                        <p style={{ fontSize: "24px", fontWeight: 900, color: "#FFFFFF" }}>฿{Number(qrData.amount).toLocaleString()}</p>
                                        <p style={{ fontSize: "12px", color: "#8B949E", marginTop: "12px" }}>ยอดเงินจะเข้าอัตโนมัติเมื่อทำรายการสำเร็จ</p>

                                        <button
                                            onClick={() => setQrData(null)}
                                            style={{
                                                marginTop: "24px",
                                                background: "rgba(255,255,255,0.1)",
                                                color: "white",
                                                border: "none",
                                                padding: "12px 24px",
                                                borderRadius: "10px",
                                                fontSize: "14px",
                                                cursor: "pointer"
                                            }}
                                        >
                                            ทำรายการใหม่
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : (
                            renderManualDeposit()
                        )}
                    </>
                ) : (
                    // Withdraw Form ... existing ...
                    <div style={{
                        background: "#21262D",
                        borderRadius: "16px",
                        padding: "24px",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                        border: "1px solid rgba(255,255,255,0.1)"
                    }}>
                        {/* ... keep withdraw form as is ... */}
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
                                    background: "rgba(255,255,255,0.05)",
                                    borderRadius: "10px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                                }}>
                                    <BankLogo bankCode={user?.bankName} width={32} height={32} />
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
                )}
            </div>
        </PlayerLayout>
    );
}

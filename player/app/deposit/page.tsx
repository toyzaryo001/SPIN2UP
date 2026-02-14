"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PlayerLayout from "@/components/PlayerLayout";
import { Wallet, ArrowDownToLine, Copy, Check, Building2, Smartphone, QrCode, AlertCircle } from "lucide-react";
import BankLogo from "@/components/BankLogo";
import AlertModal from "@/components/AlertModal";
import { API_URL } from "@/lib/api";

const channels = [
    { id: "bank", label: "ธนาคาร", icon: Building2, emoji: "🏦" },
    { id: "truemoney", label: "TrueMoney", icon: Smartphone, emoji: "📱" },
    { id: "promptpay", label: "PromptPay", icon: QrCode, emoji: "📲" },
];

// ... (Keep existing BankColors interface & consts)

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

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem("user");
                if (saved && saved !== "undefined") {
                    setUser(JSON.parse(saved));
                } else {
                    router.push("/");
                }
            } catch { }
        }
        setLoading(false);
    }, []);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
    const [selectedChannel, setSelectedChannel] = useState("bank");
    const [copied, setCopied] = useState<string | null>(null);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [depositAmount, setDepositAmount] = useState<string>("");
    const [qrData, setQrData] = useState<any>(null);
    const [generatingQr, setGeneratingQr] = useState(false);
    const [features, setFeatures] = useState<any>({});
    const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
    const [withdrawAmount, setWithdrawAmount] = useState<string>("");
    const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

    // Alert Modal State
    const [alertState, setAlertState] = useState<{
        isOpen: boolean;
        title?: string;
        message: string;
        type: "success" | "error" | "warning";
    }>({
        isOpen: false,
        message: "",
        type: "error"
    });

    const showAlert = (message: string, type: "success" | "error" | "warning" = "error", title?: string) => {
        setAlertState({ isOpen: true, message, type, title });
    };

    const handleCopy = (text: string, type: string) => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    useEffect(() => {
        if (!user) {
            const saved = localStorage.getItem("user");
            if (saved) setUser(JSON.parse(saved));
            else router.push("/");
            return;
        }
        setLoading(false);
        fetchConfig();
    }, [user]);

    const fetchConfig = async () => {
        try {
            const res = await fetch(`${API_URL}/auth/config?domain=${window.location.hostname}`);
            const data = await res.json();
            if (data.success && data.data && data.data.features) {
                setFeatures(data.data.features);
                if (data.data.features.deposit === false && activeTab === 'deposit') {
                    setActiveTab('withdraw');
                }
            }
        } catch (error) {
            console.error("Config fetch error:", error);
        }
    };

    const fetchBankAccounts = async () => {
        try {
            const res = await fetch(`${API_URL}/public/bank-accounts?type=deposit`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setBankAccounts(data);
            }
        } catch (error) {
            console.error("Fetch banks error:", error);
        }
    };

    useEffect(() => {
        if (loading) return;
        fetchConfig();
        fetchBankAccounts();
    }, [loading]);

    const handleDeposit = async () => {
        if (!depositAmount || Number(depositAmount) <= 0) {
            showAlert("กรุณาระบุจำนวนเงิน", "warning");
            return;
        }

        setGeneratingQr(true);
        setQrData(null);
        try {
            const res = await fetch(`${API_URL}/payment/deposit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    amount: Number(depositAmount),
                    gateway: 'bibpay'
                })
            });
            const data = await res.json();

            if (data.success) {
                setQrData(data.data);
            } else {
                // Localize Error Messages
                let msg = String(data.message || "สร้าง QR Code ไม่สำเร็จ");
                if (msg.includes("Payment gateway not available")) {
                    msg = "ระบบฝากเงินยังไม่เปิดให้บริการในขณะนี้";
                } else if (msg.includes("Invalid amount")) {
                    msg = "จำนวนเงินไม่ถูกต้อง";
                } else if (msg.includes("User not found")) {
                    msg = "ไม่พบข้อมูลผู้ใช้";
                } else if (msg.includes("Payment gateway configuration not found")) {
                    msg = "ไม่พบการตั้งค่าช่องทางชำระเงิน";
                } else if (msg.includes("Payment gateway is not active")) {
                    msg = "ช่องทางชำระเงินปิดปรับปรุงชั่วคราว";
                } else if (msg.includes("Deposit is temporarily disabled")) {
                    msg = "ระบบฝากเงินปิดปรับปรุงชั่วคราว";
                }

                showAlert(msg, "error");
            }
        } catch (error) {
            console.error("Deposit error:", error);
            showAlert("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
        } finally {
            setGeneratingQr(false);
        }
    };

    const handleWithdraw = async () => {
        if (!withdrawAmount || Number(withdrawAmount) <= 0) {
            showAlert("กรุณาระบุจำนวนเงิน", "warning");
            return;
        }

        if (Number(user?.balance || 0) < Number(withdrawAmount)) {
            showAlert("ยอดเงินคงเหลือไม่เพียงพอ", "error");
            return;
        }

        setSubmittingWithdraw(true);
        try {
            const res = await fetch(`${API_URL}/wallet/withdraw`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    amount: Number(withdrawAmount)
                })
            });
            const data = await res.json();

            if (data.success) {
                showAlert(String(data.message || "ทำรายการถอนเงินสำเร็จ"), "success");
                setWithdrawAmount("");
                // Refresh User Balance
                const userRes = await fetch(`${API_URL}/auth/me`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }
                });
                const userData = await userRes.json();
                if (userData.success) setUser(userData.user);
            } else {
                showAlert(String(data.message || "ทำรายการไม่สำเร็จ"), "error");
            }
        } catch (error) {
            console.error("Withdraw error:", error);
            showAlert("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
        } finally {
            setSubmittingWithdraw(false);
        }
    };

    // ... (rest of the component render logic)
    // IMPORTANT: Inject <AlertModal /> before closing PlayerLayout

    const renderManualDeposit = () => {
        // ... (reuse existing logic)
        const filteredBanks = bankAccounts.filter(bank => {
            const name = (bank.bankName || "").toLowerCase().replace(/[^a-z0-9]/g, '');
            if (selectedChannel === "truemoney") return name.includes("true");
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

                {/* Selected Bank Info Details */}
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
            {/* ... (keep Banner and Tabs) ... */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Banner ... */}
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
                    {(features.deposit !== false) && (
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
                    )}
                    {(features.withdraw !== false) && (
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
                    )}
                </div>

                {activeTab === "deposit" ? (
                    // ... (keep deposit content)
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
                                {channels.filter(ch => {
                                    if (ch.id === 'promptpay' && features.auto_deposit === false) return false;
                                    return true;
                                }).map((ch) => (
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
                    // Withdraw Form
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
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
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
                                    onClick={() => setWithdrawAmount(amt.toString())}
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

                        <button
                            onClick={handleWithdraw}
                            disabled={submittingWithdraw}
                            style={{
                                width: "100%",
                                background: "linear-gradient(135deg, #FFD700, #FFC000)",
                                color: "#0D1117",
                                border: "none",
                                padding: "16px",
                                borderRadius: "14px",
                                fontSize: "18px",
                                fontWeight: 700,
                                cursor: submittingWithdraw ? "not-allowed" : "pointer",
                                opacity: submittingWithdraw ? 0.7 : 1,
                                boxShadow: "0 6px 20px rgba(255,215,0,0.4)"
                            }}
                        >
                            {submittingWithdraw ? "กำลังทำรายการ..." : "ยืนยันถอนเงิน"}
                        </button>
                    </div>
                )}
            </div>

            <AlertModal
                isOpen={alertState.isOpen}
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
            />
        </PlayerLayout>
    );
}
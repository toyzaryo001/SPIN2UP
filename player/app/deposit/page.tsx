"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import PlayerLayout from "@/components/PlayerLayout";
import { Wallet, ArrowDownToLine, Copy, Check, Building2, Smartphone, QrCode, AlertCircle } from "lucide-react";
import BankLogo from "@/components/BankLogo";
import AlertModal from "@/components/AlertModal";
import { API_URL } from "@/lib/api";

const channels = [
    { id: "bank", label: "ธนาคาร", icon: Building2, bankCode: "KBANK" },
    { id: "truemoney", label: "TrueMoney", icon: Smartphone, bankCode: "TRUEMONEY" },
    { id: "promptpay", label: "PromptPay", icon: QrCode, bankCode: "PROMPTPAY" },
];

// ... (Keep existing BankColors interface & consts)

interface BankAccount {
    id: number | string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    type: string;
    isActive: boolean;
    minDeposit?: number;
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

interface DepositQrData {
    transactionId: number;
    referenceId: string;
    qrCode: string;
    amount: number;
    expiredAt?: string;
}

const formatCurrency = (value: number | null | undefined) =>
    Number(value || 0).toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const isTrueMoneyUserAccount = (bankName?: string | null) => {
    const normalized = String(bankName || "").trim().toUpperCase();
    return normalized === "TRUEMONEY" || normalized === "TRUEWALLET";
};

const getDepositStatusMessage = (status: string) => {
    switch (status) {
        case "COMPLETED":
        case "APPROVED":
            return "ฝากสำเร็จ ระบบกำลังอัปเดตยอดให้อัตโนมัติ";
        case "PROCESSING":
            return "กำลังตรวจสอบยอดฝากของคุณ";
        case "FAILED":
        case "REJECTED":
            return "รายการฝากไม่สำเร็จ กรุณาสร้างรายการใหม่";
        default:
            return "กำลังรอการชำระเงินและตรวจสอบยอดอัตโนมัติ";
    }
};

const getPromotionFormula = (promotion: SelectedPromotionSummary) => {
    if (promotion.type === "FIXED") {
        return `โบนัส ${formatCurrency(promotion.value)} บาท`;
    }

    const maxBonusText = promotion.maxBonus ? ` สูงสุด ${formatCurrency(promotion.maxBonus)} บาท` : "";
    return `โบนัส ${promotion.value}%${maxBonusText}`;
};

export default function DepositPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const trueMoneyWatchBalanceRef = useRef<number | null>(null);
    const trueMoneyAlertShownRef = useRef(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem("user");
                if (saved && saved !== "undefined") {
                    const parsedUser = JSON.parse(saved);
                    setUser(parsedUser);
                    // Auto-select TrueMoney channel for wallet-registered users
                    if (isTrueMoneyUserAccount(parsedUser?.bankName)) {
                        setSelectedChannel('truemoney');
                    }
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
    const [qrData, setQrData] = useState<DepositQrData | null>(null);
    const [generatingQr, setGeneratingQr] = useState(false);
    const [depositStatusMessage, setDepositStatusMessage] = useState("");
    const [features, setFeatures] = useState<any>({});
    const [config, setConfig] = useState<any>({});
    const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
    const [withdrawAmount, setWithdrawAmount] = useState<string>("");
    const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
    const [selectedPromotion, setSelectedPromotion] = useState<SelectedPromotionSummary | null>(null);
    const isTrueMoneyUser = isTrueMoneyUserAccount(user?.bankName);

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

    const refreshUserProfile = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            return null;
        }

        try {
            const res = await fetch(`${API_URL}/users/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                localStorage.removeItem("lastActive");
                window.dispatchEvent(new Event("user-logout"));
                router.push("/?action=login");
                return null;
            }

            const data = await res.json();

            if (data.success) {
                setUser(data.data);
                localStorage.setItem("user", JSON.stringify(data.data));
                return data.data;
            }
        } catch (error) {
            console.error("User profile refresh error:", error);
        }

        return null;
    };

    const fetchSelectedPromotion = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            setSelectedPromotion(null);
            return;
        }

        try {
            const res = await fetch(`${API_URL}/users/promotions/selected`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                setSelectedPromotion(data.data || null);
            }
        } catch (error) {
            console.error("Selected promotion fetch error:", error);
        }
    };

    const clearSelectedPromotion = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            return;
        }

        try {
            const res = await fetch(`${API_URL}/users/promotions/selected`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                setSelectedPromotion(null);
                showAlert("ยกเลิกโปรโมชั่นที่เลือกแล้ว", "success");
            } else {
                showAlert(String(data.message || "ยกเลิกโปรโมชั่นไม่สำเร็จ"), "error");
            }
        } catch (error) {
            console.error("Clear selected promotion error:", error);
            showAlert("เกิดข้อผิดพลาดในการยกเลิกโปรโมชั่น", "error");
        }
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

    useEffect(() => {
        if (loading) return;

        refreshUserProfile();
        fetchSelectedPromotion();
    }, [loading]);

    useEffect(() => {
        if (isTrueMoneyUser && selectedChannel !== "truemoney") {
            setSelectedChannel("truemoney");
            setQrData(null);
        }
    }, [isTrueMoneyUser, selectedChannel]);

    const fetchConfig = async () => {
        try {
            const res = await fetch(`${API_URL}/public/settings`);
            const data = await res.json();
            if (data.settings) {
                setConfig(data.settings);
            }
            if (data.features) {
                setFeatures(data.features);
                if (data.features.deposit === false && activeTab === 'deposit') {
                    setActiveTab('withdraw');
                }
            }
        } catch (error) {
            console.error("Config fetch error:", error);
        }
    };

    const fetchBankAccounts = async () => {
        try {
            const [bankRes, tmRes] = await Promise.all([
                fetch(`${API_URL}/public/bank-accounts?type=deposit`),
                fetch(`${API_URL}/public/truemoney`)
            ]);

            const bankData = await bankRes.json();
            const tmData = await tmRes.json();

            let allAccounts: BankAccount[] = [];

            if (Array.isArray(bankData)) {
                allAccounts = [...allAccounts, ...bankData];
            }

            if (Array.isArray(tmData)) {
                // Map TrueMoney data to match BankAccount interface
                const mappedTm = tmData.map(tm => ({
                    id: `tm_${tm.id}`, // Ensure unique ID
                    bankName: 'TrueMoney',
                    accountNumber: tm.phoneNumber || tm.phone,
                    accountName: tm.accountName || tm.name,
                    type: 'truemoney', // Distinct type
                    isActive: tm.isActive,
                    minDeposit: tm.minDeposit || 0
                }));
                allAccounts = [...allAccounts, ...mappedTm];
            }

            setBankAccounts(allAccounts);
        } catch (error) {
            console.error("Fetch accounts error:", error);
        }
    };

    useEffect(() => {
        if (loading) return;
        fetchConfig();
        fetchBankAccounts();
    }, [loading]);

    useEffect(() => {
        if (!qrData?.transactionId) {
            setDepositStatusMessage("");
            return;
        }

        let isMounted = true;

        const pollDepositStatus = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                return;
            }

            try {
                const res = await fetch(`${API_URL}/payment/deposit/${qrData.transactionId}/status`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();

                if (!isMounted || !data.success) {
                    return;
                }

                const status = String(data.data?.status || "PENDING").toUpperCase();
                setDepositStatusMessage(getDepositStatusMessage(status));

                if (status === "COMPLETED" || status === "APPROVED") {
                    await refreshUserProfile();
                    await fetchSelectedPromotion();

                    if (!isMounted) {
                        return;
                    }

                    setQrData(null);
                    setDepositAmount("");
                    showAlert("ฝากเงินสำเร็จ ระบบอัปเดตยอดให้อัตโนมัติแล้ว", "success");
                    return;
                }

                if (status === "FAILED" || status === "REJECTED") {
                    if (!isMounted) {
                        return;
                    }

                    setQrData(null);
                    showAlert(String(data.data?.note || "รายการฝากไม่สำเร็จ กรุณาสร้างรายการใหม่"), "error");
                }
            } catch (error) {
                console.error("Deposit status poll error:", error);
            }
        };

        setDepositStatusMessage(getDepositStatusMessage("PENDING"));
        pollDepositStatus();

        const interval = window.setInterval(pollDepositStatus, 5000);

        return () => {
            isMounted = false;
            window.clearInterval(interval);
        };
    }, [qrData?.transactionId]);

    useEffect(() => {
        if (activeTab !== "deposit" || selectedChannel !== "truemoney") {
            trueMoneyWatchBalanceRef.current = null;
            trueMoneyAlertShownRef.current = false;
            return;
        }

        if (trueMoneyWatchBalanceRef.current === null) {
            trueMoneyWatchBalanceRef.current = Number(user?.balance || 0);
        }

        let isMounted = true;

        const pollTrueMoneyBalance = async () => {
            const profile = await refreshUserProfile();
            if (!isMounted || !profile) {
                return;
            }

            const nextBalance = Number(profile.balance || 0);
            const baseBalance = Number(trueMoneyWatchBalanceRef.current || 0);

            if (nextBalance > baseBalance && !trueMoneyAlertShownRef.current) {
                trueMoneyAlertShownRef.current = true;
                trueMoneyWatchBalanceRef.current = nextBalance;
                showAlert("รับยอดฝาก TrueMoney สำเร็จ ระบบอัปเดตยอดให้อัตโนมัติแล้ว", "success");
                return;
            }

            if (nextBalance < baseBalance) {
                trueMoneyWatchBalanceRef.current = nextBalance;
                trueMoneyAlertShownRef.current = false;
            }
        };

        const interval = window.setInterval(pollTrueMoneyBalance, 10000);

        return () => {
            isMounted = false;
            window.clearInterval(interval);
        };
    }, [activeTab, selectedChannel, user?.id]);

    // Auto-select first bank when channel changes
    useEffect(() => {
        const channelFilteredBanks = bankAccounts.filter(bank => {
            if (isTrueMoneyUser) return bank.type === "truemoney" || bank.bankName === "TrueMoney";
            if (selectedChannel === "truemoney") return bank.type === "truemoney" || bank.bankName === "TrueMoney";
            return bank.type !== "truemoney" && bank.bankName !== "TrueMoney" && bank.bankName !== "PromptPay";
        });

        if (channelFilteredBanks.length > 0) {
            if (!selectedBank || !channelFilteredBanks.find(b => b.id === selectedBank.id)) {
                setSelectedBank(channelFilteredBanks[0]);
            }
        } else {
            setSelectedBank(null);
        }
    }, [selectedChannel, bankAccounts, isTrueMoneyUser]);

    const handleDeposit = async () => {
        if (!depositAmount || Number(depositAmount) <= 0) {
            showAlert("กรุณาระบุจำนวนเงิน", "warning");
            return;
        }

        if (selectedPromotion && Number(depositAmount) < Number(selectedPromotion.minDeposit || 0)) {
            showAlert(
                `ยอดฝากยังไม่ถึงขั้นต่ำของโปรโมชั่นที่เลือก (ขั้นต่ำ ${formatCurrency(selectedPromotion.minDeposit)} บาท)`,
                "warning"
            );
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
                setDepositStatusMessage(getDepositStatusMessage("PENDING"));
                fetchSelectedPromotion();
                refreshUserProfile();
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
                } else if (msg.includes("Auto deposit is disabled")) {
                    msg = "ระบบฝากเงินอัตโนมัติปิดปรับปรุงชั่วคราว";
                } else if (msg.includes("maintenance") || msg.includes("Maintenance")) {
                    msg = "ระบบชำระเงินอยู่ระหว่างปรับปรุง กรุณาลองใหม่ภายหลัง";
                } else if (msg.includes("Failed to create payment")) {
                    msg = "ไม่สามารถสร้างรายการฝากเงินได้ กรุณาลองใหม่อีกครั้ง";
                } else if (msg.includes("SELECTED_PROMOTION_MIN_DEPOSIT_NOT_MET")) {
                    msg = "ยอดฝากยังไม่ถึงขั้นต่ำของโปรโมชั่นที่เลือก";
                } else if (/^[a-zA-Z\s.,!?:;()\-]+$/.test(msg)) {
                    // Catch-all: If message is entirely English, show generic Thai error
                    console.error("[Deposit] Untranslated error:", msg);
                    msg = "ไม่สามารถทำรายการได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง หรือติดต่อแอดมิน";
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

        if (hasIncompleteTurnover) {
            showAlert(`ท่านยังทำเทิร์นไม่ครบ (ขาดอีก ${formatCurrency(turnoverRemaining)} บาท)`, "warning");
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
                refreshUserProfile();
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

    const turnoverRemaining = Math.max(
        0,
        Number(user?.turnoverLimit || 0) - Number(user?.currentTurnover || 0)
    );
    const hasIncompleteTurnover = Number(user?.turnoverLimit || 0) > 0 && turnoverRemaining > 0;
    const depositBlockedByPromotion =
        !!selectedPromotion &&
        Number(depositAmount || 0) > 0 &&
        Number(depositAmount) < Number(selectedPromotion.minDeposit || 0);

    // ... (rest of the component render logic)
    // IMPORTANT: Inject <AlertModal /> before closing PlayerLayout

    const renderManualDeposit = () => {
        const filteredBanks = bankAccounts.filter(bank => {
            if (isTrueMoneyUser) return bank.type === "truemoney" || bank.bankName === "TrueMoney";
            if (selectedChannel === "truemoney") return bank.type === "truemoney" || bank.bankName === "TrueMoney";
            // For standard bank transfer, exclude truemoney
            return bank.type !== "truemoney" && bank.bankName !== "TrueMoney" && bank.bankName !== "PromptPay";
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
                    <AlertCircle size={48} color="#FFD700" style={{ marginBottom: "16px", marginInline: "auto" }} />
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
                            background: "rgba(34, 197, 94, 0.1)",
                            border: "1px solid rgba(34, 197, 94, 0.2)",
                            borderRadius: "10px",
                            padding: "12px",
                            marginBottom: "16px",
                            textAlign: "center"
                        }}>
                            <p style={{ color: "#22C55E", fontSize: "14px", fontWeight: 700, marginBottom: "4px" }}>
                                ⚡ เข้าอัตโนมัติ 1-3 นาที
                            </p>
                            {Number(selectedBank.minDeposit) > 0 && (
                                <p style={{ color: "#EF4444", fontSize: "13px", fontWeight: 600 }}>
                                    ⚠️ ฝากขั้นต่ำ {selectedBank.minDeposit} บาท
                                </p>
                            )}
                        </div>

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
    };

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
                        {selectedPromotion && (
                            <div style={{
                                background: "linear-gradient(135deg, rgba(255,215,0,0.12), rgba(249,115,22,0.16))",
                                borderRadius: "16px",
                                padding: "18px",
                                border: "1px solid rgba(255,215,0,0.28)",
                                boxShadow: "0 4px 20px rgba(0,0,0,0.18)"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#FFD700" }}>โปรโมชั่นที่เลือกอยู่</p>
                                        <h3 style={{ margin: "6px 0 8px", color: "#FFFFFF", fontSize: "18px", fontWeight: 800 }}>{selectedPromotion.name}</h3>
                                        <p style={{ margin: 0, color: "#D1D5DB", fontSize: "13px", lineHeight: 1.55 }}>
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
                                                {selectedPromotion.requiresTurnover ? `ติดเทิร์น x${selectedPromotion.turnoverMultiplier}` : "ไม่ติดเทิร์น"}
                                            </span>
                                        </div>
                                        <p style={{ margin: "12px 0 0", fontSize: "12px", color: "#CBD5E1" }}>
                                            โปรโมชั่นนี้จะถูกใช้กับรายการฝากที่เข้าเงื่อนไขครั้งถัดไป
                                        </p>
                                    </div>
                                    <button
                                        onClick={clearSelectedPromotion}
                                        style={{
                                            border: "none",
                                            background: "rgba(239,68,68,0.14)",
                                            color: "#FCA5A5",
                                            borderRadius: "12px",
                                            padding: "10px 14px",
                                            cursor: "pointer",
                                            fontWeight: 700
                                        }}
                                    >
                                        ยกเลิก
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Channel Selection */}
                        <div style={{
                            background: "#21262D",
                            borderRadius: "16px",
                            padding: "20px",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                            border: "1px solid rgba(255,255,255,0.1)"
                        }}>
                            <p style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF", marginBottom: "16px" }}>เลือกช่องทางฝาก</p>
                            <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
                                {channels.filter(ch => {
                                    // Protect against initial empty state before fetchConfig completes
                                    if (Object.keys(features).length === 0) return false;

                                    if (isTrueMoneyUser) {
                                        return ch.id === 'truemoney' && features.deposit_truemoney !== false;
                                    }

                                    if (ch.id === 'bank' && features.deposit_bank === false) return false;
                                    if (ch.id === 'truemoney' && features.deposit_truemoney === false) return false;
                                    if (ch.id === 'promptpay' && features.deposit_promptpay === false) return false;
                                    return true;
                                }).map((ch) => (
                                    <button
                                        key={ch.id}
                                        onClick={() => { setSelectedChannel(ch.id); setQrData(null); }}
                                        style={{
                                            padding: "14px 10px",
                                            minWidth: "100px",
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
                                        {'customImage' in ch && ch.customImage ? (
                                            <img src={ch.customImage as string} alt={ch.label} style={{ width: "42px", height: "42px", objectFit: "contain" }} />
                                        ) : (
                                            <BankLogo
                                                bankCode={
                                                    ch.id === 'bank'
                                                        ? (bankAccounts.find(b => b.type !== 'truemoney' && b.bankName !== 'TrueMoney' && b.bankName !== 'PromptPay')?.bankName || ch.bankCode)
                                                        : ch.bankCode
                                                }
                                                width={36}
                                                height={36}
                                            />
                                        )}
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
                                        <div style={{ marginBottom: "16px" }}>
                                            <p style={{ color: "#22C55E", fontSize: "14px", fontWeight: 700, marginBottom: "4px" }}>
                                                ⚡ เข้าอัตโนมัติ 1-3 นาที
                                            </p>
                                            {selectedBank && Number(selectedBank.minDeposit) > 0 && (
                                                <p style={{ color: "#EF4444", fontSize: "13px", fontWeight: 600 }}>
                                                    ⚠️ ฝากขั้นต่ำ {selectedBank.minDeposit} บาท
                                                </p>
                                            )}
                                        </div>
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

                                        {depositBlockedByPromotion && selectedPromotion && (
                                            <div style={{
                                                background: "rgba(239,68,68,0.1)",
                                                border: "1px solid rgba(239,68,68,0.2)",
                                                borderRadius: "12px",
                                                padding: "12px",
                                                marginBottom: "16px",
                                                color: "#FCA5A5",
                                                fontSize: "13px",
                                                lineHeight: 1.5
                                            }}>
                                                ยอดฝากยังไม่ถึงขั้นต่ำของโปรโมชั่นที่เลือก ต้องฝากอย่างน้อย {formatCurrency(selectedPromotion.minDeposit)} บาท
                                            </div>
                                        )}

                                        <button
                                            onClick={handleDeposit}
                                            disabled={generatingQr || depositBlockedByPromotion}
                                            style={{
                                                width: "100%",
                                                background: "linear-gradient(135deg, #FFD700, #FFC000)",
                                                color: "#0D1117",
                                                border: "none",
                                                padding: "16px",
                                                borderRadius: "14px",
                                                fontSize: "18px",
                                                fontWeight: 700,
                                                cursor: generatingQr || depositBlockedByPromotion ? "not-allowed" : "pointer",
                                                opacity: generatingQr || depositBlockedByPromotion ? 0.7 : 1,
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

                                        <p style={{ fontSize: "12px", color: "#22C55E", marginTop: "8px", fontWeight: 700 }}>
                                            {depositStatusMessage || "กำลังรอการชำระเงินและตรวจสอบยอดอัตโนมัติ"}
                                        </p>
                                        <p style={{ fontSize: "11px", color: "#8B949E", marginTop: "6px" }}>
                                            Ref: {qrData.referenceId}
                                        </p>

                                        <button
                                            onClick={() => {
                                                setQrData(null);
                                                setDepositStatusMessage("");
                                            }}
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
                            <div style={{
                                marginTop: "12px",
                                display: "inline-block",
                                background: "rgba(16, 185, 129, 0.1)",
                                border: "1px solid rgba(16, 185, 129, 0.2)",
                                padding: "6px 16px",
                                borderRadius: "20px"
                            }}>
                                <p style={{ fontSize: "12px", color: "#10B981", fontWeight: 600 }}>
                                    ⏱ ระบบจะดำเนินการโอนเงินให้ท่านภายใน 1-5 นาที
                                </p>
                            </div>
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                <label style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF" }}>จำนวนเงิน</label>
                                <span style={{ fontSize: "12px", color: "#EF4444", fontWeight: 700 }}>
                                    ถอนขั้นต่ำ {config?.minWithdraw || '100'} บาท
                                </span>
                            </div>
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

                        {Number(user?.turnoverLimit || 0) > 0 && (
                            <div style={{
                                background: "rgba(239,68,68,0.1)",
                                borderRadius: "14px",
                                padding: "16px",
                                marginBottom: "16px",
                                border: "1px solid rgba(239,68,68,0.2)"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", color: "#FCA5A5", fontWeight: 700 }}>
                                    <AlertCircle size={16} />
                                    ยอดเทิร์นโอเวอร์
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#E2E8F0", marginBottom: "8px" }}>
                                    <span>ความคืบหน้า</span>
                                    <span>{formatCurrency(Number(user?.currentTurnover || 0))} / {formatCurrency(Number(user?.turnoverLimit || 0))} บาท</span>
                                </div>
                                <div style={{ width: "100%", height: "8px", borderRadius: "999px", background: "rgba(15,23,42,0.55)", overflow: "hidden" }}>
                                    <div
                                        style={{
                                            width: `${Math.min(100, (Number(user?.currentTurnover || 0) / Math.max(1, Number(user?.turnoverLimit || 0))) * 100)}%`,
                                            height: "100%",
                                            background: "linear-gradient(90deg, #EF4444, #F97316)"
                                        }}
                                    />
                                </div>
                                <p style={{ margin: "10px 0 0", fontSize: "12px", color: hasIncompleteTurnover ? "#FCA5A5" : "#86EFAC" }}>
                                    {hasIncompleteTurnover
                                        ? `ยังขาดอีก ${formatCurrency(turnoverRemaining)} บาทก่อนถอน`
                                        : "ทำเทิร์นครบแล้ว สามารถถอนเงินได้"}
                                </p>
                            </div>
                        )}

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
                            disabled={submittingWithdraw || hasIncompleteTurnover}
                            style={{
                                width: "100%",
                                background: "linear-gradient(135deg, #FFD700, #FFC000)",
                                color: "#0D1117",
                                border: "none",
                                padding: "16px",
                                borderRadius: "14px",
                                fontSize: "18px",
                                fontWeight: 700,
                                cursor: submittingWithdraw || hasIncompleteTurnover ? "not-allowed" : "pointer",
                                opacity: submittingWithdraw || hasIncompleteTurnover ? 0.7 : 1,
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

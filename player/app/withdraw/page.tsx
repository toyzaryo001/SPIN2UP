"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { ArrowDownToLine, AlertCircle, CheckCircle2 } from "lucide-react";
import BankLogo from "@/components/BankLogo";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + "/api";

export default function WithdrawPage() {
    const router = useRouter();
    const [amount, setAmount] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [minWithdraw, setMinWithdraw] = useState(100); // Default, could fetch from settings

    // Quick amounts for easy selection
    const quickAmounts = [100, 300, 500, 1000, 2000, 5000];

    useEffect(() => {
        fetchUserData();
        // In a real app, we might also fetch withdraw settings here (min/max/status)
    }, []);

    const fetchUserData = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                router.push("/?action=login");
                return;
            }

            const res = await axios.get(`${API_URL}/wallet/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setUser(res.data.user);
            }
        } catch (error) {
            console.error("Fetch user error:", error);
            // Optional: Redirect to login if 401
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                router.push("/?action=login");
            }
        }
    };

    const handleWithdraw = async () => {
        if (!amount || Number(amount) < minWithdraw) {
            alert(`กรุณาระบุจำนวนเงินขั้นต่ำ ${minWithdraw} บาท`);
            return;
        }

        if (user && Number(amount) > Number(user.balance)) {
            alert("ยอดเงินในกระเป๋าไม่เพียงพอ");
            return;
        }

        if (confirm(`ยืนยันการถอนเงินจำนวน ${Number(amount).toLocaleString()} บาท?`)) {
            setIsLoading(true);
            try {
                const token = localStorage.getItem("token");
                const res = await axios.post(`${API_URL}/wallet/withdraw`,
                    { amount: Number(amount) },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                if (res.data.success) {
                    alert("✅ แจ้งถอนเงินสำเร็จ! กรุณารอเจ้าหน้าที่ตรวจสอบสักครู่");
                    setAmount("");
                    fetchUserData(); // Refresh balance
                }
            } catch (error: any) {
                console.error("Withdraw error:", error);
                alert(error.response?.data?.message || "ทำรายการไม่สำเร็จ กรุณาลองใหม่");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const setMaxAmount = () => {
        if (user) {
            setAmount(Math.floor(Number(user.balance)).toString());
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0a15] via-[#0f0f1a] to-[#0a0a15]">
            <Header />

            <main className="pt-16 pb-24 px-4 max-w-lg mx-auto space-y-5">
                {/* Title */}
                <div className="pt-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/30">
                            <ArrowDownToLine size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">ถอนเงิน</h1>
                            <p className="text-slate-400 text-sm">ถอนเข้าบัญชีธนาคารของคุณ</p>
                        </div>
                    </div>
                </div>

                {/* Balance Card */}
                <div className="bg-gradient-to-br from-[#1a1a2e] to-[#252542] rounded-2xl p-6 text-center border border-white/5 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50"></div>
                    <p className="text-sm text-slate-400 mb-2">ยอดเงินคงเหลือ (ถอนได้)</p>
                    <p className="text-4xl font-black bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
                        ฿{user ? Number(user.balance).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : "---"}
                    </p>
                </div>

                {!user ? (
                    <div className="text-center py-8 text-slate-500">
                        กำลังโหลดข้อมูลสมาชิก...
                    </div>
                ) : (
                    <>
                        {/* Bank Info (Receive Account) */}
                        <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                            <div className="flex justify-between items-center mb-3">
                                <p className="text-xs text-slate-400 font-medium">บัญชีรับเงิน (ของคุณ)</p>
                                <span className="text-[10px] text-green-400 border border-green-500/30 px-2 py-0.5 rounded">Verified</span>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-lg overflow-hidden relative">
                                    <BankLogo bankCode={user.bankName} width={48} height={48} />
                                </div>
                                <div>
                                    <p className="font-bold text-white text-lg tracking-wide">{user.bankAccount}</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm text-slate-300">{user.fullName}</p>
                                        <span className="text-slate-600">|</span>
                                        <p className="text-sm text-slate-400">{user.bankName}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Withdraw Form */}
                        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#252542] rounded-2xl p-6 space-y-5 border border-white/5">
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <label className="text-sm text-slate-400 block font-medium">จำนวนเงินที่ต้องการถอน</label>
                                    <button
                                        onClick={setMaxAmount}
                                        className="text-xs text-yellow-500 hover:text-yellow-400 underline cursor-pointer"
                                    >
                                        ถอนทั้งหมด
                                    </button>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl font-bold">฿</span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder={`ขั้นต่ำ ${minWithdraw}`}
                                        className="w-full bg-black/30 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-2xl font-bold text-white placeholder-slate-600 focus:outline-none focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Quick Amount Buttons */}
                            <div className="grid grid-cols-3 gap-2">
                                {quickAmounts.map((amt) => (
                                    <button
                                        key={amt}
                                        onClick={() => setAmount(amt.toString())}
                                        className={`py-3 rounded-xl text-sm font-bold transition-all ${amount === amt.toString()
                                            ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-lg shadow-yellow-500/30"
                                            : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5"
                                            }`}
                                    >
                                        {amt}
                                    </button>
                                ))}
                            </div>

                            {/* Info */}
                            <div className="flex items-start gap-3 text-sm text-slate-400 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                                <AlertCircle size={18} className="shrink-0 mt-0.5 text-blue-400" />
                                <div className="space-y-1">
                                    <p>ถอนขั้นต่ำ <span className="text-white font-bold">{minWithdraw}</span> บาท</p>
                                    <p>ถอนได้สูงสุดต่อวัน <span className="text-white font-bold">ไม่จำกัด</span></p>
                                    <p className="text-xs text-slate-500 mt-1">*กรุณาตรวจสอบเลขบัญชีให้ถูกต้องก่อนกดยืนยัน</p>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                onClick={handleWithdraw}
                                disabled={!amount || Number(amount) < minWithdraw || isLoading || Number(amount) > Number(user.balance)}
                                className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 text-black py-4 rounded-xl text-lg font-black shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                                        กำลังดำเนินการ...
                                    </span>
                                ) : (
                                    "ยืนยันแจ้งถอนเงิน"
                                )}
                            </button>
                        </div>
                    </>
                )}
            </main>

            <BottomNav />
        </div>
    );
}

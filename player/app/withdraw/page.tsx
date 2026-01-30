"use client";

import { useState } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { ArrowDownToLine, AlertCircle, CheckCircle2 } from "lucide-react";
import BankLogo from "@/components/BankLogo";

export default function WithdrawPage() {
    const [amount, setAmount] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const balance = 1250.00;
    const minWithdraw = 100;

    const quickAmounts = [100, 300, 500, 1000];

    const handleWithdraw = async () => {
        if (!amount || Number(amount) < minWithdraw) return;
        if (Number(amount) > balance) {
            alert("ยอดเงินไม่เพียงพอ");
            return;
        }
        setIsLoading(true);
        setTimeout(() => {
            alert("ส่งคำขอถอนเงินสำเร็จ!");
            setAmount("");
            setIsLoading(false);
        }, 1500);
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
                            <p className="text-slate-400 text-sm">ถอนเข้าบัญชีธนาคาร</p>
                        </div>
                    </div>
                </div>

                {/* Balance Card */}
                <div className="bg-gradient-to-br from-[#1a1a2e] to-[#252542] rounded-2xl p-6 text-center border border-white/5 shadow-xl">
                    <p className="text-sm text-slate-400 mb-2">ยอดเงินคงเหลือ</p>
                    <p className="text-4xl font-black bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
                        ฿{balance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </p>
                </div>

                {/* Withdraw Form */}
                <div className="bg-gradient-to-br from-[#1a1a2e] to-[#252542] rounded-2xl p-6 space-y-5 border border-white/5">
                    <div>
                        <label className="text-sm text-slate-400 mb-2 block font-medium">จำนวนเงินที่ต้องการถอน</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl font-bold">฿</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-black/30 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-2xl font-bold text-white placeholder-slate-600 focus:outline-none focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20 transition-all"
                            />
                        </div>
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="grid grid-cols-4 gap-2">
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

                    {/* Bank Info */}
                    <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                        <p className="text-xs text-slate-400 mb-3 font-medium">บัญชีรับเงิน</p>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-lg overflow-hidden">
                                <BankLogo bankCode="KBANK" width={48} height={48} />
                            </div>
                            <div>
                                <p className="font-bold text-white text-lg">123-4-56789-0</p>
                                <p className="text-sm text-slate-400">นายทดสอบ ระบบ</p>
                            </div>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex items-start gap-3 text-sm text-slate-400 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                        <AlertCircle size={18} className="shrink-0 mt-0.5 text-blue-400" />
                        <p>ถอนขั้นต่ำ <span className="text-white font-bold">฿{minWithdraw}</span> • ถอนได้ไม่จำกัดครั้ง • ใช้เวลา <span className="text-white font-bold">1-5 นาที</span></p>
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleWithdraw}
                        disabled={!amount || Number(amount) < minWithdraw || isLoading}
                        className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 text-black py-4 rounded-xl text-lg font-black shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                                กำลังดำเนินการ...
                            </span>
                        ) : (
                            "ยืนยันถอนเงิน"
                        )}
                    </button>
                </div>
            </main>

            <BottomNav />
        </div>
    );
}

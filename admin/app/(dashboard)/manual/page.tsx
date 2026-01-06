"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Search, Plus, Minus, ArrowRight } from "lucide-react";
import { formatBaht } from "@/lib/utils";

const depositReasons = [
    { value: "credit_manual", label: "ระบบออโต้ไม่ทำงาน" },
    { value: "credit_adjust", label: "ปรับยอด" },
    { value: "bonus_credit", label: "โบนัส" },
    { value: "bonus_event", label: "กิจกรรม" },
];

const deductReasons = [
    { value: "credit_cancel", label: "ยกเลิกเครดิต" },
    { value: "bonus_cancel", label: "ยกเลิกโบนัส" },
    { value: "withdraw", label: "ถอนเงิน" },
];

export default function ManualPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"deposit" | "deduct">("deposit");
    const [userSearch, setUserSearch] = useState("");
    const [foundUser, setFoundUser] = useState<any>(null);
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);

    const searchUser = async () => {
        if (!userSearch) return;
        setLoading(true);
        try {
            const res = await api.get(`/admin/users?search=${userSearch}&limit=1`);
            if (res.data.success && res.data.data.users.length > 0) {
                setFoundUser(res.data.data.users[0]);
            } else {
                alert("ไม่พบผู้ใช้งาน");
                setFoundUser(null);
            }
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleTransaction = async () => {
        if (!foundUser || !amount || !reason) {
            alert("กรุณากรอกข้อมูลให้ครบ");
            return;
        }

        // If it's a withdraw, redirect to pending withdrawals
        if (reason === "withdraw") {
            if (!confirm(`ยืนยันสร้างรายการถอนเงิน ฿${amount}?\nรายการจะไปแสดงในหน้ารายการรอถอน`)) return;

            setLoading(true);
            try {
                const res = await api.post('/admin/manual/withdraw', {
                    userId: foundUser.id,
                    amount: Number(amount),
                    note
                });

                if (res.data.success) {
                    alert("สร้างรายการถอนสำเร็จ");
                    router.push('/manual/withdrawals');
                }
            } catch (error) {
                console.error("Withdraw error:", error);
                alert("เกิดข้อผิดพลาด");
            } finally {
                setLoading(false);
            }
            return;
        }

        const label = activeTab === 'deposit' ? 'เพิ่มเครดิต' : 'ลดเครดิต';
        const reasonLabel = (activeTab === 'deposit' ? depositReasons : deductReasons).find(r => r.value === reason)?.label;
        if (!confirm(`ยืนยันการ${label} ฿${amount}?\nสาเหตุ: ${reasonLabel}`)) return;

        setLoading(true);
        try {
            const endpoint = activeTab === 'deposit' ? '/admin/manual/deposit' : '/admin/manual/deduct';
            const res = await api.post(endpoint, {
                userId: foundUser.id,
                amount: Number(amount),
                subType: reason,
                note
            });

            if (res.data.success) {
                alert("ทำรายการสำเร็จ");
                setAmount("");
                setReason("");
                setNote("");
                searchUser();
            }
        } catch (error) {
            console.error("Transaction error:", error);
            alert("เกิดข้อผิดพลาด");
        } finally {
            setLoading(false);
        }
    };

    // Reset reason when switching tabs
    const handleTabChange = (tab: "deposit" | "deduct") => {
        setActiveTab(tab);
        setReason("");
    };

    const currentReasons = activeTab === "deposit" ? depositReasons : deductReasons;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">จัดการ Manual</h2>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => handleTabChange("deposit")}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === "deposit"
                        ? "border-emerald-500 text-emerald-600 bg-emerald-50"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                >
                    <Plus size={18} />
                    เพิ่มเครดิต
                </button>
                <button
                    onClick={() => handleTabChange("deduct")}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === "deduct"
                        ? "border-red-500 text-red-600 bg-red-50"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                >
                    <Minus size={18} />
                    ลดเครดิต
                </button>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Search Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-fit">
                    <h3 className="font-bold text-lg mb-4 text-slate-800">ค้นหาสมาชิก</h3>
                    <div className="flex gap-2 mb-6">
                        <input
                            type="text"
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            placeholder="ระบุเบอร์โทร หรือ Username"
                            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            onKeyDown={(e) => e.key === 'Enter' && searchUser()}
                        />
                        <button
                            onClick={searchUser}
                            disabled={loading}
                            className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                        >
                            <Search size={20} />
                        </button>
                    </div>

                    {foundUser && (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="font-bold text-lg text-slate-800">{foundUser.username}</p>
                                    <p className="text-slate-500">{foundUser.fullName}</p>
                                    <p className="text-sm text-slate-400">{foundUser.phone}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-slate-500">เครดิตคงเหลือ</p>
                                    <p className="font-bold text-xl text-emerald-600">{formatBaht(foundUser.balance)}</p>
                                </div>
                            </div>
                            <div className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-200">
                                ธนาคาร: {foundUser.bankName} - {foundUser.bankAccount}
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-fit">
                    <h3 className="font-bold text-lg mb-4 text-slate-800">
                        {activeTab === "deposit" ? "เพิ่มเครดิต" : "ลดเครดิต"}
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">สาเหตุ *</label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className={`w-full px-4 py-2 border border-slate-200 rounded-lg ${!reason ? 'text-slate-400' : ''}`}
                            >
                                <option value="">-- เลือกสาเหตุ --</option>
                                {currentReasons.map(r => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนเงิน *</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ (ถ้ามี)</label>
                            <input
                                type="text"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="รายละเอียดเพิ่มเติม..."
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                            />
                        </div>

                        {/* Info box for withdraw */}
                        {reason === "withdraw" && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                                <p className="flex items-center gap-2">
                                    <ArrowRight size={16} />
                                    รายการถอนจะไปแสดงในหน้า "รายการรอถอน" เพื่อรอการอนุมัติ
                                </p>
                            </div>
                        )}

                        <div className="pt-4">
                            <button
                                onClick={handleTransaction}
                                disabled={!foundUser || !amount || !reason || loading}
                                className={`w-full py-3 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 ${reason === "withdraw"
                                        ? "bg-amber-500 hover:bg-amber-600"
                                        : activeTab === "deposit"
                                            ? "bg-emerald-500 hover:bg-emerald-600"
                                            : "bg-red-500 hover:bg-red-600"
                                    }`}
                            >
                                {reason === "withdraw" ? (
                                    <>สร้างรายการถอน <ArrowRight size={20} /></>
                                ) : activeTab === "deposit" ? (
                                    <><Plus size={20} /> เพิ่มเครดิต</>
                                ) : (
                                    <><Minus size={20} /> ลดเครดิต</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

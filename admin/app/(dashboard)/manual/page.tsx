"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Search, Plus, Minus, ArrowRight } from "lucide-react";
import { formatBaht } from "@/lib/utils";
import toast from "react-hot-toast";

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
    const [turnoverAmount, setTurnoverAmount] = useState("");
    const [reason, setReason] = useState("");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);

    const [adminPermissions, setAdminPermissions] = useState<any>(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    const hasPerm = (action: string) => {
        if (isSuperAdmin) return true;
        const p = adminPermissions?.['manual']?.[action];
        if (!p) return false;
        if (typeof p === 'boolean') return p;
        return !!p.manage;
    };

    // Modal State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<() => Promise<void>>();
    const [confirmTitle, setConfirmTitle] = useState("");
    const [confirmMessage, setConfirmMessage] = useState<React.ReactNode>("");
    const requiresTurnoverInput =
        activeTab === "deposit" && (reason === "bonus_credit" || reason === "bonus_event");

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const res = await api.get('/admin/me');
                if (res.data.success && res.data.data) {
                    setAdminPermissions(res.data.data.permissions || {});
                    setIsSuperAdmin(res.data.data.isSuperAdmin === true || res.data.data.role?.name === 'SUPER_ADMIN');
                }
            } catch (error) { console.error(error); }
        };
        fetchAdminData();
    }, []);

    const searchUser = async () => {
        if (!userSearch) return;
        setLoading(true);
        try {
            const res = await api.get(`/admin/users?search=${userSearch}&limit=1`);
            if (res.data.success && res.data.data.users.length > 0) {
                setFoundUser(res.data.data.users[0]);
            } else {
                toast.error("ไม่พบผู้ใช้งาน");
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
            toast.error("กรุณากรอกข้อมูลให้ครบ");
            return;
        }

        // If it's a withdraw, redirect to pending withdrawals
        if (reason === "withdraw") {
            setConfirmTitle("ยืนยันสร้างรายการถอนเงิน");
            setConfirmMessage(
                <div className="space-y-2">
                    <p>สร้างรายการถอน: <span className="font-bold text-amber-600 text-lg">฿{formatBaht(Number(amount))}</span></p>
                    <p className="text-sm text-slate-500">รายการจะไปแสดงในหน้ารายการรอถอน</p>
                </div>
            );
            setConfirmAction(() => async () => {
                setLoading(true);
                try {
                    const res = await api.post('/admin/manual/withdraw', {
                        userId: foundUser.id,
                        amount: Number(amount),
                        note
                    });

                    if (res.data.success) {
                        toast.success("สร้างรายการถอนสำเร็จ");
                        router.push('/manual/withdrawals');
                    }
                } catch (error) {
                    console.error("Withdraw error:", error);
                    toast.error("เกิดข้อผิดพลาด");
                } finally {
                    setLoading(false);
                    setIsConfirmOpen(false);
                }
            });
            setIsConfirmOpen(true);
            return;
        }

        const label = activeTab === 'deposit' ? 'เพิ่มเครดิต' : 'ลดเครดิต';
        const reasonLabel = (activeTab === 'deposit' ? depositReasons : deductReasons).find(r => r.value === reason)?.label;

        setConfirmTitle(`ยืนยันการ${label}`);
        setConfirmMessage(
            <div className="space-y-2">
                <p>จำนวนเงิน: <span className={`font-bold text-lg ${activeTab === 'deposit' ? 'text-emerald-600' : 'text-red-600'}`}>฿{formatBaht(Number(amount))}</span></p>
                <p>สาเหตุ: <span className="font-medium text-slate-700">{reasonLabel}</span></p>
                {requiresTurnoverInput && Number(turnoverAmount) > 0 ? (
                    <p>เทิร์น: <span className="font-medium text-slate-700">{formatBaht(Number(turnoverAmount))}</span></p>
                ) : null}
            </div>
        );

        setConfirmAction(() => async () => {
            setLoading(true);
            try {
                const endpoint = activeTab === 'deposit' ? '/admin/manual/deposit' : '/admin/manual/deduct';
                const res = await api.post(endpoint, {
                    userId: foundUser.id,
                    amount: Number(amount),
                    subType: reason,
                    note,
                    turnoverAmount: requiresTurnoverInput ? Number(turnoverAmount || 0) : 0
                });

                if (res.data.success) {
                    toast.success("ทำรายการสำเร็จ");
                    setAmount("");
                    setTurnoverAmount("");
                    setReason("");
                    setNote("");
                    searchUser();
                }
            } catch (error) {
                console.error("Transaction error:", error);
                toast.error("เกิดข้อผิดพลาด");
            } finally {
                setLoading(false);
                setIsConfirmOpen(false);
            }
        });
        setIsConfirmOpen(true);
    };

    // Reset reason when switching tabs
    const handleTabChange = (tab: "deposit" | "deduct") => {
        setActiveTab(tab);
        setReason("");
        setTurnoverAmount("");
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
                            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-slate-900"
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
                                disabled={activeTab === 'deposit' ? !hasPerm('deposit') : !hasPerm('withdraw')}
                                className={`w-full px-4 py-2 border border-slate-200 rounded-lg disabled:bg-slate-50 disabled:text-slate-500 ${!reason ? 'text-slate-400' : 'text-slate-900'}`}
                            >
                                <option value="">-- เลือกสาเหตุ --</option>
                                {currentReasons.map(r => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </div>
                        {requiresTurnoverInput && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">เทิร์นที่ต้องทำ</label>
                                <input
                                    type="number"
                                    value={turnoverAmount}
                                    onChange={(e) => setTurnoverAmount(e.target.value)}
                                    disabled={!hasPerm('deposit')}
                                    placeholder="0.00"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 disabled:bg-slate-50"
                                />
                                <p className="mt-1 text-xs text-slate-400">ไม่กรอกหรือกรอก 0 = โบนัสนี้ไม่มีเทิร์น</p>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนเงิน *</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                disabled={activeTab === 'deposit' ? !hasPerm('deposit') : !hasPerm('withdraw')}
                                placeholder="0.00"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-lg text-slate-900 disabled:bg-slate-50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ (ถ้ามี)</label>
                            <input
                                type="text"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                disabled={activeTab === 'deposit' ? !hasPerm('deposit') : !hasPerm('withdraw')}
                                placeholder="รายละเอียดเพิ่มเติม..."
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 disabled:bg-slate-50"
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
                                disabled={!foundUser || !amount || !reason || loading || (activeTab === 'deposit' ? !hasPerm('deposit') : !hasPerm('withdraw'))}
                                className={`w-full py-3 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 ${reason === "withdraw"
                                    ? "bg-amber-500 hover:bg-amber-600 cursor-pointer disabled:cursor-not-allowed"
                                    : activeTab === "deposit"
                                        ? "bg-emerald-500 hover:bg-emerald-600 cursor-pointer disabled:cursor-not-allowed"
                                        : "bg-red-500 hover:bg-red-600 cursor-pointer disabled:cursor-not-allowed"
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
            {/* Confirmation Modal */}
            {isConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800">{confirmTitle}</h3>
                        </div>

                        {/* Body */}
                        <div className="p-6 text-slate-600">
                            {confirmMessage}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                            <button
                                onClick={() => setIsConfirmOpen(false)}
                                disabled={loading}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={() => confirmAction && confirmAction()}
                                disabled={loading}
                                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center justify-center gap-2 min-w-[100px] ${reason === "withdraw" ? "bg-amber-500 hover:bg-amber-600" :
                                    activeTab === 'deposit' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"
                                    } disabled:opacity-50`}
                            >
                                {loading ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    'ยืนยันทำรายการ'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

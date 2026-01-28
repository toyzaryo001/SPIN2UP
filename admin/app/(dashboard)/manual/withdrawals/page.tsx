"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatBaht, formatDate } from "@/lib/utils";
import { Clock, Check, X, Search, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

interface Withdrawal {
    id: number;
    userId: number;
    user: { username: string; fullName: string; bankName: string; bankAccount: string };
    amount: number;
    status: string;
    createdAt: string;
}

export default function PendingWithdrawalsPage() {
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchWithdrawals();
    }, []);

    const fetchWithdrawals = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/transactions?type=WITHDRAW&status=PENDING");
            if (res.data.success) {
                setWithdrawals(res.data.data.transactions);
            }
        } catch (error) {
            console.error("Fetch withdrawals error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: number) => {
        if (!confirm("ยืนยันอนุมัติการถอน?")) return;
        try {
            await api.patch(`/admin/transactions/${id}/approve`);
            fetchWithdrawals();
        } catch (error) {
            console.error("Approve error:", error);
            toast.error("เกิดข้อผิดพลาด");
        }
    };

    const handleReject = async (id: number) => {
        const reason = prompt("เหตุผลที่ปฏิเสธ:");
        if (!reason) return;
        try {
            await api.patch(`/admin/transactions/${id}/reject`, { reason });
            fetchWithdrawals();
        } catch (error) {
            console.error("Reject error:", error);
            toast.error("เกิดข้อผิดพลาด");
        }
    };

    const filtered = withdrawals.filter(w =>
        w.user.username.toLowerCase().includes(search.toLowerCase()) ||
        w.user.fullName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Clock size={20} className="text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">รายการรอถอน</h2>
                        <p className="text-sm text-slate-400">{withdrawals.length} รายการรอดำเนินการ</p>
                    </div>
                </div>
                <button onClick={fetchWithdrawals} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                    <RefreshCw size={20} />
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg"
                        placeholder="ค้นหา username หรือชื่อ..."
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-4 text-left">วันเวลา</th>
                            <th className="px-6 py-4 text-left">สมาชิก</th>
                            <th className="px-6 py-4 text-left">ธนาคาร</th>
                            <th className="px-6 py-4 text-right">จำนวนเงิน</th>
                            <th className="px-6 py-4 text-center">ดำเนินการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">กำลังโหลด...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">ไม่มีรายการรอถอน</td></tr>
                        ) : (
                            filtered.map(w => (
                                <tr key={w.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-500">{formatDate(w.createdAt)}</td>
                                    <td className="px-6 py-4">
                                        <p className="font-medium">{w.user.username}</p>
                                        <p className="text-xs text-slate-400">{w.user.fullName}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-medium">{w.user.bankName}</p>
                                        <p className="text-xs text-slate-400">{w.user.bankAccount}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-bold text-lg text-red-600">{formatBaht(w.amount)}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleApprove(w.id)}
                                                className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 flex items-center gap-1"
                                            >
                                                <Check size={14} /> อนุมัติ
                                            </button>
                                            <button
                                                onClick={() => handleReject(w.id)}
                                                className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 flex items-center gap-1"
                                            >
                                                <X size={14} /> ปฏิเสธ
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

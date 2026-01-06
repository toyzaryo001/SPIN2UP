"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatBaht, formatDate } from "@/lib/utils";
import { History, Search, Filter } from "lucide-react";

interface Transaction {
    id: number;
    userId: number;
    user: { username: string };
    type: string;
    subType: string | null;
    amount: number;
    status: string;
    note: string | null;
    adminId: number | null;
    createdAt: string;
}

export default function ManualHistoryPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await api.get("/admin/transactions?adminId=true&limit=100");
            if (res.data.success) {
                setTransactions(res.data.data.transactions);
            }
        } catch (error) {
            console.error("Fetch history error:", error);
        } finally {
            setLoading(false);
        }
    };

    const filtered = transactions.filter(t => {
        const matchSearch = t.user.username.toLowerCase().includes(search.toLowerCase());
        const matchType = typeFilter === "all" || t.type === typeFilter;
        return matchSearch && matchType;
    });

    const getTypeLabel = (type: string, subType: string | null) => {
        if (type === 'DEPOSIT') return subType === 'โบนัส' ? 'เติมโบนัส' : 'เติมเครดิต';
        if (type === 'WITHDRAW') return 'ถอนเงิน';
        if (type === 'MANUAL_DEDUCT') return 'หักเครดิต';
        return type;
    };

    const getTypeColor = (type: string) => {
        if (type === 'DEPOSIT') return 'bg-emerald-100 text-emerald-700';
        if (type === 'WITHDRAW') return 'bg-red-100 text-red-700';
        if (type === 'MANUAL_DEDUCT') return 'bg-orange-100 text-orange-700';
        return 'bg-slate-100 text-slate-700';
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <History size={20} className="text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">ประวัติรายการ Manual</h2>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-slate-900"
                        placeholder="ค้นหา username..."
                    />
                </div>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-900"
                >
                    <option value="all">ทุกประเภท</option>
                    <option value="DEPOSIT">เติมเครดิต</option>
                    <option value="WITHDRAW">ถอน</option>
                    <option value="MANUAL_DEDUCT">หักเครดิต</option>
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-4 text-left">วันเวลา</th>
                            <th className="px-6 py-4 text-left">Username</th>
                            <th className="px-6 py-4 text-left">ประเภท</th>
                            <th className="px-6 py-4 text-right">จำนวนเงิน</th>
                            <th className="px-6 py-4 text-left">หมายเหตุ</th>
                            <th className="px-6 py-4 text-center">สถานะ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">กำลังโหลด...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">ไม่พบข้อมูล</td></tr>
                        ) : (
                            filtered.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-500">{formatDate(t.createdAt)}</td>
                                    <td className="px-6 py-4 font-medium">{t.user.username}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(t.type)}`}>
                                            {getTypeLabel(t.type, t.subType)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold">
                                        <span className={t.type === 'DEPOSIT' ? 'text-emerald-600' : 'text-red-600'}>
                                            {t.type === 'DEPOSIT' ? '+' : '-'}{formatBaht(t.amount)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{t.note || '-'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-0.5 rounded text-xs ${t.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : t.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                            {t.status}
                                        </span>
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

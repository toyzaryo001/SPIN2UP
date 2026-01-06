"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatBaht, formatDate } from "@/lib/utils";
import { Gift, Search, User } from "lucide-react";

interface PromotionLog {
    id: number;
    userId: number;
    user: { username: string; fullName: string };
    promotionId: number;
    promotion: { name: string };
    amount: number;
    createdAt: string;
}

export default function PromotionHistoryPage() {
    const [logs, setLogs] = useState<PromotionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => { fetchLogs(); }, []);

    const fetchLogs = async () => {
        try {
            const res = await api.get("/admin/promotions/logs");
            if (res.data.success && Array.isArray(res.data.data)) {
                setLogs(res.data.data);
            }
        } catch (error) { console.error("Fetch logs error:", error); }
        finally { setLoading(false); }
    };

    const filtered = logs.filter(log =>
        log.user.username.toLowerCase().includes(search.toLowerCase()) ||
        log.promotion.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Gift size={20} className="text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">ประวัติการรับโปรโมชั่น</h2>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg" placeholder="ค้นหา..." />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-4 text-left">วันเวลา</th>
                            <th className="px-6 py-4 text-left">สมาชิก</th>
                            <th className="px-6 py-4 text-left">โปรโมชั่น</th>
                            <th className="px-6 py-4 text-right">จำนวนเงิน</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">กำลังโหลด...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">ไม่พบข้อมูล</td></tr>
                        ) : (
                            filtered.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-500">{formatDate(log.createdAt)}</td>
                                    <td className="px-6 py-4">
                                        <p className="font-medium">{log.user.username}</p>
                                        <p className="text-xs text-slate-400">{log.user.fullName}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">{log.promotion.name}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-emerald-600">+{formatBaht(log.amount)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

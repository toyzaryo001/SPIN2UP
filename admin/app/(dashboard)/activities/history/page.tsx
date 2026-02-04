"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { History, Search } from "lucide-react";
import dayjs from "dayjs";

interface RewardClaim {
    id: number;
    userId: number;
    user: {
        username: string;
        fullName: string;
    };
    type: string;
    amount: string; // Decimal
    periodStart: string;
    periodEnd: string;
    claimedAt: string;
}

export default function RewardHistoryPage() {
    const [history, setHistory] = useState<RewardClaim[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/rewards/history", {
                params: {
                    page,
                    limit: 10,
                    username: search || undefined
                }
            });
            if (res.data.success) {
                setHistory(res.data.data);
                setTotalPages(res.data.pagination.totalPages);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchHistory();
        }, 300);
        return () => clearTimeout(timer);
    }, [page, search]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <History className="text-yellow-500" />
                        ประวัติการรับรางวัล
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">ประวัติการรับยอดเสีย (Cashback) และ ค่าคอม (Commission) ของสมาชิก</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by username..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 text-slate-600 text-sm font-semibold border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-left">สมาชิก</th>
                            <th className="px-6 py-4 text-center">ประเภท</th>
                            <th className="px-6 py-4 text-right">จำนวนเงิน</th>
                            <th className="px-6 py-4 text-center">รอบประจำวันที่</th>
                            <th className="px-6 py-4 text-center">เวลากดรับ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">กำลังโหลด...</td>
                            </tr>
                        ) : history.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">ไม่พบข้อมูล</td>
                            </tr>
                        ) : (
                            history.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 text-sm">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{item.user.username}</div>
                                        <div className="text-xs text-slate-500">{item.user.fullName}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${item.type === 'CASHBACK' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                            }`}>
                                            {item.type === 'CASHBACK' ? 'คืนยอดเสีย' : 'ค่าคอมมิชชั่น'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-green-600">
                                        +{Number(item.amount).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-center text-slate-600">
                                        {dayjs(item.periodStart).format("DD/MM/YYYY")}
                                    </td>
                                    <td className="px-6 py-4 text-center text-slate-500">
                                        {dayjs(item.claimedAt).format("DD/MM/YYYY HH:mm")}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center gap-2 p-4 border-t border-slate-100">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50"
                        >
                            Prev
                        </button>
                        <span className="px-3 py-1 text-slate-600">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

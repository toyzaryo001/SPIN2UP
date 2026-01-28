"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { History, Search, User } from "lucide-react";

interface EditLog {
    id: number;
    targetType: string;
    targetId: number;
    field: string;
    oldValue: string | null;
    newValue: string | null;
    adminId: number;
    admin: { username: string };
    createdAt: string;
    targetUser?: { username: string; fullName: string };
}

export default function MemberHistoryPage() {
    const [logs, setLogs] = useState<EditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const res = await api.get("/admin/users/edit-logs");
            if (res.data.success) {
                setLogs(res.data.data);
            }
        } catch (error) {
            console.error("Fetch logs error:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log =>
        log.admin.username.toLowerCase().includes(search.toLowerCase()) ||
        log.field.toLowerCase().includes(search.toLowerCase()) ||
        log.targetUser?.username?.toLowerCase().includes(search.toLowerCase()) || false
    );

    const getFieldLabel = (field: string) => {
        const labels: { [key: string]: string } = {
            fullName: 'ชื่อ-นามสกุล',
            status: 'สถานะ',
            role: 'บทบาท',
            balance: 'ยอดเงิน',
            bankName: 'ธนาคาร',
            bankAccount: 'เลขบัญชี',
            CREATE: 'สร้างใหม่'
        };
        return labels[field] || field;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <History size={20} className="text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">ประวัติการแก้ไขสมาชิก</h2>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-slate-900"
                        placeholder="ค้นหา..."
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-4 text-left">วันเวลา</th>
                            <th className="px-6 py-4 text-left">ผู้ดำเนินการ</th>
                            <th className="px-6 py-4 text-left">สมาชิก</th>
                            <th className="px-6 py-4 text-left">ฟิลด์</th>
                            <th className="px-6 py-4 text-left">ค่าเดิม</th>
                            <th className="px-6 py-4 text-left">ค่าใหม่</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">กำลังโหลด...</td></tr>
                        ) : filteredLogs.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">ไม่พบข้อมูล</td></tr>
                        ) : (
                            filteredLogs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-500">{formatDate(log.createdAt)}</td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{log.admin.username}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <User size={16} className="text-slate-400" />
                                            <span className="text-slate-900">{log.targetUser?.username || `ID: ${log.targetId}`}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-slate-100 rounded text-slate-600 text-xs">
                                            {getFieldLabel(log.field)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-red-500">{log.oldValue || '-'}</td>
                                    <td className="px-6 py-4 text-emerald-600">{log.newValue || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

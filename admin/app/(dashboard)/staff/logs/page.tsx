"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Clock, User, Search, Filter, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AdminLog {
    id: number;
    adminId: number;
    action: string;
    resource: string;
    details?: string;
    ip?: string;
    createdAt: string;
    admin?: {
        username: string;
        fullName: string;
    };
}

export default function StaffLogsPage() {
    const [logs, setLogs] = useState<AdminLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterAction, setFilterAction] = useState("");

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const res = await api.get("/staff/logs");
            if (res.data.success) {
                setLogs(res.data.data);
            }
        } catch (error) {
            console.error("Fetch logs error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'LOGIN': return 'bg-blue-100 text-blue-700';
            case 'CREATE': return 'bg-emerald-100 text-emerald-700';
            case 'UPDATE': return 'bg-amber-100 text-amber-700';
            case 'DELETE': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const uniqueActions = [...new Set(logs.map(l => l.action))];

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.admin?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.resource?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesAction = !filterAction || log.action === filterAction;
        return matchesSearch && matchesAction;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">ประวัติการใช้งานแอดมิน</h2>
                    <p className="text-slate-500 text-sm">ตรวจสอบกิจกรรมและการเปลี่ยนแปลงข้อมูลโดยแอดมิน</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-200 flex items-center gap-2"
                >
                    <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    รีเฟรช
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Filters */}
                <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="ค้นหา username, รายละเอียด..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-slate-900"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                            className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 appearance-none bg-white text-slate-900"
                        >
                            <option value="">ทุก Action</option>
                            {uniqueActions.map(action => (
                                <option key={action} value={action}>{action}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">เวลา</th>
                                <th className="px-6 py-4">แอดมิน</th>
                                <th className="px-6 py-4">Action</th>
                                <th className="px-6 py-4">Resource</th>
                                <th className="px-6 py-4">รายละเอียด</th>
                                <th className="px-6 py-4">IP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={6} className="text-center py-12 text-slate-400">
                                    <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                                    กำลังโหลด...
                                </td></tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-12 text-slate-400">ไม่พบประวัติการใช้งาน</td></tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} />
                                                {formatDate(log.createdAt)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                                                    <User size={16} className="text-slate-500" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900">{log.admin?.username || 'Unknown'}</div>
                                                    <div className="text-xs text-slate-400">{log.admin?.fullName}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-900 uppercase text-xs font-medium">{log.resource}</td>
                                        <td className="px-6 py-4 text-slate-900 max-w-xs">
                                            <span className="truncate block" title={log.details || ''}>
                                                {log.details || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 font-mono text-xs">{log.ip || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 text-sm text-slate-500">
                    แสดง {filteredLogs.length} จาก {logs.length} รายการ
                </div>
            </div>
        </div>
    );
}

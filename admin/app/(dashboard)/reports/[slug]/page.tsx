"use client";

import { formatBaht, formatDate } from "@/lib/utils";
import { Search, Download, FileText, Check, X, UserPlus, AlertCircle, Loader2 } from "lucide-react";
import { use, useState, useEffect } from "react";
import api from "@/lib/api";
import toast from 'react-hot-toast';

// Map slugs to Page Titles and columns
const reportConfig: Record<string, { title: string; columns: string[] }> = {
    "new-users": { title: "รายงานสมัครใหม่", columns: ["วันที่สมัคร", "Username", "ชื่อ-นามสกุล", "เบอร์โทร", "ธนาคาร", "ยอดเงิน"] },
    "new-users-deposit": { title: "รายงานสมัครใหม่ฝากเงิน", columns: ["วันที่", "Username", "ชื่อ-นามสกุล", "ยอดฝากแรก", "สถานะ"] },
    "deposit": { title: "รายงานฝากเงิน", columns: ["วันที่", "Username", "จำนวนเงิน", "ช่องทาง", "สถานะ", "ผู้ทำรายการ"] },
    "withdraw": { title: "รายงานถอนเงิน", columns: ["วันที่", "Username", "จำนวนเงิน", "ธนาคาร", "เลขบัญชี", "สถานะ", "ผู้ทำรายการ"] },
    "bonus": { title: "รายงานโบนัส", columns: ["วันที่", "Username", "ประเภท", "จำนวนเงิน", "สถานะ"] },
    "profit-loss": { title: "รายงานกำไรขาดทุน", columns: ["ยอดฝากรวม", "ยอดถอนรวม", "โบนัสรวม", "กำไรสุทธิ"] },
    "inactive-users": { title: "รายงานยูสไม่ออนไลน์", columns: ["Username", "ชื่อ-นามสกุล", "เข้าใช้ล่าสุด", "ยอดคงเหลือ", "สถานะ"] },
    "win-lose": { title: "รายงานแพ้-ชนะ", columns: ["Username", "ยอดเล่นรวม", "ยอดชนะ", "ยอดแพ้", "RTP เฉลี่ย"] },
};

// Calculate date range from preset
function getDateRange(preset: string, customStart: string, customEnd: string): { start: Date; end: Date } {
    let start = new Date();
    let end = new Date();
    end.setHours(23, 59, 59, 999);

    switch (preset) {
        case 'today':
            start.setHours(0, 0, 0, 0);
            break;
        case 'yesterday':
            start.setDate(start.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            end = new Date();
            end.setDate(end.getDate() - 1);
            end.setHours(23, 59, 59, 999);
            break;
        case 'week':
            start.setDate(start.getDate() - start.getDay());
            start.setHours(0, 0, 0, 0);
            break;
        case 'month':
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            break;
        case 'custom':
            if (customStart && customEnd) {
                start = new Date(customStart);
                end = new Date(customEnd);
                end.setHours(23, 59, 59, 999);
            } else {
                start.setHours(0, 0, 0, 0);
            }
            break;
        default:
            start.setHours(0, 0, 0, 0);
    }
    return { start, end };
}

export default function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const config = reportConfig[slug] || { title: "รายงาน", columns: [] };
    const [dateRange, setDateRange] = useState("today");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");
    const [search, setSearch] = useState("");
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<any>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [errorMsg, setErrorMsg] = useState("");

    // Unmatched SMS State
    const [activeTab, setActiveTab] = useState<'transactions' | 'unmatched'>('transactions');
    const [unmatchedLogs, setUnmatchedLogs] = useState<any[]>([]);
    const [resolveModal, setResolveModal] = useState<{ log: any; userQuery: string; usersList: any[]; selectedUser: any | null } | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; isDestructive?: boolean } | null>(null);
    const [resolving, setResolving] = useState(false);

    // Fetch Unmatched Logs
    const fetchUnmatchedLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/transactions/unmatched-sms');
            if (res.data.success) {
                setUnmatchedLogs(res.data.data);
            }
        } catch (error) {
            console.error("Fetch unmatched error:", error);
        } finally {
            setLoading(false);
        }
    };

    // Effect: Switch Tab Logic
    useEffect(() => {
        if (slug === 'deposit' && activeTab === 'unmatched') {
            fetchUnmatchedLogs();
        }
    }, [slug, activeTab]);

    // Handle User Search for Resolve
    const handleSearchUser = async (query: string) => {
        setResolveModal(prev => prev ? { ...prev, userQuery: query } : null);
        if (query.length < 3) return;

        try {
            const res = await api.get(`/admin/users?search=${query}&limit=5`);
            if (res.data.success) {
                setResolveModal(prev => prev ? { ...prev, usersList: res.data.data.users || [] } : null);
            }
        } catch (error) {
            console.error("Search user error:", error);
        }
    };

    // Handle Resolve Action
    // Handle Resolve Action
    const handleResolve = async (action: 'APPROVE' | 'REJECT') => {
        if (!resolveModal) return;

        if (action === 'APPROVE' && !resolveModal.selectedUser) {
            toast.error("กรุณาเลือกผู้ใช้ก่อน");
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: action === 'APPROVE' ? "ยืนยันการเติมเงิน" : "ยืนยันการปฏิเสธ",
            message: action === 'APPROVE'
                ? `คุณต้องการเติมเงินให้ ${resolveModal.selectedUser.username} ใช่หรือไม่?`
                : "คุณต้องการปฏิเสธรายการนี้ใช่หรือไม่?",
            isDestructive: action === 'REJECT',
            onConfirm: async () => {
                setResolving(true);
                try {
                    const res = await api.post('/admin/transactions/resolve-sms', {
                        logId: resolveModal.log.id,
                        action,
                        userId: resolveModal.selectedUser?.id
                    });

                    if (res.data.success) {
                        setResolveModal(null);
                        setConfirmModal(null);
                        fetchUnmatchedLogs(); // Refresh list
                        toast.success("ดำเนินการสำเร็จ");
                    }
                } catch (error: any) {
                    toast.error(error.response?.data?.message || "เกิดข้อผิดพลาด");
                } finally {
                    setResolving(false);
                }
            }
        });
    };

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setErrorMsg("");
            try {
                const { start, end } = getDateRange(dateRange, customStart, customEnd);
                const startISO = start.toISOString();
                const endISO = end.toISOString();
                let query = `?page=${page}&limit=20`;
                if (search) query += `&search=${search}`;

                // ======================================================
                // IMPORTANT: api.get() baseURL already has /api
                // So URLs here should NOT start with /api
                // e.g. use "/admin/transactions" NOT "/api/admin/transactions"
                // ======================================================

                if (['deposit', 'withdraw', 'bonus', 'new-users-deposit'].includes(slug)) {
                    // Transaction-based reports → /admin/transactions
                    const typeMap: Record<string, string> = {
                        "deposit": "DEPOSIT",
                        "withdraw": "WITHDRAW",
                        "bonus": "BONUS",
                        "new-users-deposit": "DEPOSIT",
                    };
                    const url = `/admin/transactions${query}&type=${typeMap[slug]}&startDate=${startISO}&endDate=${endISO}`;
                    const res = await api.get(url);
                    const result = res.data;
                    if (result.success) {
                        setData(result.data.transactions || []);
                        setSummary(result.data.summary || null);
                        setTotalPages(result.data.pagination?.totalPages || 1);
                    }

                } else if (['new-users', 'inactive-users'].includes(slug)) {
                    // User-based reports → /admin/users
                    let url = `/admin/users${query}`;
                    if (slug === 'new-users') {
                        url += `&startDate=${startISO}&endDate=${endISO}&sort=createdAt&order=desc`;
                    } else {
                        url += `&sort=lastLoginAt&order=asc`;
                    }
                    const res = await api.get(url);
                    const result = res.data;
                    if (result.success) {
                        const users = result.data?.users || result.data || [];
                        setData(Array.isArray(users) ? users : []);
                        setTotalPages(result.data?.pagination?.totalPages || 1);
                        setSummary(null);
                    }

                } else if (slug === 'profit-loss') {
                    // Aggregate deposit/withdraw/bonus totals
                    const [depRes, wdRes, bonRes] = await Promise.all([
                        api.get(`/admin/transactions?type=DEPOSIT&startDate=${startISO}&endDate=${endISO}&limit=1`),
                        api.get(`/admin/transactions?type=WITHDRAW&startDate=${startISO}&endDate=${endISO}&limit=1`),
                        api.get(`/admin/transactions?type=BONUS&startDate=${startISO}&endDate=${endISO}&limit=1`),
                    ]);

                    const depTotal = depRes.data?.data?.summary?.totalAmount || 0;
                    const wdTotal = wdRes.data?.data?.summary?.totalAmount || 0;
                    const bonTotal = bonRes.data?.data?.summary?.totalAmount || 0;
                    const profit = depTotal - wdTotal - bonTotal;

                    setSummary({ deposit: depTotal, withdraw: wdTotal, bonus: bonTotal, profit });
                    setData([{
                        id: 'summary',
                        deposit: depTotal,
                        withdraw: wdTotal,
                        bonus: bonTotal,
                        profit: profit,
                    }]);
                    setTotalPages(1);

                } else {
                    // Fallback: try report endpoints
                    const url = `/admin/reports/${slug}${query}&preset=${dateRange}`;
                    try {
                        const res = await api.get(url);
                        if (res.data.success) {
                            const d = res.data.data;
                            setData(d.transactions || d.users || (Array.isArray(d) ? d : []));
                            setSummary(d.summary || null);
                            setTotalPages(d.pagination?.totalPages || 1);
                        }
                    } catch {
                        setData([]);
                        setErrorMsg("ไม่สามารถโหลดข้อมูลรายงานนี้ได้");
                    }
                }
            } catch (error) {
                console.error("Fetch report error:", error);
                setErrorMsg("เกิดข้อผิดพลาดในการโหลดข้อมูล");
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchData, 300);
        return () => clearTimeout(timer);
    }, [slug, dateRange, customStart, customEnd, page, search]);

    // Render table row based on slug
    const renderRow = (item: any, index: number) => {
        const rowNum = index + 1 + (page - 1) * 20;

        if (slug === 'deposit' || slug === 'new-users-deposit') {
            return (
                <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-center text-slate-500">{rowNum}</td>
                    <td className="px-6 py-4">{formatDate(item.createdAt)}</td>
                    <td className="px-6 py-4">
                        <div>
                            <p className="font-bold text-slate-700">{item.user?.username || '-'}</p>
                            {item.user?.fullName && <p className="text-xs text-slate-400">{item.user.fullName}</p>}
                        </div>
                    </td>
                    {slug === 'new-users-deposit' ? (
                        <>
                            <td className="px-6 py-4 text-slate-600">{item.user?.fullName || '-'}</td>
                            <td className="px-6 py-4 font-bold text-emerald-600">{formatBaht(item.amount)}</td>
                        </>
                    ) : (
                        <td className="px-6 py-4 font-bold text-emerald-600">{formatBaht(item.amount)}</td>
                    )}
                    {slug === 'deposit' && (
                        <td className="px-6 py-4">
                            <span className={`text-xs px-2 py-1 rounded ${item.subType?.includes('Auto') ? 'bg-purple-100 text-purple-700' :
                                item.type === 'MANUAL_ADD' ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-600'}`}>
                                {item.subType || item.type}
                            </span>
                        </td>
                    )}
                    <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${item.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                            item.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                                'bg-amber-100 text-amber-700'}`}>
                            {item.status}
                        </span>
                    </td>
                    {slug === 'deposit' && (
                        <td className="px-6 py-4 text-slate-400 text-xs">{item.adminId ? `Admin #${item.adminId}` : 'System'}</td>
                    )}
                </tr>
            );
        }

        if (slug === 'withdraw') {
            return (
                <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-center text-slate-500">{rowNum}</td>
                    <td className="px-6 py-4">{formatDate(item.createdAt)}</td>
                    <td className="px-6 py-4">
                        <div>
                            <p className="font-bold text-slate-700">{item.user?.username || '-'}</p>
                            <p className="text-xs text-slate-400">{item.user?.fullName}</p>
                        </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-red-600">{formatBaht(item.amount)}</td>
                    <td className="px-6 py-4 text-slate-500">{item.user?.bankName || '-'}</td>
                    <td className="px-6 py-4 text-slate-500">{item.user?.bankAccount || '-'}</td>
                    <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${item.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                            item.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {item.status}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{item.adminId ? `Admin #${item.adminId}` : 'Auto'}</td>
                </tr>
            );
        }

        if (slug === 'bonus') {
            return (
                <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-center text-slate-500">{rowNum}</td>
                    <td className="px-6 py-4">{formatDate(item.createdAt)}</td>
                    <td className="px-6 py-4">
                        <div>
                            <p className="font-bold text-slate-700">{item.user?.username || '-'}</p>
                            <p className="text-xs text-slate-400">{item.user?.fullName}</p>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className="text-xs px-2 py-1 rounded bg-pink-100 text-pink-700">
                            {item.subType || item.type}
                        </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-purple-600">{formatBaht(item.amount)}</td>
                    <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${item.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                            item.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {item.status}
                        </span>
                    </td>
                </tr>
            );
        }

        if (slug === 'new-users') {
            return (
                <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-center text-slate-500">{rowNum}</td>
                    <td className="px-6 py-4">{formatDate(item.createdAt)}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{item.username || item.phone || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{item.fullName || '-'}</td>
                    <td className="px-6 py-4 text-slate-500">{item.phone || '-'}</td>
                    <td className="px-6 py-4 text-slate-500">{item.bankName || '-'}</td>
                    <td className="px-6 py-4 text-slate-500">{formatBaht(item.balance || 0)}</td>
                </tr>
            );
        }

        if (slug === 'inactive-users') {
            return (
                <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-center text-slate-500">{rowNum}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{item.username || item.phone || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{item.fullName || '-'}</td>
                    <td className="px-6 py-4 text-slate-500">{item.lastLoginAt ? formatDate(item.lastLoginAt) : 'ไม่เคยเข้าใช้'}</td>
                    <td className="px-6 py-4 text-slate-500">{formatBaht(item.balance || 0)}</td>
                    <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${item.isActive !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {item.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                </tr>
            );
        }

        if (slug === 'profit-loss') {
            return (
                <tr key={item.id || 'summary'} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-center text-slate-500">{rowNum}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{formatBaht(item.deposit)}</td>
                    <td className="px-6 py-4 font-bold text-red-600">{formatBaht(item.withdraw)}</td>
                    <td className="px-6 py-4 font-bold text-purple-600">{formatBaht(item.bonus)}</td>
                    <td className={`px-6 py-4 font-bold text-lg ${item.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatBaht(item.profit)}
                    </td>
                </tr>
            );
        }

        if (slug === 'win-lose') {
            const winloss = Number(item.winloss || 0);
            return (
                <tr key={item.id || index} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-center text-slate-500">{rowNum}</td>
                    <td className="px-6 py-4">
                        <div>
                            <p className="font-bold text-slate-700">{item.username || '-'}</p>
                            {item.fullName && <p className="text-xs text-slate-400">{item.fullName}</p>}
                        </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{formatBaht(item.turnover)}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{formatBaht(winloss > 0 ? 0 : Math.abs(winloss))}</td>
                    <td className={`px-6 py-4 font-bold ${winloss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatBaht(winloss)}
                    </td>
                    <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded ${Number(item.rtp) > 100 ? 'bg-red-100 text-red-700' : Number(item.rtp) > 90 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {item.rtp}%
                        </span>
                    </td>
                </tr>
            );
        }

        // Fallback: show raw JSON
        return (
            <tr key={item.id || index} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-center text-slate-500">{rowNum}</td>
                <td colSpan={config.columns.length} className="px-6 py-4 text-slate-500 text-xs">
                    {JSON.stringify(item).slice(0, 200)}...
                </td>
            </tr>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">{config.title}</h2>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                        <Download size={18} />
                        Export Excel
                    </button>
                </div>
            </div>


            {/* Tabs for Deposit Report */}
            {slug === 'deposit' && (
                <div className="flex gap-2 bg-slate-100 p-1 rounded-lg w-fit mb-4">
                    <button
                        onClick={() => setActiveTab('transactions')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'transactions' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        รายการฝากเงิน
                    </button>
                    <button
                        onClick={() => setActiveTab('unmatched')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'unmatched' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        รายการรอตรวจสอบ
                        {unmatchedLogs.length > 0 && <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{unmatchedLogs.length}</span>}
                    </button>
                </div>
            )}

            {/* Filter Section (Hidden in unmatched tab to verify confusion? No, filters might be useful but sticking to simple view first) */}
            {activeTab === 'transactions' && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
                    <div className="flex bg-slate-100 p-1 rounded-lg flex-wrap">
                        {['today', 'yesterday', 'week', 'month', 'custom'].map((range) => (
                            <button
                                key={range}
                                onClick={() => { setDateRange(range); setPage(1); }}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${dateRange === range
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {range === 'today' && 'วันนี้'}
                                {range === 'yesterday' && 'เมื่อวาน'}
                                {range === 'week' && 'สัปดาห์นี้'}
                                {range === 'month' && 'เดือนนี้'}
                                {range === 'custom' && 'กำหนดเอง'}
                            </button>
                        ))}
                    </div>

                    {/* Custom Date Range Picker */}
                    {dateRange === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={customStart}
                                onChange={(e) => { setCustomStart(e.target.value); setPage(1); }}
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            />
                            <span className="text-slate-400">ถึง</span>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={(e) => { setCustomEnd(e.target.value); setPage(1); }}
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            />
                        </div>
                    )}

                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="ค้นหา..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-slate-900"
                        />
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            {summary && ['deposit', 'withdraw', 'bonus', 'new-users-deposit'].includes(slug) && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <p className="text-slate-500 text-sm">จำนวนรายการ</p>
                        <p className="text-2xl font-bold text-slate-800">{summary.count}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <p className="text-slate-500 text-sm">ยอดรวม</p>
                        <p className={`text-2xl font-bold ${slug === 'withdraw' ? 'text-red-600' : slug === 'bonus' ? 'text-purple-600' : 'text-emerald-600'}`}>{formatBaht(summary.totalAmount)}</p>
                    </div>
                </div>
            )}

            {/* Profit-Loss Summary Cards */}
            {summary && slug === 'profit-loss' && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-200">
                        <p className="text-slate-500 text-sm">💰 ยอดฝากรวม</p>
                        <p className="text-2xl font-bold text-emerald-600">{formatBaht(summary.deposit)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-red-200">
                        <p className="text-slate-500 text-sm">💸 ยอดถอนรวม</p>
                        <p className="text-2xl font-bold text-red-600">{formatBaht(summary.withdraw)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-200">
                        <p className="text-slate-500 text-sm">🎁 โบนัสรวม</p>
                        <p className="text-2xl font-bold text-purple-600">{formatBaht(summary.bonus)}</p>
                    </div>
                    <div className={`bg-white p-4 rounded-xl shadow-sm border ${summary.profit >= 0 ? 'border-emerald-200' : 'border-red-200'}`}>
                        <p className="text-slate-500 text-sm">📊 กำไรสุทธิ</p>
                        <p className={`text-2xl font-bold ${summary.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatBaht(summary.profit)}</p>
                    </div>
                </div>
            )}

            {/* Win-Lose Summary Cards */}
            {summary && slug === 'win-lose' && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <p className="text-slate-500 text-sm">👤 สมาชิกที่เล่น</p>
                        <p className="text-2xl font-bold text-slate-800">{summary.totalUsers} คน</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-200">
                        <p className="text-slate-500 text-sm">🎰 ยอดเล่นรวม</p>
                        <p className="text-2xl font-bold text-blue-600">{formatBaht(summary.totalTurnover)}</p>
                    </div>
                    <div className={`bg-white p-4 rounded-xl shadow-sm border ${summary.totalWinloss >= 0 ? 'border-emerald-200' : 'border-red-200'}`}>
                        <p className="text-slate-500 text-sm">📊 แพ้-ชนะสุทธิ</p>
                        <p className={`text-2xl font-bold ${summary.totalWinloss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatBaht(summary.totalWinloss)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-200">
                        <p className="text-slate-500 text-sm">📈 RTP เฉลี่ย</p>
                        <p className="text-2xl font-bold text-amber-600">{summary.avgRtp}%</p>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center">
                    {errorMsg}
                </div>
            )}

            {/* Table Area */}
            {activeTab === 'transactions' ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 w-16 text-center">#</th>
                                    {config.columns.map((col, i) => (
                                        <th key={i} className="px-6 py-4">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={config.columns.length + 1} className="px-6 py-12 text-center text-slate-400">
                                            <div className="flex justify-center items-center gap-2"><Loader2 className="animate-spin" /> กำลังโหลดข้อมูล...</div>
                                        </td>
                                    </tr>
                                ) : data.length === 0 ? (
                                    <tr>
                                        <td colSpan={config.columns.length + 1} className="px-6 py-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <FileText className="opacity-20" size={48} />
                                                <p>ไม่พบข้อมูลในช่วงเวลานี้</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    data.map((item: any, index: number) => renderRow(item, index))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="p-4 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500">
                        <div>หน้า {page} จาก {totalPages}</div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 border border-slate-200 rounded-lg disabled:opacity-50"
                            >
                                ก่อนหน้า
                            </button>
                            <button
                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1 border border-slate-200 rounded-lg disabled:opacity-50"
                            >
                                ถัดไป
                            </button>
                        </div>
                    </div>

                </div>
            ) : (
                /* Unmatched Table */
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">วันที่</th>
                                    <th className="px-6 py-4">ข้อความ SMS</th>
                                    <th className="px-6 py-4">ธนาคาร/บัญชี</th>
                                    <th className="px-6 py-4">จำนวนเงิน</th>
                                    <th className="px-6 py-4">สถานะ</th>
                                    <th className="px-6 py-4">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {unmatchedLogs.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">ไม่พบรายการค้างตรวจสอบ</td></tr>
                                ) : (
                                    unmatchedLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 text-slate-500">{formatDate(log.createdAt)}</td>
                                            <td className="px-6 py-4 text-xs text-slate-600 max-w-md truncate" title={log.rawMessage}>{log.rawMessage}</td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-bold text-slate-700">{log.sourceBank}</p>
                                                    <p className="text-xs text-slate-400">{log.sourceAccount || log.sourceAccountLast4}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-emerald-600">{formatBaht(log.amount)}</td>
                                            <td className="px-6 py-4"><span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs">รอตรวจสอบ</span></td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button onClick={() => setResolveModal({ log, userQuery: '', usersList: [], selectedUser: null })} className="p-2 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200" title="อนุมัติ"><Check size={16} /></button>
                                                    <button onClick={() => {
                                                        setConfirmModal({
                                                            isOpen: true,
                                                            title: "ยืนยันการปฏิเสธ",
                                                            message: `คุณต้องการปฏิเสธรายการ ${formatBaht(log.amount)} จาก ${log.sourceBank} ใช่หรือไม่?`,
                                                            isDestructive: true,
                                                            onConfirm: async () => {
                                                                setResolving(true);
                                                                try {
                                                                    const res = await api.post('/admin/transactions/resolve-sms', {
                                                                        logId: log.id,
                                                                        action: 'REJECT',
                                                                    });
                                                                    if (res.data.success) {
                                                                        setConfirmModal(null);
                                                                        fetchUnmatchedLogs();
                                                                        toast.success("ปฏิเสธรายการสำเร็จ");
                                                                    }
                                                                } catch (error: any) {
                                                                    toast.error(error.response?.data?.message || "เกิดข้อผิดพลาด");
                                                                } finally {
                                                                    setResolving(false);
                                                                }
                                                            }
                                                        });
                                                    }} className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200" title="ปฏิเสธ"><X size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {/* Resolve Modal - Moved to Root Level */}
            {resolveModal && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">จัดการรายการฝากเงิน</h3>
                            <button onClick={() => setResolveModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-slate-50 p-3 rounded-lg text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">ธนาคาร/เบอร์:</span>
                                    <span className="font-semibold">{resolveModal.log.sourceBank} {resolveModal.log.sourceAccount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">ยอดเงิน:</span>
                                    <span className="font-bold text-emerald-600">{formatBaht(resolveModal.log.amount)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">ข้อความ:</span>
                                    <span className="text-xs text-slate-600">{resolveModal.log.rawMessage}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">ค้นหาผู้ใช้เพื่อเติมเงิน</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Username หรือ เบอร์โทร..."
                                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={resolveModal.userQuery}
                                        onChange={(e) => handleSearchUser(e.target.value)}
                                    />
                                </div>
                                {resolveModal.usersList.length > 0 && !resolveModal.selectedUser && (
                                    <div className="border border-slate-100 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
                                        {resolveModal.usersList.map(u => (
                                            <div
                                                key={u.id}
                                                onClick={() => setResolveModal({ ...resolveModal, selectedUser: u, usersList: [] })}
                                                className="p-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                                            >
                                                <div>
                                                    <div className="font-bold text-sm text-slate-700">{u.username}</div>
                                                    <div className="text-xs text-slate-500">{u.fullName || '-'}</div>
                                                </div>
                                                <div className="text-xs text-slate-400">{u.phone}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {resolveModal.selectedUser && (
                                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex justify-between items-center">
                                    <div>
                                        <div className="text-xs text-emerald-600 font-medium">ผู้ใช้ที่เลือก:</div>
                                        <div className="font-bold text-emerald-800">{resolveModal.selectedUser.username}</div>
                                    </div>
                                    <button onClick={() => setResolveModal({ ...resolveModal, selectedUser: null })} className="text-emerald-400 hover:text-emerald-600"><X size={16} /></button>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => handleResolve('APPROVE')}
                                    disabled={resolving}
                                    className={`flex-1 py-2 rounded-lg font-bold flex justify-center items-center gap-2 ${!resolveModal.selectedUser ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                                >
                                    {resolving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                                    ยืนยันเติมเงิน
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Confirm Modal */}
            {confirmModal && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${confirmModal.isDestructive ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                {confirmModal.isDestructive ? <AlertCircle size={24} /> : <Check size={24} />}
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">{confirmModal.title}</h3>
                            <p className="text-slate-500 mb-6">{confirmModal.message}</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmModal(null)}
                                    className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={confirmModal.onConfirm}
                                    disabled={resolving}
                                    className={`flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 font-medium flex justify-center items-center gap-2 ${confirmModal.isDestructive ? 'bg-red-600' : 'bg-emerald-600'} ${resolving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {resolving && <Loader2 className="animate-spin" size={16} />}
                                    ยืนยัน
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";

import { formatBaht, formatDate } from "@/lib/utils";
import { Search, Download, FileText } from "lucide-react";
import { use, useState, useEffect } from "react";
import api from "@/lib/api";

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

            {/* Filter Section */}
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

            {/* Error Message */}
            {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center">
                    {errorMsg}
                </div>
            )}

            {/* Table */}
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
                                        กำลังโหลดข้อมูล...
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
        </div>
    );
}

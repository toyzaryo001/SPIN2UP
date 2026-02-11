"use client";

import { usePathname } from "next/navigation";
import { formatBaht, formatDate } from "@/lib/utils";
import { Calendar, Search, Download, FileText as FileIcon } from "lucide-react";
import { use, useState, useEffect } from "react";
import api from "@/lib/api";

// Map slugs to Page Titles and specific configs
const reportConfig: Record<string, { title: string; columns: string[] }> = {
    "new-users": { title: "รายงานสมัครใหม่", columns: ["วันที่", "Username", "ชื่อ-นามสกุล", "เบอร์โทร", "ธนาคาร", "ผู้แนะนำ"] },
    "new-users-deposit": { title: "รายงานสมัครใหม่ฝากเงิน", columns: ["วันที่", "Username", "ยอดฝากแรก", "ช่องทาง", "เวลาฝาก"] },
    "deposit": { title: "รายงานฝากเงิน", columns: ["วันที่", "Username", "จำนวนเงิน", "ช่องทาง", "โปรโมชั่น", "สถานะ", "ผู้ทำรายการ"] },
    "withdraw": { title: "รายงานถอนเงิน", columns: ["วันที่", "Username", "จำนวนเงิน", "ธนาคาร", "เลขบัญชี", "สถานะ", "ผู้ทำรายการ"] },
    "bonus": { title: "รายงานโบนัส", columns: ["วันที่", "Username", "ประเภทโบนัส", "จำนวนเงิน", "เงื่อนไข (Turnover)"] },
    "profit-loss": { title: "รายงานกำไรขาดทุน", columns: ["วันที่", "ยอดฝาก", "ยอดถอน", "โบนัส", "กำไรสุทธิ"] },
    "inactive-users": { title: "รายงานยูสไม่ออนไลน์", columns: ["Username", "ออนไลน์ล่าสุด", "ยอดเงินคงเหลือ", "สถานะ"] },
    "win-lose": { title: "รายงานแพ้-ชนะ", columns: ["Username", "ยอดเล่นรวม", "ยอดชนะ", "ยอดแพ้", "RTP เฉลี่ย"] },
};

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

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Calculate Date Range on Client Side (Required for Transactions API)
                const now = new Date();
                let start = new Date();
                let end = new Date();
                end.setHours(23, 59, 59, 999);

                switch (dateRange) {
                    case 'today':
                        start = new Date();
                        start.setHours(0, 0, 0, 0);
                        break;
                    case 'yesterday':
                        start = new Date();
                        start.setDate(start.getDate() - 1);
                        start.setHours(0, 0, 0, 0);
                        end = new Date();
                        end.setDate(end.getDate() - 1);
                        end.setHours(23, 59, 59, 999);
                        break;
                    case 'week':
                        start = new Date();
                        start.setDate(start.getDate() - start.getDay());
                        start.setHours(0, 0, 0, 0);
                        break;
                    case 'month':
                        start = new Date();
                        start.setDate(1);
                        start.setHours(0, 0, 0, 0);
                        break;
                    case 'custom':
                        if (customStart && customEnd) {
                            start = new Date(customStart);
                            end = new Date(customEnd);
                            end.setHours(23, 59, 59, 999);
                        } else {
                            start = new Date();
                            start.setHours(0, 0, 0, 0);
                        }
                        break;
                    default:
                        start = new Date();
                        start.setHours(0, 0, 0, 0);
                }

                // Generic Query Params
                let query = `?page=${page}&limit=20`;
                if (search) query += `&search=${search}`;

                let url = "";

                // Decide API based on slug
                if (slug === 'deposit') {
                    // SWITCHED TO TRANSACTIONS API (Bypassing broken Report API)
                    // Requires explicit type=DEPOSIT and startDate/endDate
                    url = `/api/admin/transactions${query}&type=DEPOSIT&startDate=${start.toISOString()}&endDate=${end.toISOString()}`;

                } else if (["withdraw", "bonus"].includes(slug)) {
                    // Use Transactions API for these as well
                    const typeMap: Record<string, string> = {
                        "withdraw": "WITHDRAW",
                        "bonus": "BONUS"
                    };
                    url = `/api/admin/transactions${query}&type=${typeMap[slug]}&startDate=${start.toISOString()}&endDate=${end.toISOString()}`;

                } else {
                    // Fallback to original Report APIs for others (which might pass preset)
                    // Note: sending preset here for backward compatibility with other endpoints if they exist
                    let reportQuery = `${query}&preset=${dateRange}`;
                    if (dateRange === 'custom') {
                        reportQuery += `&startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
                    }

                    if (slug === 'new-users') url = `/api/admin/reports/new-users${reportQuery}`;
                    else if (slug === 'new-users-deposit') url = `/api/admin/reports/new-users-deposit${reportQuery}`;
                    else if (slug === 'profit-loss') url = `/api/admin/reports/profit-loss${reportQuery}`;
                    else if (slug === 'inactive-users') url = `/api/admin/reports/inactive-users${reportQuery}`;
                    else url = `/api/admin/reports/${slug}${reportQuery}`;
                }

                const res = await api.get(url);
                const data = res.data;

                if (data.success) {
                    if (data.data.transactions) {
                        setData(data.data.transactions);
                        setSummary(data.data.summary);
                        setTotalPages(data.data.pagination?.totalPages || 1);
                    } else if (data.data.dailyData) {
                        setData([]);
                    } else if (Array.isArray(data.data)) {
                        setData(data.data);
                    } else if (data.data.users) {
                        setData(data.data.users);
                    }
                }
            } catch (error) {
                console.error("Fetch report error:", error);
                // Silent fail or show toast? For now console error only as requested "don't make it difficult"
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchData, 300);
        return () => clearTimeout(timer);
    }, [slug, dateRange, customStart, customEnd, page, search]);

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
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {['today', 'yesterday', 'week', 'month'].map((range) => (
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
                        </button>
                    ))}
                </div>

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

            {/* Summary Cards for Deposit/Withdraw */}
            {summary && (slug === 'deposit' || slug === 'withdraw') && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <p className="text-slate-500 text-sm">จำนวนรายการ</p>
                        <p className="text-2xl font-bold text-slate-800">{summary.count}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <p className="text-slate-500 text-sm">ยอดรวม</p>
                        <p className={`text-2xl font-bold ${slug === 'deposit' ? 'text-emerald-600' : 'text-red-600'}`}>{formatBaht(summary.totalAmount)}</p>
                    </div>
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
                                data.map((item: any, index: number) => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-center text-slate-500">{index + 1 + (page - 1) * 20}</td>
                                        {/* Dynamic Row Rendering based on Slug */}
                                        {slug === 'deposit' && (
                                            <>
                                                <td className="px-6 py-4">{formatDate(item.createdAt || item.date)}</td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-bold text-slate-700">{item.user?.username || item.username || '-'}</p>
                                                        {(item.user?.fullName || item.fullName) && <p className="text-xs text-slate-400">{item.user?.fullName || item.fullName}</p>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-emerald-600">{formatBaht(item.amount)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-xs px-2 py-1 rounded 
                                                        ${(item.subType || item.channel || item.type)?.includes('Auto') ? 'bg-purple-100 text-purple-700' :
                                                            item.type === 'MANUAL_ADD' ? 'bg-blue-100 text-blue-700' :
                                                                item.type === 'BONUS' ? 'bg-pink-100 text-pink-700' :
                                                                    item.type === 'CASHBACK' ? 'bg-orange-100 text-orange-700' :
                                                                        'bg-slate-100 text-slate-600'}`}>
                                                        {item.subType || item.channel || item.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">{item.promotion?.name || '-'}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-xs px-2 py-1 rounded-full 
                                                        ${item.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                                            item.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                                                                item.status === 'PENDING_REVIEW' ? 'bg-orange-100 text-orange-800' :
                                                                    'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {item.status === 'PENDING_REVIEW' ? 'รอตรวจสอบ' : item.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 text-xs">{item.adminId ? `Admin #${item.adminId}` : (item.admin || 'System')}</td>
                                            </>
                                        )}
                                        {slug === 'withdraw' && (
                                            <>
                                                <td className="px-6 py-4">{formatDate(item.createdAt)}</td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-bold text-slate-700">{item.user?.username || '-'}</p>
                                                        <p className="text-xs text-slate-400">{item.user?.fullName}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-red-600">{formatBaht(item.amount)}</td>
                                                <td className="px-6 py-4 text-slate-500">{item.user?.bankName}</td>
                                                <td className="px-6 py-4 text-slate-500">{item.user?.bankAccount}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-xs px-2 py-1 rounded-full ${item.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                                        item.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 text-xs">{item.admin?.username || 'Auto'}</td>
                                            </>
                                        )}
                                        {/* Default fallback for generic list */}
                                        {!['deposit', 'withdraw'].includes(slug) && (
                                            <td colSpan={config.columns.length} className="px-6 py-4 text-slate-500">
                                                {JSON.stringify(item).slice(0, 100)}...
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500">
                    <div>หน้า {page} จาก {totalPages}</div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 border border-slate-200 rounded disabled:opacity-50 hover:bg-slate-50"
                        >
                            ก่อนหน้า
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-1 border border-slate-200 rounded disabled:opacity-50 hover:bg-slate-50"
                        >
                            ถัดไป
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FileText(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            <path d="M10 9H8" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
        </svg>
    );
}

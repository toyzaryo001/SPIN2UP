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
                let url = "";
                let query = `?preset=${dateRange}&page=${page}&limit=20`;
                if (search) query += `&search=${search}`;
                if (dateRange === 'custom' && customStart && customEnd) {
                    query += `&startDate=${customStart}&endDate=${customEnd}`;
                }

                // Decide API based on slug
                if (slug === 'deposit') {
                    url = `/api/admin/reports/all-deposits${query}`;
                } else if (["withdraw", "bonus"].includes(slug)) {
                    const typeMap: Record<string, string> = {
                        "withdraw": "WITHDRAW",
                        "bonus": "BONUS"
                    };
                    url = `/api/admin/transactions${query}&type=${typeMap[slug]}`;

                    // Specific status filter for reports (usually COMPLETED)
                    if (slug === 'withdraw') {
                        // url += `&status=COMPLETED`; // Optional: if report should show only completed
                    }
                } else {
                    // Fallback to existing logic for other reports (summary based)
                    // or maybe we don't have list APIs for them yet?
                    // For now, let's just handle deposit/withdraw list
                    if (slug === 'new-users') url = `/api/admin/reports/new-users${query}`;
                    else if (slug === 'new-users-deposit') url = `/api/admin/reports/new-users-deposit${query}`;
                    else if (slug === 'profit-loss') url = `/api/admin/reports/profit-loss${query}`;
                    else if (slug === 'inactive-users') url = `/api/admin/reports/inactive-users${query}`;
                    else url = `/api/admin/reports/${slug}${query}`; // Try generic
                }

                const res = await api.get(url);
                const data = res.data;

                if (data.success) {
                    if (data.data.transactions) {
                        setData(data.data.transactions);
                        setSummary(data.data.summary);
                        setTotalPages(data.data.pagination?.totalPages || 1);
                    } else if (data.data.dailyData) {
                        // Handle summary reports (chart data) - maybe need different UI?
                        // For now, simple table not suitable for dailyData unless flattened
                        // Just showing empty or error if type mismatch
                        setData([]);
                    } else if (Array.isArray(data.data)) {
                        setData(data.data);
                    } else if (data.data.users) {
                        setData(data.data.users);
                    }
                }
            } catch (error) {
                console.error("Fetch report error:", error);
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
                                                <td className="px-6 py-4">{formatDate(item.date || item.createdAt)}</td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-bold text-slate-700">{item.username || '-'}</p>
                                                        {item.fullName && <p className="text-xs text-slate-400">{item.fullName}</p>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-emerald-600">{formatBaht(item.amount)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-xs px-2 py-1 rounded 
                                                        ${item.channel?.includes('Auto') ? 'bg-purple-100 text-purple-700' :
                                                            item.channel === 'Manual' ? 'bg-blue-100 text-blue-700' :
                                                                item.channel === 'Bonus' ? 'bg-pink-100 text-pink-700' :
                                                                    item.channel === 'Cashback' ? 'bg-orange-100 text-orange-700' :
                                                                        'bg-slate-100 text-slate-600'}`}>
                                                        {item.channel || item.subType || item.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">{item.promotion || '-'}</td>
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
                                                <td className="px-6 py-4 text-slate-400 text-xs">{item.admin || 'System'}</td>
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

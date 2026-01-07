"use client";

import { usePathname } from "next/navigation";
import { formatBaht, formatDate } from "@/lib/utils";
import { Calendar, Search, Download } from "lucide-react";
import { use, useState } from "react";

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
                            onClick={() => setDateRange(range)}
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
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-slate-900"
                    />
                </div>

                <div className="flex items-center gap-2 text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50">
                    <Calendar size={18} />
                    <span className="text-sm">เลือกช่วงเวลาเอง</span>
                </div>
            </div>

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
                            {/* Mock Data - In real app, fetch based on slug */}
                            <tr>
                                <td colSpan={config.columns.length + 1} className="px-6 py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <FileText className="opacity-20" size={48} />
                                        <p>ไม่พบข้อมูลในช่วงเวลานี้</p>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Pagination (Generic) */}
                <div className="p-4 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500">
                    <div>แสดง 0 รายการ</div>
                    <div className="flex gap-2">
                        <button disabled className="px-3 py-1 border border-slate-200 rounded disabled:opacity-50">ก่อนหน้า</button>
                        <button disabled className="px-3 py-1 border border-slate-200 rounded disabled:opacity-50">ถัดไป</button>
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

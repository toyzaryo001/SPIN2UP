"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Settings, Save, RefreshCw, Search, Clock, Calendar, DollarSign, History, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const DAYS = [
    { value: 0, label: "อาทิตย์" },
    { value: 1, label: "จันทร์" },
    { value: 2, label: "อังคาร" },
    { value: 3, label: "พุธ" },
    { value: 4, label: "พฤหัสบดี" },
    { value: 5, label: "ศุกร์" },
    { value: 6, label: "เสาร์" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: `${i.toString().padStart(2, "0")}:00 น.`
}));

const PAGE_SIZES = [50, 100, 300, 500, 1000];

interface CashbackSettings {
    id?: number;
    rate: number;
    minLoss: number;
    maxCashback: number;
    dayOfWeek: number;
    claimStartHour: number;
    claimEndHour: number;
    isActive: boolean;
}

interface WeeklySummary {
    periodStart: string;
    periodEnd: string;
    totalPaid: number;
    claimCount: number;
}

interface ClaimHistory {
    id: number;
    userId: number;
    user: { username?: string; phone: string; fullName?: string };
    amount: number;
    periodStart: string;
    periodEnd: string;
    claimedAt: string;
}

export default function CashbackSettingsPage() {
    // Settings State
    const [settings, setSettings] = useState<CashbackSettings>({
        rate: 5,
        minLoss: 100,
        maxCashback: 10000,
        dayOfWeek: 1,
        claimStartHour: 0,
        claimEndHour: 23,
        isActive: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Summary State
    const [summaries, setSummaries] = useState<WeeklySummary[]>([]);
    const [loadingSummary, setLoadingSummary] = useState(false);

    // History State
    const [history, setHistory] = useState<ClaimHistory[]>([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPageSize, setHistoryPageSize] = useState(50);
    const [historySearch, setHistorySearch] = useState("");
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Fetch Settings
    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/rewards/settings/cashback");
            if (res.data.success && res.data.data) {
                setSettings({
                    ...settings,
                    ...res.data.data,
                    claimStartHour: res.data.data.claimStartHour ?? 0,
                    claimEndHour: res.data.data.claimEndHour ?? 23,
                });
            }
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch Weekly Summaries
    const fetchSummaries = async () => {
        try {
            setLoadingSummary(true);
            const res = await api.get("/admin/rewards/summaries?type=CASHBACK");
            if (res.data.success) {
                setSummaries(res.data.data || []);
            }
        } catch (error) {
            console.error("Summary fetch error:", error);
        } finally {
            setLoadingSummary(false);
        }
    };

    // Fetch Claim History
    const fetchHistory = async () => {
        try {
            setLoadingHistory(true);
            const params = new URLSearchParams({
                type: "CASHBACK",
                page: historyPage.toString(),
                limit: historyPageSize.toString(),
            });
            if (historySearch) params.append("search", historySearch);

            const res = await api.get(`/admin/rewards/history?${params}`);
            if (res.data.success) {
                setHistory(res.data.data || []);
                setHistoryTotal(res.data.total || 0);
            }
        } catch (error) {
            console.error("History fetch error:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Save Settings
    const handleSave = async () => {
        try {
            setSaving(true);
            const res = await api.post("/admin/rewards/settings/cashback", settings);
            if (res.data.success) {
                toast.success("บันทึกสำเร็จ");
            }
        } catch (error) {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setSaving(false);
        }
    };

    // Initial Load
    useEffect(() => {
        fetchSettings();
        fetchSummaries();
    }, []);

    // Fetch history when page/size/search changes
    useEffect(() => {
        fetchHistory();
    }, [historyPage, historyPageSize]);

    // Handle Search
    const handleSearch = () => {
        setHistoryPage(1);
        fetchHistory();
    };

    const totalPages = Math.ceil(historyTotal / historyPageSize);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
    };

    const formatDateTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleString("th-TH", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    if (loading) {
        return <div className="p-6 text-center">กำลังโหลด...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">ตั้งค่ายอดเสีย (Cashback)</h2>
                    <p className="text-slate-500 text-sm mt-1">กำหนดเงื่อนไขการคืนยอดเสียให้ผู้เล่น</p>
                </div>
                <Link href="/activities" className="text-blue-500 hover:underline text-sm">
                    ← กลับ
                </Link>
            </div>

            {/* Settings Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Settings size={20} className="text-yellow-500" />
                    ตั้งค่าเงื่อนไข
                </h3>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            เปอร์เซ็นต์คืนยอดเสีย (%)
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            value={settings.rate}
                            onChange={(e) => setSettings({ ...settings, rate: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 text-slate-900"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            ยอดเสียขั้นต่ำ (บาท)
                        </label>
                        <input
                            type="number"
                            value={settings.minLoss}
                            onChange={(e) => setSettings({ ...settings, minLoss: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 text-slate-900"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            คืนสูงสุด (บาท)
                        </label>
                        <input
                            type="number"
                            value={settings.maxCashback}
                            onChange={(e) => setSettings({ ...settings, maxCashback: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 text-slate-900"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            วันที่รับได้
                        </label>
                        <select
                            value={settings.dayOfWeek}
                            onChange={(e) => setSettings({ ...settings, dayOfWeek: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 text-slate-900"
                        >
                            {DAYS.map((day) => (
                                <option key={day.value} value={day.value}>
                                    {day.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <Clock size={14} className="inline mr-1" />
                            เริ่มกดรับได้ (เวลา)
                        </label>
                        <select
                            value={settings.claimStartHour}
                            onChange={(e) => setSettings({ ...settings, claimStartHour: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 text-slate-900"
                        >
                            {HOURS.map((hour) => (
                                <option key={hour.value} value={hour.value}>
                                    {hour.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <Clock size={14} className="inline mr-1" />
                            หมดเวลากดรับ (เวลา)
                        </label>
                        <select
                            value={settings.claimEndHour}
                            onChange={(e) => setSettings({ ...settings, claimEndHour: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 text-slate-900"
                        >
                            {HOURS.map((hour) => (
                                <option key={hour.value} value={hour.value}>
                                    {hour.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-6 flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.isActive}
                            onChange={(e) => setSettings({ ...settings, isActive: e.target.checked })}
                            className="w-5 h-5 rounded border-slate-300 text-yellow-500 focus:ring-yellow-400"
                        />
                        <span className="text-sm font-medium text-slate-700">เปิดใช้งาน</span>
                    </label>
                </div>

                <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
                    <button
                        onClick={fetchSettings}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                        <RefreshCw size={18} />
                        รีเซ็ต
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                    >
                        <Save size={18} />
                        {saving ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                </div>
            </div>

            {/* Weekly Summaries */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <DollarSign size={20} className="text-green-500" />
                    รายการคำนวณล่าสุด
                </h3>

                {loadingSummary ? (
                    <div className="text-center py-4 text-slate-500">กำลังโหลด...</div>
                ) : summaries.length === 0 ? (
                    <div className="text-center py-4 text-slate-400">ยังไม่มีข้อมูล</div>
                ) : (
                    <div className="space-y-2">
                        {summaries.map((summary, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-slate-50 p-4 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Calendar size={18} className="text-slate-400" />
                                    <span className="text-slate-700">
                                        รอบวันที่ {formatDate(summary.periodStart)} - {formatDate(summary.periodEnd)}
                                    </span>
                                    <span className="text-xs text-slate-400">({summary.claimCount} คน)</span>
                                </div>
                                <span className="text-lg font-bold text-green-600">
                                    {summary.totalPaid.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Claim History Table */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <History size={20} className="text-blue-500" />
                        ประวัติการกดรับ
                    </h3>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="ค้นหา username/เบอร์โทร"
                                value={historySearch}
                                onChange={(e) => setHistorySearch(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 text-sm w-64"
                            />
                        </div>
                        <button onClick={handleSearch} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
                            ค้นหา
                        </button>
                        <select
                            value={historyPageSize}
                            onChange={(e) => { setHistoryPageSize(parseInt(e.target.value)); setHistoryPage(1); }}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        >
                            {PAGE_SIZES.map(size => (
                                <option key={size} value={size}>{size} รายการ</option>
                            ))}
                        </select>
                    </div>
                </div>

                {loadingHistory ? (
                    <div className="text-center py-8 text-slate-500">กำลังโหลด...</div>
                ) : history.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">ไม่พบข้อมูล</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 text-left">
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">#</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Username/เบอร์โทร</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">ชื่อ</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">ยอดที่รับ</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">ช่วงเวลา</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">วันที่กดรับ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {history.map((item, idx) => (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-sm text-slate-500">{(historyPage - 1) * historyPageSize + idx + 1}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-slate-800">{item.user?.username || item.user?.phone}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{item.user?.fullName || "-"}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-green-600">{Number(item.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿</td>
                                            <td className="px-4 py-3 text-sm text-slate-500">{formatDate(item.periodStart)} - {formatDate(item.periodEnd)}</td>
                                            <td className="px-4 py-3 text-sm text-slate-500">{formatDateTime(item.claimedAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                            <div className="text-sm text-slate-500">
                                แสดง {(historyPage - 1) * historyPageSize + 1} - {Math.min(historyPage * historyPageSize, historyTotal)} จาก {historyTotal} รายการ
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                    disabled={historyPage <= 1}
                                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="text-sm text-slate-600">หน้า {historyPage} / {totalPages || 1}</span>
                                <button
                                    onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                                    disabled={historyPage >= totalPages}
                                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

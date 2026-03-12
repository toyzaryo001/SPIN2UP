"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    DollarSign,
    History,
    RefreshCw,
    Save,
    Search,
    Settings,
} from "lucide-react";
import api from "@/lib/api";

const HISTORY_PAGE_SIZES = [50, 100, 300, 500, 1000];
const DAILY_STAT_PAGE_SIZES = [10, 30, 50, 100];

interface TurnoverSettings {
    id?: number;
    rate: number;
    minTurnover: number;
    maxReward: number;
    isActive: boolean;
}

interface RewardSummary {
    periodStart: string;
    periodEnd: string;
    totalPaid: number;
    claimCount: number;
}

interface RewardSummaryMeta {
    totalPaidAllTime: number;
    totalClaimCount: number;
    totalPeriods: number;
}

interface RewardDailyStat {
    id: number;
    type: "CASHBACK" | "COMMISSION";
    statDate: string;
    periodStart: string;
    periodEnd: string;
    claimedUserCount: number;
    claimCount: number;
    totalClaimedAmount: number;
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

export default function CommissionSettingsPage() {
    const [settings, setSettings] = useState<TurnoverSettings>({
        rate: 0.5,
        minTurnover: 100,
        maxReward: 10000,
        isActive: true,
    });
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [saving, setSaving] = useState(false);

    const [adminPermissions, setAdminPermissions] = useState<any>(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    const [summaries, setSummaries] = useState<RewardSummary[]>([]);
    const [summaryMeta, setSummaryMeta] = useState<RewardSummaryMeta>({
        totalPaidAllTime: 0,
        totalClaimCount: 0,
        totalPeriods: 0,
    });
    const [loadingSummary, setLoadingSummary] = useState(false);

    const [dailyStats, setDailyStats] = useState<RewardDailyStat[]>([]);
    const [dailyStatsTotal, setDailyStatsTotal] = useState(0);
    const [dailyStatsPage, setDailyStatsPage] = useState(1);
    const [dailyStatsPageSize, setDailyStatsPageSize] = useState(30);
    const [loadingDailyStats, setLoadingDailyStats] = useState(false);

    const [history, setHistory] = useState<ClaimHistory[]>([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPageSize, setHistoryPageSize] = useState(50);
    const [historySearch, setHistorySearch] = useState("");
    const [loadingHistory, setLoadingHistory] = useState(false);

    const getFeaturePermission = (feature: string) => adminPermissions?.activities?.[feature];

    const canView = (feature: string) => {
        if (isSuperAdmin) return true;
        const permission = getFeaturePermission(feature);
        if (!permission) return false;
        if (typeof permission === "boolean") return permission;
        return !!permission.view || !!permission.manage;
    };

    const canManage = (feature: string) => {
        if (isSuperAdmin) return true;
        const permission = getFeaturePermission(feature);
        if (!permission) return false;
        if (typeof permission === "boolean") return permission;
        return !!permission.manage;
    };

    const canViewCommission = canView("commission");
    const canManageCommission = canManage("commission");

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("th-TH", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });

    const formatDateTime = (dateStr: string) =>
        new Date(dateStr).toLocaleString("th-TH", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    const formatMoney = (amount: number) =>
        Number(amount).toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const fetchSettings = async () => {
        try {
            setLoadingSettings(true);
            const res = await api.get("/admin/rewards/settings/turnover");
            if (res.data.success && res.data.data) {
                setSettings({
                    id: res.data.data.id,
                    rate: Number(res.data.data.rate ?? 0.5),
                    minTurnover: Number(res.data.data.minTurnover ?? 100),
                    maxReward: Number(res.data.data.maxReward ?? 10000),
                    isActive: Boolean(res.data.data.isActive),
                });
            }
        } catch (error) {
            console.error("Fetch settings error:", error);
            toast.error("ดึงข้อมูลไม่สำเร็จ");
        } finally {
            setLoadingSettings(false);
        }
    };

    const fetchSummaries = async () => {
        try {
            setLoadingSummary(true);
            const res = await api.get("/admin/rewards/summaries?type=COMMISSION");
            if (res.data.success) {
                setSummaries(res.data.data || []);
                setSummaryMeta({
                    totalPaidAllTime: Number(res.data.meta?.totalPaidAllTime || 0),
                    totalClaimCount: Number(res.data.meta?.totalClaimCount || 0),
                    totalPeriods: Number(res.data.meta?.totalPeriods || 0),
                });
            }
        } catch (error) {
            console.error("Summary fetch error:", error);
        } finally {
            setLoadingSummary(false);
        }
    };

    const fetchDailyStats = async () => {
        try {
            setLoadingDailyStats(true);
            const params = new URLSearchParams({
                type: "COMMISSION",
                page: dailyStatsPage.toString(),
                limit: dailyStatsPageSize.toString(),
            });
            const res = await api.get(`/admin/rewards/daily-stats?${params.toString()}`);
            if (res.data.success) {
                setDailyStats(res.data.data || []);
                setDailyStatsTotal(Number(res.data.total || 0));
            }
        } catch (error) {
            console.error("Daily stats fetch error:", error);
        } finally {
            setLoadingDailyStats(false);
        }
    };

    const fetchHistory = async () => {
        try {
            setLoadingHistory(true);
            const params = new URLSearchParams({
                type: "COMMISSION",
                page: historyPage.toString(),
                limit: historyPageSize.toString(),
            });
            if (historySearch.trim()) {
                params.append("search", historySearch.trim());
            }

            const res = await api.get(`/admin/rewards/history?${params.toString()}`);
            if (res.data.success) {
                setHistory(res.data.data || []);
                setHistoryTotal(Number(res.data.total || 0));
            }
        } catch (error) {
            console.error("History fetch error:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const res = await api.post("/admin/rewards/settings/turnover", settings);
            if (res.data.success) {
                toast.success("บันทึกสำเร็จ");
            }
        } catch (error) {
            console.error("Save settings error:", error);
            toast.error("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setSaving(false);
        }
    };

    const handleSearch = () => {
        if (historyPage !== 1) {
            setHistoryPage(1);
            return;
        }
        fetchHistory();
    };

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const res = await api.get("/admin/me");
                if (res.data.success && res.data.data) {
                    setAdminPermissions(res.data.data.permissions || {});
                    setIsSuperAdmin(
                        res.data.data.isSuperAdmin === true || res.data.data.role?.name === "SUPER_ADMIN"
                    );
                }
            } catch (error) {
                console.error(error);
            }
        };

        fetchAdminData();
        fetchSettings();
        fetchSummaries();
    }, []);

    useEffect(() => {
        fetchDailyStats();
    }, [dailyStatsPage, dailyStatsPageSize]);

    useEffect(() => {
        fetchHistory();
    }, [historyPage, historyPageSize]);

    const dailyStatsTotalPages = Math.ceil(dailyStatsTotal / dailyStatsPageSize);
    const historyTotalPages = Math.ceil(historyTotal / historyPageSize);

    if (loadingSettings) {
        return <div className="p-6 text-center">กำลังโหลด...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">ตั้งค่าคอมมิชชั่น (Turnover Rebate)</h2>
                    <p className="mt-1 text-sm text-slate-500">กำหนดเปอร์เซ็นต์คืนค่าคอมมิชชั่นจากยอดเทิร์นโอเวอร์</p>
                </div>
                <Link href="/activities" className="text-sm text-blue-500 hover:underline">
                    ← กลับ
                </Link>
            </div>

            {!isSuperAdmin && !canViewCommission ? (
                <div className="rounded-xl border border-red-100 bg-white p-6 text-center text-red-500 shadow-sm">
                    คุณไม่มีสิทธิ์ดูข้อมูลหน้านี้
                </div>
            ) : null}

            <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                    <Settings size={20} className="text-yellow-500" />
                    ตั้งค่าเงื่อนไข
                </h3>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            เปอร์เซ็นต์คืนค่าคอม (%)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={settings.rate}
                            disabled={!canManageCommission}
                            onChange={(event) =>
                                setSettings((current) => ({
                                    ...current,
                                    rate: parseFloat(event.target.value) || 0,
                                }))
                            }
                            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-slate-900 focus:ring-2 focus:ring-yellow-400 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                        <p className="mt-1 text-xs text-slate-400">เช่น 0.5% ของยอดเทิร์น</p>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            ยอดเทิร์นขั้นต่ำ (บาท)
                        </label>
                        <input
                            type="number"
                            value={settings.minTurnover}
                            disabled={!canManageCommission}
                            onChange={(event) =>
                                setSettings((current) => ({
                                    ...current,
                                    minTurnover: parseFloat(event.target.value) || 0,
                                }))
                            }
                            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-slate-900 focus:ring-2 focus:ring-yellow-400 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">คืนสูงสุด (บาท)</label>
                        <input
                            type="number"
                            value={settings.maxReward}
                            disabled={!canManageCommission}
                            onChange={(event) =>
                                setSettings((current) => ({
                                    ...current,
                                    maxReward: parseFloat(event.target.value) || 0,
                                }))
                            }
                            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-slate-900 focus:ring-2 focus:ring-yellow-400 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                    </div>
                </div>

                <div className="mt-6 flex items-center gap-4">
                    <label className="flex cursor-pointer items-center gap-2">
                        <input
                            type="checkbox"
                            checked={settings.isActive}
                            disabled={!canManageCommission}
                            onChange={(event) =>
                                setSettings((current) => ({
                                    ...current,
                                    isActive: event.target.checked,
                                }))
                            }
                            className="h-5 w-5 rounded border-slate-300 text-yellow-500 focus:ring-yellow-400 disabled:opacity-50"
                        />
                        <span className="text-sm font-medium text-slate-700">เปิดใช้งาน</span>
                    </label>
                </div>

                <div className="mt-8 flex gap-3 border-t border-slate-100 pt-6">
                    <button
                        onClick={fetchSettings}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 hover:bg-slate-50"
                    >
                        <RefreshCw size={18} />
                        รีเซ็ต
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !canManageCommission}
                        className="flex items-center gap-2 rounded-lg bg-yellow-500 px-6 py-2 text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Save size={18} />
                        {saving ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-6">
                    <div>
                        <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-slate-800">
                            <DollarSign size={20} className="text-green-500" />
                            ยอดรวมค่าคอมมิชชั่นทั้งหมด
                        </h3>
                        <p className="text-sm text-slate-500">สรุปยอดรับค่าคอมมิชชั่นสะสมทั้งหมดจากการกดรับสำเร็จ</p>
                    </div>
                    {loadingSummary ? (
                        <div className="text-sm text-slate-500">กำลังโหลด...</div>
                    ) : (
                        <div className="text-right">
                            <div className="text-3xl font-bold text-green-600">{formatMoney(summaryMeta.totalPaidAllTime)} ฿</div>
                            <div className="mt-1 text-sm text-slate-500">
                                รับแล้ว {summaryMeta.totalClaimCount.toLocaleString("th-TH")} ครั้ง
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                                รวม {summaryMeta.totalPeriods.toLocaleString("th-TH")} รอบ
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                    <Calendar size={20} className="text-blue-500" />
                    รายการคำนวณล่าสุด
                </h3>

                {loadingSummary ? (
                    <div className="py-4 text-center text-slate-500">กำลังโหลด...</div>
                ) : summaries.length === 0 ? (
                    <div className="py-4 text-center text-slate-400">ยังไม่มีข้อมูล</div>
                ) : (
                    <div className="space-y-2">
                        {summaries.map((summary, index) => (
                            <div
                                key={`${summary.periodStart}-${summary.periodEnd}-${index}`}
                                className="flex items-center justify-between rounded-lg bg-slate-50 p-4"
                            >
                                <div className="flex items-center gap-3">
                                    <Calendar size={18} className="text-slate-400" />
                                    <span className="text-slate-700">
                                        รอบวันที่ {formatDate(summary.periodStart)} - {formatDate(summary.periodEnd)}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        ({summary.claimCount.toLocaleString("th-TH")} คน)
                                    </span>
                                </div>
                                <span className="text-lg font-bold text-green-600">{formatMoney(summary.totalPaid)} ฿</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                            <Calendar size={20} className="text-indigo-500" />
                            สถิติการกดรับรายวัน
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            เก็บจำนวนคนกดรับและยอดรวมแยกตามวัน เพื่อให้ดูย้อนหลังได้ทุกวัน
                        </p>
                    </div>

                    <select
                        value={dailyStatsPageSize}
                        onChange={(event) => {
                            setDailyStatsPageSize(parseInt(event.target.value, 10));
                            setDailyStatsPage(1);
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                        {DAILY_STAT_PAGE_SIZES.map((size) => (
                            <option key={size} value={size}>
                                {size} วัน
                            </option>
                        ))}
                    </select>
                </div>

                {loadingDailyStats ? (
                    <div className="py-8 text-center text-slate-500">กำลังโหลด...</div>
                ) : dailyStats.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">ยังไม่มีสถิติรายวัน</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 text-left">
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">#</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">วันที่</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">คนกดรับ</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">จำนวนรายการ</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">ยอดรวมที่รับ</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">รอบคำนวณ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {dailyStats.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-sm text-slate-500">
                                                {(dailyStatsPage - 1) * dailyStatsPageSize + index + 1}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-slate-800">{formatDate(item.statDate)}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">
                                                {item.claimedUserCount.toLocaleString("th-TH")} คน
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">
                                                {item.claimCount.toLocaleString("th-TH")} รายการ
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-green-600">
                                                {formatMoney(item.totalClaimedAmount)} ฿
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-500">
                                                {formatDate(item.periodStart)} - {formatDate(item.periodEnd)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                            <div className="text-sm text-slate-500">
                                แสดง {(dailyStatsPage - 1) * dailyStatsPageSize + 1} -{" "}
                                {Math.min(dailyStatsPage * dailyStatsPageSize, dailyStatsTotal)} จาก {dailyStatsTotal} วัน
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setDailyStatsPage((current) => Math.max(1, current - 1))}
                                    disabled={dailyStatsPage <= 1}
                                    className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="text-sm text-slate-600">
                                    หน้า {dailyStatsPage} / {dailyStatsTotalPages || 1}
                                </span>
                                <button
                                    onClick={() => setDailyStatsPage((current) => Math.min(dailyStatsTotalPages || 1, current + 1))}
                                    disabled={dailyStatsPage >= dailyStatsTotalPages}
                                    className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
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
                                onChange={(event) => setHistorySearch(event.target.value)}
                                onKeyDown={(event) => event.key === "Enter" && handleSearch()}
                                className="w-64 rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-yellow-400"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
                        >
                            ค้นหา
                        </button>
                        <select
                            value={historyPageSize}
                            onChange={(event) => {
                                setHistoryPageSize(parseInt(event.target.value, 10));
                                setHistoryPage(1);
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                            {HISTORY_PAGE_SIZES.map((size) => (
                                <option key={size} value={size}>
                                    {size} รายการ
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {loadingHistory ? (
                    <div className="py-8 text-center text-slate-500">กำลังโหลด...</div>
                ) : history.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">ไม่พบข้อมูล</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 text-left">
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">#</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">Username/เบอร์โทร</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">ชื่อ</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">ยอดที่รับ</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">ช่วงเวลา</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">วันที่กดรับ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {history.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-sm text-slate-500">
                                                {(historyPage - 1) * historyPageSize + index + 1}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-slate-800">
                                                {item.user?.username || item.user?.phone}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{item.user?.fullName || "-"}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-green-600">
                                                {formatMoney(Number(item.amount))} ฿
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-500">
                                                {formatDate(item.periodStart)} - {formatDate(item.periodEnd)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-500">{formatDateTime(item.claimedAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                            <div className="text-sm text-slate-500">
                                แสดง {(historyPage - 1) * historyPageSize + 1} - {Math.min(historyPage * historyPageSize, historyTotal)} จาก {historyTotal} รายการ
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setHistoryPage((current) => Math.max(1, current - 1))}
                                    disabled={historyPage <= 1}
                                    className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="text-sm text-slate-600">
                                    หน้า {historyPage} / {historyTotalPages || 1}
                                </span>
                                <button
                                    onClick={() => setHistoryPage((current) => Math.min(historyTotalPages || 1, current + 1))}
                                    disabled={historyPage >= historyTotalPages}
                                    className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-50"
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

"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
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
import Link from "next/link";
import toast from "react-hot-toast";

const PAGE_SIZES = [50, 100, 300, 500, 1000];

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

    const fetchSettings = async () => {
        try {
            setLoadingSettings(true);
            const res = await api.get("/admin/rewards/settings/turnover");
            if (res.data.success && res.data.data) {
                setSettings({
                    rate: Number(res.data.data.rate ?? 0.5),
                    minTurnover: Number(res.data.data.minTurnover ?? 100),
                    maxReward: Number(res.data.data.maxReward ?? 10000),
                    isActive: Boolean(res.data.data.isActive),
                    id: res.data.data.id,
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

    const fetchHistory = async () => {
        try {
            setLoadingHistory(true);
            const params = new URLSearchParams({
                type: "COMMISSION",
                page: historyPage.toString(),
                limit: historyPageSize.toString(),
            });
            if (historySearch) params.append("search", historySearch);

            const res = await api.get(`/admin/rewards/history?${params.toString()}`);
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

    const handleSave = async () => {
        try {
            setSaving(true);
            const res = await api.post("/admin/rewards/settings/turnover", settings);
            if (res.data.success) {
                toast.success("บันทึกสำเร็จ");
            }
        } catch (error) {
            toast.error("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setSaving(false);
        }
    };

    const handleSearch = () => {
        setHistoryPage(1);
        fetchHistory();
    };

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

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const res = await api.get("/admin/me");
                if (res.data.success && res.data.data) {
                    setAdminPermissions(res.data.data.permissions || {});
                    setIsSuperAdmin(res.data.data.isSuperAdmin === true || res.data.data.role?.name === "SUPER_ADMIN");
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
        fetchHistory();
    }, [historyPage, historyPageSize]);

    const totalPages = Math.ceil(historyTotal / historyPageSize);

    if (loadingSettings) {
        return <div className="p-6 text-center">กำลังโหลด...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">ตั้งค่าคอมมิชชั่น (Turnover Rebate)</h2>
                    <p className="text-slate-500 text-sm mt-1">กำหนดเปอร์เซ็นต์คืนค่าคอมมิชชั่นจากยอดเทิร์นโอเวอร์</p>
                </div>
                <Link href="/activities" className="text-blue-500 hover:underline text-sm">
                    ← กลับ
                </Link>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Settings size={20} className="text-yellow-500" />
                    ตั้งค่าเงื่อนไข
                </h3>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            เปอร์เซ็นต์คืนค่าคอม (%)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={settings.rate}
                            disabled={!canManage("commission")}
                            onChange={(e) => setSettings({ ...settings, rate: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                        <p className="text-xs text-slate-400 mt-1">เช่น 0.5% ของยอดเทิร์น</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            ยอดเทิร์นขั้นต่ำ (บาท)
                        </label>
                        <input
                            type="number"
                            value={settings.minTurnover}
                            disabled={!canManage("commission")}
                            onChange={(e) => setSettings({ ...settings, minTurnover: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            คืนสูงสุด (บาท)
                        </label>
                        <input
                            type="number"
                            value={settings.maxReward}
                            disabled={!canManage("commission")}
                            onChange={(e) => setSettings({ ...settings, maxReward: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                    </div>
                </div>

                <div className="mt-6 flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.isActive}
                            disabled={!canManage("commission")}
                            onChange={(e) => setSettings({ ...settings, isActive: e.target.checked })}
                            className="w-5 h-5 rounded border-slate-300 text-yellow-500 focus:ring-yellow-400 disabled:opacity-50"
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
                        disabled={saving || !canManage("commission")}
                        className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={18} />
                        {saving ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-start justify-between gap-6">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
                            <DollarSign size={20} className="text-green-500" />
                            ยอดรวมค่าคอมมิชชั่นทั้งหมด
                        </h3>
                        <p className="text-sm text-slate-500">สรุปยอดรับค่าคอมมิชชั่นสะสมทั้งหมดจากการกดรับสำเร็จ</p>
                    </div>
                    {loadingSummary ? (
                        <div className="text-sm text-slate-500">กำลังโหลด...</div>
                    ) : (
                        <div className="text-right">
                            <div className="text-3xl font-bold text-green-600">
                                {summaryMeta.totalPaidAllTime.toLocaleString("th-TH", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}{" "}
                                ฿
                            </div>
                            <div className="text-sm text-slate-500 mt-1">
                                รับแล้ว {summaryMeta.totalClaimCount.toLocaleString("th-TH")} ครั้ง
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                รวม {summaryMeta.totalPeriods.toLocaleString("th-TH")} รอบ
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Calendar size={20} className="text-blue-500" />
                    รายการคำนวณล่าสุด
                </h3>

                {loadingSummary ? (
                    <div className="text-center py-4 text-slate-500">กำลังโหลด...</div>
                ) : summaries.length === 0 ? (
                    <div className="text-center py-4 text-slate-400">ยังไม่มีข้อมูล</div>
                ) : (
                    <div className="space-y-2">
                        {summaries.map((summary, idx) => (
                            <div key={`${summary.periodStart}-${summary.periodEnd}-${idx}`} className="flex items-center justify-between bg-slate-50 p-4 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Calendar size={18} className="text-slate-400" />
                                    <span className="text-slate-700">
                                        รอบวันที่ {formatDate(summary.periodStart)} - {formatDate(summary.periodEnd)}
                                    </span>
                                    <span className="text-xs text-slate-400">({summary.claimCount} คน)</span>
                                </div>
                                <span className="text-lg font-bold text-green-600">
                                    {Number(summary.totalPaid).toLocaleString("th-TH", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}{" "}
                                    ฿
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

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
                            onChange={(e) => {
                                setHistoryPageSize(parseInt(e.target.value, 10));
                                setHistoryPage(1);
                            }}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        >
                            {PAGE_SIZES.map((size) => (
                                <option key={size} value={size}>
                                    {size} รายการ
                                </option>
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
                                            <td className="px-4 py-3 text-sm text-slate-500">
                                                {(historyPage - 1) * historyPageSize + idx + 1}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-slate-800">
                                                {item.user?.username || item.user?.phone}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{item.user?.fullName || "-"}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-green-600">
                                                {Number(item.amount).toLocaleString("th-TH", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}{" "}
                                                ฿
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

                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                            <div className="text-sm text-slate-500">
                                แสดง {(historyPage - 1) * historyPageSize + 1} - {Math.min(historyPage * historyPageSize, historyTotal)} จาก {historyTotal} รายการ
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setHistoryPage((current) => Math.max(1, current - 1))}
                                    disabled={historyPage <= 1}
                                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="text-sm text-slate-600">หน้า {historyPage} / {totalPages || 1}</span>
                                <button
                                    onClick={() => setHistoryPage((current) => Math.min(totalPages || 1, current + 1))}
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

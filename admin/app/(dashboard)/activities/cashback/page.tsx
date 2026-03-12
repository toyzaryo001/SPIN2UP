"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    RefreshCw,
    Save,
    Search,
    Settings,
} from "lucide-react";
import api from "@/lib/api";

const DAYS = [
    { value: 0, label: "อาทิตย์" },
    { value: 1, label: "จันทร์" },
    { value: 2, label: "อังคาร" },
    { value: 3, label: "พุธ" },
    { value: 4, label: "พฤหัสบดี" },
    { value: 5, label: "ศุกร์" },
    { value: 6, label: "เสาร์" },
    { value: 7, label: "ทุกวัน" },
];

const HOURS = Array.from({ length: 24 }, (_, index) => ({
    value: index,
    label: `${index.toString().padStart(2, "0")}:00 น.`,
}));

const OVERVIEW_PAGE_SIZES = [10, 30, 50, 100];
const TABLE_PAGE_SIZES = [20, 50, 100, 300];

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

interface DailyOverviewRow {
    id: number;
    statDate: string;
    periodStart: string;
    periodEnd: string;
    eligibleUserCount: number;
    claimedUserCount: number;
    unclaimedUserCount: number;
    totalCalculatedAmount: number;
    totalClaimedAmount: number;
}

interface EligibilityRow {
    id: number;
    userId: number;
    statDate: string;
    periodStart: string;
    periodEnd: string;
    rewardAmount: number;
    netLoss: number;
    isClaimed: boolean;
    claimedAt?: string | null;
    user: {
        username?: string;
        fullName?: string;
        phone?: string;
    };
}

export default function CashbackSettingsPage() {
    const [settings, setSettings] = useState<CashbackSettings>({
        rate: 5,
        minLoss: 100,
        maxCashback: 10000,
        dayOfWeek: 1,
        claimStartHour: 0,
        claimEndHour: 23,
        isActive: true,
    });
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [saving, setSaving] = useState(false);

    const [adminPermissions, setAdminPermissions] = useState<any>(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    const [overviewRows, setOverviewRows] = useState<DailyOverviewRow[]>([]);
    const [overviewTotal, setOverviewTotal] = useState(0);
    const [overviewPage, setOverviewPage] = useState(1);
    const [overviewPageSize, setOverviewPageSize] = useState(30);
    const [loadingOverview, setLoadingOverview] = useState(false);

    const [eligibilityRows, setEligibilityRows] = useState<EligibilityRow[]>([]);
    const [eligibilityTotal, setEligibilityTotal] = useState(0);
    const [eligibilityPage, setEligibilityPage] = useState(1);
    const [eligibilityPageSize, setEligibilityPageSize] = useState(50);
    const [eligibilitySearch, setEligibilitySearch] = useState("");
    const [eligibilityStatus, setEligibilityStatus] = useState("ALL");
    const [selectedDate, setSelectedDate] = useState("");
    const [loadingEligibility, setLoadingEligibility] = useState(false);

    const hasPerm = (action: string) => {
        if (isSuperAdmin) return true;
        const permission = adminPermissions?.activities?.[action];
        if (!permission) return false;
        if (typeof permission === "boolean") return permission;
        return !!permission.manage;
    };

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("th-TH", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });

    const formatDateTime = (dateStr?: string | null) =>
        dateStr
            ? new Date(dateStr).toLocaleString("th-TH", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            })
            : "-";

    const formatMoney = (amount: number) =>
        Number(amount).toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const toDateInputValue = (dateStr: string) => {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const fetchSettings = async () => {
        try {
            setLoadingSettings(true);
            const res = await api.get("/admin/rewards/settings/cashback");
            if (res.data.success && res.data.data) {
                setSettings({
                    id: res.data.data.id,
                    rate: Number(res.data.data.rate ?? 5),
                    minLoss: Number(res.data.data.minLoss ?? 100),
                    maxCashback: Number(res.data.data.maxCashback ?? 10000),
                    dayOfWeek: Number(res.data.data.dayOfWeek ?? 1),
                    claimStartHour: Number(res.data.data.claimStartHour ?? 0),
                    claimEndHour: Number(res.data.data.claimEndHour ?? 23),
                    isActive: Boolean(res.data.data.isActive),
                });
            }
        } catch (error) {
            console.error("Fetch cashback settings error:", error);
            toast.error("ดึงข้อมูลไม่สำเร็จ");
        } finally {
            setLoadingSettings(false);
        }
    };

    const fetchOverview = async () => {
        try {
            setLoadingOverview(true);
            const params = new URLSearchParams({
                type: "CASHBACK",
                page: overviewPage.toString(),
                limit: overviewPageSize.toString(),
            });
            const res = await api.get(`/admin/rewards/daily-overview?${params.toString()}`);
            if (res.data.success) {
                const rows = res.data.data || [];
                setOverviewRows(rows);
                setOverviewTotal(Number(res.data.pagination?.total || res.data.total || 0));

                if (!selectedDate && rows.length > 0) {
                    setSelectedDate(toDateInputValue(rows[0].statDate));
                }
            }
        } catch (error) {
            console.error("Fetch cashback overview error:", error);
        } finally {
            setLoadingOverview(false);
        }
    };

    const fetchEligibility = async () => {
        try {
            setLoadingEligibility(true);
            const params = new URLSearchParams({
                type: "CASHBACK",
                page: eligibilityPage.toString(),
                limit: eligibilityPageSize.toString(),
                status: eligibilityStatus,
            });

            if (selectedDate) {
                params.append("date", selectedDate);
            }

            if (eligibilitySearch.trim()) {
                params.append("search", eligibilitySearch.trim());
            }

            const res = await api.get(`/admin/rewards/eligibility?${params.toString()}`);
            if (res.data.success) {
                setEligibilityRows(res.data.data || []);
                setEligibilityTotal(Number(res.data.pagination?.total || 0));
                if (res.data.selectedDate && !selectedDate) {
                    setSelectedDate(toDateInputValue(res.data.selectedDate));
                }
            }
        } catch (error) {
            console.error("Fetch cashback eligibility error:", error);
        } finally {
            setLoadingEligibility(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const res = await api.post("/admin/rewards/settings/cashback", settings);
            if (res.data.success) {
                toast.success("บันทึกสำเร็จ");
            }
        } catch (error) {
            console.error("Save cashback settings error:", error);
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setSaving(false);
        }
    };

    const handleEligibilitySearch = () => {
        if (eligibilityPage !== 1) {
            setEligibilityPage(1);
            return;
        }
        fetchEligibility();
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
    }, []);

    useEffect(() => {
        fetchOverview();
    }, [overviewPage, overviewPageSize]);

    useEffect(() => {
        fetchEligibility();
    }, [eligibilityPage, eligibilityPageSize, eligibilityStatus, selectedDate]);

    const overviewTotalPages = Math.ceil(overviewTotal / overviewPageSize);
    const eligibilityTotalPages = Math.ceil(eligibilityTotal / eligibilityPageSize);

    if (loadingSettings) {
        return <div className="p-6 text-center">กำลังโหลด...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">ตั้งค่ายอดเสีย (Cashback)</h2>
                    <p className="mt-1 text-sm text-slate-500">กำหนดเงื่อนไขการคืนยอดเสีย และดูสิทธิ์รับของสมาชิกแบบรายวัน</p>
                </div>
                <Link href="/activities" className="text-sm text-blue-500 hover:underline">
                    ← กลับ
                </Link>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                    <Settings size={20} className="text-yellow-500" />
                    ตั้งค่าเงื่อนไข
                </h3>

                <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">เปอร์เซ็นต์คืนยอดเสีย (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={settings.rate}
                            disabled={!hasPerm("cashback")}
                            onChange={(event) =>
                                setSettings((current) => ({
                                    ...current,
                                    rate: parseFloat(event.target.value) || 0,
                                }))
                            }
                            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-slate-900 focus:ring-2 focus:ring-yellow-400 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">ยอดเสียขั้นต่ำ (บาท)</label>
                        <input
                            type="number"
                            value={settings.minLoss}
                            disabled={!hasPerm("cashback")}
                            onChange={(event) =>
                                setSettings((current) => ({
                                    ...current,
                                    minLoss: parseFloat(event.target.value) || 0,
                                }))
                            }
                            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-slate-900 focus:ring-2 focus:ring-yellow-400 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">คืนสูงสุด (บาท)</label>
                        <input
                            type="number"
                            value={settings.maxCashback}
                            disabled={!hasPerm("cashback")}
                            onChange={(event) =>
                                setSettings((current) => ({
                                    ...current,
                                    maxCashback: parseFloat(event.target.value) || 0,
                                }))
                            }
                            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-slate-900 focus:ring-2 focus:ring-yellow-400 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">วันที่รับได้</label>
                        <select
                            value={settings.dayOfWeek}
                            disabled={!hasPerm("cashback")}
                            onChange={(event) =>
                                setSettings((current) => ({
                                    ...current,
                                    dayOfWeek: parseInt(event.target.value, 10),
                                }))
                            }
                            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-slate-900 focus:ring-2 focus:ring-yellow-400 disabled:bg-slate-100 disabled:text-slate-500"
                        >
                            {DAYS.map((day) => (
                                <option key={day.value} value={day.value}>
                                    {day.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            <Clock size={14} className="mr-1 inline" />
                            เริ่มกดรับได้ (เวลา)
                        </label>
                        <select
                            value={settings.claimStartHour}
                            disabled={!hasPerm("cashback")}
                            onChange={(event) =>
                                setSettings((current) => ({
                                    ...current,
                                    claimStartHour: parseInt(event.target.value, 10),
                                }))
                            }
                            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-slate-900 focus:ring-2 focus:ring-yellow-400 disabled:bg-slate-100 disabled:text-slate-500"
                        >
                            {HOURS.map((hour) => (
                                <option key={hour.value} value={hour.value}>
                                    {hour.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            <Clock size={14} className="mr-1 inline" />
                            หมดเวลากดรับ (เวลา)
                        </label>
                        <select
                            value={settings.claimEndHour}
                            disabled={!hasPerm("cashback")}
                            onChange={(event) =>
                                setSettings((current) => ({
                                    ...current,
                                    claimEndHour: parseInt(event.target.value, 10),
                                }))
                            }
                            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-slate-900 focus:ring-2 focus:ring-yellow-400 disabled:bg-slate-100 disabled:text-slate-500"
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
                    <label className="flex cursor-pointer items-center gap-2">
                        <input
                            type="checkbox"
                            checked={settings.isActive}
                            disabled={!hasPerm("cashback")}
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
                        disabled={saving || !hasPerm("cashback")}
                        className="flex items-center gap-2 rounded-lg bg-yellow-500 px-6 py-2 text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Save size={18} />
                        {saving ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                            <Calendar size={20} className="text-indigo-500" />
                            ตารางคำนวณยอดเสียรายวัน
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            แสดงยอดเสียรวมที่ระบบคำนวณได้ในแต่ละรอบ พร้อมจำนวนคนที่รับแล้วและยังไม่รับ
                        </p>
                    </div>

                    <select
                        value={overviewPageSize}
                        onChange={(event) => {
                            setOverviewPageSize(parseInt(event.target.value, 10));
                            setOverviewPage(1);
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                        {OVERVIEW_PAGE_SIZES.map((size) => (
                            <option key={size} value={size}>
                                {size} วัน
                            </option>
                        ))}
                    </select>
                </div>

                {loadingOverview ? (
                    <div className="py-8 text-center text-slate-500">กำลังโหลด...</div>
                ) : overviewRows.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">ยังไม่มีข้อมูลการคำนวณ</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 text-left">
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">#</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">รอบวันที่</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">ผู้มีสิทธิ์</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">รับแล้ว</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">ยังไม่รับ</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">ยอดคำนวณรวม</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">ยอดที่รับแล้ว</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {overviewRows.map((row, index) => {
                                        const rowDate = toDateInputValue(row.statDate);
                                        const isSelected = selectedDate === rowDate;

                                        return (
                                            <tr
                                                key={row.id}
                                                className={`cursor-pointer hover:bg-slate-50 ${isSelected ? "bg-yellow-50" : ""}`}
                                                onClick={() => {
                                                    setSelectedDate(rowDate);
                                                    setEligibilityPage(1);
                                                }}
                                            >
                                                <td className="px-4 py-3 text-sm text-slate-500">
                                                    {(overviewPage - 1) * overviewPageSize + index + 1}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-slate-800">
                                                    {formatDate(row.periodStart)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600">
                                                    {row.eligibleUserCount.toLocaleString("th-TH")} คน
                                                </td>
                                                <td className="px-4 py-3 text-sm text-green-600">
                                                    {row.claimedUserCount.toLocaleString("th-TH")} คน
                                                </td>
                                                <td className="px-4 py-3 text-sm text-amber-600">
                                                    {row.unclaimedUserCount.toLocaleString("th-TH")} คน
                                                </td>
                                                <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                                                    {formatMoney(row.totalCalculatedAmount)} ฿
                                                </td>
                                                <td className="px-4 py-3 text-sm text-green-600">
                                                    {formatMoney(row.totalClaimedAmount)} ฿
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                            <div className="text-sm text-slate-500">
                                แสดง {(overviewPage - 1) * overviewPageSize + 1} - {Math.min(overviewPage * overviewPageSize, overviewTotal)} จาก {overviewTotal} วัน
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setOverviewPage((page) => Math.max(1, page - 1))}
                                    disabled={overviewPage <= 1}
                                    className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="text-sm text-slate-600">หน้า {overviewPage} / {overviewTotalPages || 1}</span>
                                <button
                                    onClick={() => setOverviewPage((page) => Math.min(overviewTotalPages || 1, page + 1))}
                                    disabled={overviewPage >= overviewTotalPages}
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
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                            <Calendar size={20} className="text-blue-500" />
                            รายชื่อผู้มีสิทธิ์รับยอดเสีย
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            แสดงสถานะว่า รับแล้วหรือยังไม่รับ พร้อมตัวกรองค้นหา
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(event) => {
                                setSelectedDate(event.target.value);
                                setEligibilityPage(1);
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                        <select
                            value={eligibilityStatus}
                            onChange={(event) => {
                                setEligibilityStatus(event.target.value);
                                setEligibilityPage(1);
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                            <option value="ALL">ทั้งหมด</option>
                            <option value="CLAIMED">รับแล้ว</option>
                            <option value="UNCLAIMED">ยังไม่รับ</option>
                        </select>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="ค้นหา username/เบอร์โทร"
                                value={eligibilitySearch}
                                onChange={(event) => setEligibilitySearch(event.target.value)}
                                onKeyDown={(event) => event.key === "Enter" && handleEligibilitySearch()}
                                className="w-64 rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-yellow-400"
                            />
                        </div>
                        <button
                            onClick={handleEligibilitySearch}
                            className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
                        >
                            ค้นหา
                        </button>
                        <select
                            value={eligibilityPageSize}
                            onChange={(event) => {
                                setEligibilityPageSize(parseInt(event.target.value, 10));
                                setEligibilityPage(1);
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                            {TABLE_PAGE_SIZES.map((size) => (
                                <option key={size} value={size}>
                                    {size} รายการ
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {loadingEligibility ? (
                    <div className="py-8 text-center text-slate-500">กำลังโหลด...</div>
                ) : eligibilityRows.length === 0 ? (
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
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">ยอดเสีย</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">ยอดรับได้</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">สถานะ</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">เวลากดรับ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {eligibilityRows.map((row, index) => (
                                        <tr key={row.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-sm text-slate-500">
                                                {(eligibilityPage - 1) * eligibilityPageSize + index + 1}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-slate-800">
                                                {row.user?.username || row.user?.phone}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{row.user?.fullName || "-"}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{formatMoney(row.netLoss)} ฿</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-green-600">
                                                {formatMoney(row.rewardAmount)} ฿
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                                                        row.isClaimed
                                                            ? "bg-green-100 text-green-600"
                                                            : "bg-amber-100 text-amber-600"
                                                    }`}
                                                >
                                                    {row.isClaimed ? "รับแล้ว" : "ยังไม่รับ"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-500">{formatDateTime(row.claimedAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                            <div className="text-sm text-slate-500">
                                แสดง {(eligibilityPage - 1) * eligibilityPageSize + 1} - {Math.min(eligibilityPage * eligibilityPageSize, eligibilityTotal)} จาก {eligibilityTotal} รายการ
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setEligibilityPage((page) => Math.max(1, page - 1))}
                                    disabled={eligibilityPage <= 1}
                                    className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="text-sm text-slate-600">
                                    หน้า {eligibilityPage} / {eligibilityTotalPages || 1}
                                </span>
                                <button
                                    onClick={() => setEligibilityPage((page) => Math.min(eligibilityTotalPages || 1, page + 1))}
                                    disabled={eligibilityPage >= eligibilityTotalPages}
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Save,
    Search,
    Settings,
} from "lucide-react";
import api from "@/lib/api";

const TABLE_PAGE_SIZES = [20, 50, 100, 300];

interface TurnoverSettings {
    id?: number;
    rate: number;
    minTurnover: number;
    maxReward: number;
    isActive: boolean;
}

interface EligibilityRow {
    id: number;
    userId: number;
    statDate: string;
    periodStart: string;
    periodEnd: string;
    rewardAmount: number;
    turnover: number;
    isClaimed: boolean;
    claimedAt?: string | null;
    user: {
        username?: string;
        fullName?: string;
        phone?: string;
    };
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

    const [rows, setRows] = useState<EligibilityRow[]>([]);
    const [rowsTotal, setRowsTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [search, setSearch] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    const [loadingRows, setLoadingRows] = useState(false);

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
            console.error("Fetch commission settings error:", error);
            toast.error("ดึงข้อมูลไม่สำเร็จ");
        } finally {
            setLoadingSettings(false);
        }
    };

    const fetchRows = async () => {
        try {
            setLoadingRows(true);
            const params = new URLSearchParams({
                type: "COMMISSION",
                status: "UNCLAIMED",
                page: page.toString(),
                limit: pageSize.toString(),
            });

            if (selectedDate) {
                params.append("date", selectedDate);
            }

            if (search.trim()) {
                params.append("search", search.trim());
            }

            const res = await api.get(`/admin/rewards/eligibility?${params.toString()}`);
            if (res.data.success) {
                setRows(res.data.data || []);
                setRowsTotal(Number(res.data.pagination?.total || 0));
                if (res.data.selectedDate && !selectedDate) {
                    setSelectedDate(toDateInputValue(res.data.selectedDate));
                }
            }
        } catch (error) {
            console.error("Fetch commission pending rows error:", error);
        } finally {
            setLoadingRows(false);
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
            console.error("Save commission settings error:", error);
            toast.error("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setSaving(false);
        }
    };

    const handleSearch = () => {
        if (page !== 1) {
            setPage(1);
            return;
        }
        fetchRows();
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
        fetchRows();
    }, [page, pageSize, selectedDate]);

    const totalPages = Math.ceil(rowsTotal / pageSize);

    if (loadingSettings) {
        return <div className="p-6 text-center">กำลังโหลด...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">ตั้งค่าคอมมิชชั่น (Turnover Rebate)</h2>
                    <p className="mt-1 text-sm text-slate-500">แสดงรายชื่อสมาชิกที่มียอดค่าคอมให้กดรับ แต่ยังไม่ได้กดรับ</p>
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
                        <label className="mb-2 block text-sm font-medium text-slate-700">เปอร์เซ็นต์คืนค่าคอม (%)</label>
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
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">ยอดเทิร์นขั้นต่ำ (บาท)</label>
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
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                            <Search size={20} className="text-blue-500" />
                            รายชื่อคนที่ยังไม่ได้กดรับค่าคอม
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            แสดงเฉพาะสมาชิกที่มีค่าคอมค้างรับของรอบวันที่เลือก
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(event) => {
                                setSelectedDate(event.target.value);
                                setPage(1);
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="ค้นหา username/เบอร์โทร"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
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
                            value={pageSize}
                            onChange={(event) => {
                                setPageSize(parseInt(event.target.value, 10));
                                setPage(1);
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

                {loadingRows ? (
                    <div className="py-8 text-center text-slate-500">กำลังโหลด...</div>
                ) : rows.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">ไม่พบรายการค่าคอมค้างรับ</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 text-left">
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">#</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">Username/เบอร์โทร</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">ชื่อ</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">ยอดเทิร์น</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">ค่าคอมที่รับได้</th>
                                        <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">รอบวันที่</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {rows.map((row, index) => (
                                        <tr key={row.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-sm text-slate-500">
                                                {(page - 1) * pageSize + index + 1}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-slate-800">
                                                {row.user?.username || row.user?.phone}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{row.user?.fullName || "-"}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{formatMoney(row.turnover)} ฿</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-green-600">
                                                {formatMoney(row.rewardAmount)} ฿
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-500">{formatDate(row.periodStart)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                            <div className="text-sm text-slate-500">
                                แสดง {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, rowsTotal)} จาก {rowsTotal} รายการ
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                                    disabled={page <= 1}
                                    className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="text-sm text-slate-600">หน้า {page} / {totalPages || 1}</span>
                                <button
                                    onClick={() => setPage((current) => Math.min(totalPages || 1, current + 1))}
                                    disabled={page >= totalPages}
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

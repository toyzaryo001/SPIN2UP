"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { CalendarDays, Flame, RefreshCw, Save, ShieldCheck, Trophy } from "lucide-react";

interface StreakLevel {
    id?: number;
    day: number;
    minDeposit: number;
    bonusAmount: number;
    requiresTurnover?: boolean;
    turnoverMultiplier?: number;
    isActive: boolean;
}

export default function StreakSettingsPage() {
    const [settings, setSettings] = useState<StreakLevel[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [adminPermissions, setAdminPermissions] = useState<any>(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    const hasPerm = (action: string) => {
        if (isSuperAdmin) return true;
        const permission = adminPermissions?.activities?.[action];
        if (!permission) return false;
        if (typeof permission === "boolean") return permission;
        return !!permission.manage;
    };

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/activities/streak");
            if (res.data.success) {
                setSettings(res.data.data || []);
            }
        } catch (error) {
            console.error("Fetch streak settings error:", error);
            toast.error("โหลดข้อมูลฝากต่อเนื่องไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = (day: number, field: keyof StreakLevel, value: number | boolean) => {
        setSettings((current) => current.map((item) => (
            item.day === day ? { ...item, [field]: value } : item
        )));
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            for (const item of settings) {
                await api.put(`/admin/activities/streak/${item.day}`, {
                    minDeposit: Number(item.minDeposit || 0),
                    bonusAmount: Number(item.bonusAmount || 0),
                    requiresTurnover: !!item.requiresTurnover,
                    turnoverMultiplier: Number(item.turnoverMultiplier || 1),
                    isActive: item.isActive,
                });
            }

            toast.success("บันทึกภารกิจฝากต่อเนื่อง 30 วันสำเร็จ");
            await fetchSettings();
        } catch (error) {
            console.error("Save streak settings error:", error);
            toast.error("บันทึกข้อมูลไม่สำเร็จ");
        } finally {
            setSaving(false);
        }
    };

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

        void fetchAdminData();
        void fetchSettings();
    }, []);

    const activeCount = useMemo(
        () => settings.filter((item) => item.isActive).length,
        [settings]
    );
    const totalConfiguredBonus = useMemo(
        () => settings.reduce((sum, item) => sum + Number(item.bonusAmount || 0), 0),
        [settings]
    );

    if (loading) {
        return <div className="p-6 text-center">กำลังโหลด...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
                        <Flame className="text-orange-500" />
                        ตั้งค่าฝากต่อเนื่อง 30 วัน
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        กำหนดโบนัสรายวันตั้งแต่วันที่ 1 ถึงวันที่ 30 โดยระบบจะนับเฉพาะวันที่ฝากถึงขั้นต่ำตามเวลาประเทศไทย
                    </p>
                </div>
                <Link href="/activities" className="text-sm text-blue-500 hover:underline">
                    ← กลับ
                </Link>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-orange-100 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_100%)] p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">รูปแบบการนับ</p>
                    <h3 className="mt-2 flex items-center gap-2 text-lg font-black text-slate-900">
                        <CalendarDays size={18} className="text-orange-500" />
                        ฝากต่อเนื่องรายวัน
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                        ถ้าวันใดฝากไม่ถึงขั้นต่ำ สตรีคจะหยุดและต้องเริ่มนับใหม่จากวันถัดไปที่ฝากถึงเงื่อนไข
                    </p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_100%)] p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">ใช้งานอยู่</p>
                    <h3 className="mt-2 text-3xl font-black text-slate-900">{activeCount} วัน</h3>
                    <p className="mt-2 text-sm text-slate-600">
                        ระบบเตรียมวันให้ครบ 30 วันเสมอ คุณสามารถปิดวันใดก็ได้หากยังไม่ต้องการแจกโบนัสวันนั้น
                    </p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-[linear-gradient(135deg,#fffbeb_0%,#ffffff_100%)] p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">โบนัสรวมที่ตั้งไว้</p>
                    <h3 className="mt-2 flex items-center gap-2 text-3xl font-black text-slate-900">
                        <Trophy size={22} className="text-amber-500" />
                        ฿{totalConfiguredBonus.toLocaleString()}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                        ผู้เล่นจะได้โบนัสวันนั้นทันทีหลังฝากสำเร็จ ถ้ายังไม่เคยได้รับของวันเดียวกันในวันนั้น
                    </p>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                    <h3 className="text-lg font-bold text-slate-900">ตารางโบนัสฝากต่อเนื่อง</h3>
                    <p className="mt-1 text-sm text-slate-500">แก้ขั้นต่ำการฝาก โบนัส เทิร์น และสถานะเปิดใช้งานของแต่ละวันได้จากตารางเดียว</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50">
                            <tr className="text-left text-sm font-semibold text-slate-600">
                                <th className="px-5 py-4">วันที่</th>
                                <th className="px-5 py-4">ฝากขั้นต่ำ / วัน</th>
                                <th className="px-5 py-4">โบนัส</th>
                                <th className="px-5 py-4 text-center">ติดเทิร์น</th>
                                <th className="px-5 py-4">เทิร์น (เท่า)</th>
                                <th className="px-5 py-4 text-center">เปิดใช้งาน</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {settings.map((item) => (
                                <tr key={item.day} className="align-top hover:bg-slate-50/60">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white ${item.day >= 30 ? "bg-[linear-gradient(135deg,#f97316_0%,#ef4444_100%)]" : item.day >= 20 ? "bg-[linear-gradient(135deg,#8b5cf6_0%,#6366f1_100%)]" : item.day >= 10 ? "bg-[linear-gradient(135deg,#3b82f6_0%,#06b6d4_100%)]" : "bg-[linear-gradient(135deg,#64748b_0%,#475569_100%)]"}`}>
                                                {item.day}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">วันที่ {item.day}</p>
                                                <p className="text-xs text-slate-400">ภารกิจรายวันลำดับที่ {item.day}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <input
                                            type="number"
                                            value={item.minDeposit}
                                            disabled={!hasPerm("streak")}
                                            onChange={(e) => handleUpdate(item.day, "minDeposit", parseFloat(e.target.value) || 0)}
                                            className="w-36 rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100 disabled:text-slate-500"
                                        />
                                    </td>
                                    <td className="px-5 py-4">
                                        <input
                                            type="number"
                                            value={item.bonusAmount}
                                            disabled={!hasPerm("streak")}
                                            onChange={(e) => handleUpdate(item.day, "bonusAmount", parseFloat(e.target.value) || 0)}
                                            className="w-32 rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100 disabled:text-slate-500"
                                        />
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <label className="inline-flex cursor-pointer items-center">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={item.requiresTurnover || false}
                                                disabled={!hasPerm("streak")}
                                                onChange={(e) => handleUpdate(item.day, "requiresTurnover", e.target.checked)}
                                            />
                                            <div className="relative h-6 w-11 rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-sky-500 peer-checked:after:translate-x-full" />
                                        </label>
                                    </td>
                                    <td className="px-5 py-4">
                                        {item.requiresTurnover ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={item.turnoverMultiplier ?? 1}
                                                    disabled={!hasPerm("streak")}
                                                    onChange={(e) => handleUpdate(item.day, "turnoverMultiplier", parseFloat(e.target.value) || 0)}
                                                    className="w-28 rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-500"
                                                />
                                                <p className="flex items-center gap-1 text-xs text-slate-400">
                                                    <ShieldCheck size={12} />
                                                    คูณเทิร์นจากโบนัสวันนั้น
                                                </p>
                                            </div>
                                        ) : (
                                            <span className="text-sm italic text-slate-400">ไม่ต้องทำเทิร์น</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <label className="inline-flex cursor-pointer items-center">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={item.isActive}
                                                disabled={!hasPerm("streak")}
                                                onChange={(e) => handleUpdate(item.day, "isActive", e.target.checked)}
                                            />
                                            <div className="relative h-6 w-11 rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-emerald-500 peer-checked:after:translate-x-full" />
                                        </label>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={fetchSettings}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    <RefreshCw size={18} />
                    รีเซ็ต
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !hasPerm("streak")}
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Save size={18} />
                    {saving ? "กำลังบันทึก..." : "บันทึกทั้งหมด"}
                </button>
            </div>
        </div>
    );
}

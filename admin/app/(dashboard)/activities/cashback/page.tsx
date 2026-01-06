"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Settings, Save, RefreshCw } from "lucide-react";
import Link from "next/link";

const DAYS = [
    { value: 0, label: "อาทิตย์" },
    { value: 1, label: "จันทร์" },
    { value: 2, label: "อังคาร" },
    { value: 3, label: "พุธ" },
    { value: 4, label: "พฤหัสบดี" },
    { value: 5, label: "ศุกร์" },
    { value: 6, label: "เสาร์" },
];

interface CashbackSettings {
    id?: number;
    rate: number;
    minLoss: number;
    maxCashback: number;
    dayOfWeek: number;
    isActive: boolean;
}

export default function CashbackSettingsPage() {
    const [settings, setSettings] = useState<CashbackSettings>({
        rate: 5,
        minLoss: 100,
        maxCashback: 10000,
        dayOfWeek: 1,
        isActive: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/activities/cashback");
            if (res.data.success) {
                setSettings(res.data.data);
            }
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const res = await api.put("/admin/activities/cashback", settings);
            if (res.data.success) {
                setMessage({ type: "success", text: "บันทึกสำเร็จ" });
            }
        } catch (error) {
            setMessage({ type: "error", text: "เกิดข้อผิดพลาด" });
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    if (loading) {
        return <div className="p-6 text-center">กำลังโหลด...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">ตั้งค่ายอดเสีย (Cashback)</h2>
                    <p className="text-slate-500 text-sm mt-1">กำหนดเงื่อนไขการคืนยอดเสียให้ผู้เล่น</p>
                </div>
                <Link href="/activities" className="text-blue-500 hover:underline text-sm">
                    ← กลับ
                </Link>
            </div>

            {message && (
                <div className={`p-4 rounded-lg ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {message.text}
                </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            เปอร์เซ็นต์คืนยอดเสีย (%)
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            value={settings.rate}
                            onChange={(e) => setSettings({ ...settings, rate: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400"
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
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400"
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
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            วันที่รับได้
                        </label>
                        <select
                            value={settings.dayOfWeek}
                            onChange={(e) => setSettings({ ...settings, dayOfWeek: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400"
                        >
                            {DAYS.map((day) => (
                                <option key={day.value} value={day.value}>
                                    {day.label}
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
        </div>
    );
}

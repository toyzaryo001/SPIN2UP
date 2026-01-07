"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Flame, Save, RefreshCw } from "lucide-react";
import Link from "next/link";

interface StreakDay {
    id?: number;
    day: number;
    minDeposit: number;
    bonusAmount: number;
    isActive: boolean;
}

export default function StreakSettingsPage() {
    const [settings, setSettings] = useState<StreakDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/activities/streak");
            if (res.data.success) {
                setSettings(res.data.data);
            }
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = (day: number, field: keyof StreakDay, value: number | boolean) => {
        setSettings(prev =>
            prev.map(s => s.day === day ? { ...s, [field]: value } : s)
        );
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            for (const item of settings) {
                await api.put(`/admin/activities/streak/${item.day}`, {
                    minDeposit: item.minDeposit,
                    bonusAmount: item.bonusAmount,
                    isActive: item.isActive
                });
            }
            setMessage({ type: "success", text: "บันทึกสำเร็จ" });
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
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Flame className="text-orange-500" />
                        ตั้งค่าฝากสะสม (Streak)
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">กำหนดโบนัสสำหรับการฝากต่อเนื่อง 7 วัน</p>
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

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">วันที่</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">ฝากขั้นต่ำ (บาท)</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">โบนัส (บาท)</th>
                            <th className="px-6 py-4 text-center text-sm font-semibold text-slate-600">เปิดใช้งาน</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {settings.map((item) => (
                            <tr key={item.day} className="hover:bg-slate-50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${item.day === 7 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-slate-400'
                                            }`}>
                                            {item.day}
                                        </div>
                                        <span className="font-medium">วันที่ {item.day}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <input
                                        type="number"
                                        value={item.minDeposit}
                                        onChange={(e) => handleUpdate(item.day, 'minDeposit', parseFloat(e.target.value) || 0)}
                                        className="w-32 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 text-slate-900"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <input
                                        type="number"
                                        value={item.bonusAmount}
                                        onChange={(e) => handleUpdate(item.day, 'bonusAmount', parseFloat(e.target.value) || 0)}
                                        className="w-32 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 text-slate-900"
                                    />
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={item.isActive}
                                            onChange={(e) => handleUpdate(item.day, 'isActive', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                                    </label>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex gap-3">
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
                    {saving ? "กำลังบันทึก..." : "บันทึกทั้งหมด"}
                </button>
            </div>
        </div>
    );
}

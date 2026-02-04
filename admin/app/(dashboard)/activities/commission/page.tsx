"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Settings, Save, RefreshCw } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface TurnoverSettings {
    id?: number;
    rate: number;
    minTurnover: number;
    maxReward: number;
    isActive: boolean;
}

export default function CommissionSettingsPage() {
    const [settings, setSettings] = useState<TurnoverSettings>({
        rate: 0.5,
        minTurnover: 100,
        maxReward: 10000,
        isActive: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/rewards/settings/turnover");
            if (res.data.success) {
                setSettings(res.data.data);
            }
        } catch (error) {
            console.error("Fetch error:", error);
            toast.error("ดึงข้อมูลไม่สำเร็จ");
        } finally {
            setLoading(false);
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

    useEffect(() => {
        fetchSettings();
    }, []);

    if (loading) {
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
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            เปอร์เซ็นต์คืนค่าคอม (%)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={settings.rate}
                            onChange={(e) => setSettings({ ...settings, rate: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 text-slate-900"
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
                            onChange={(e) => setSettings({ ...settings, minTurnover: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 text-slate-900"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            คืนสูงสุด (บาท)
                        </label>
                        <input
                            type="number"
                            value={settings.maxReward}
                            onChange={(e) => setSettings({ ...settings, maxReward: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 text-slate-900"
                        />
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

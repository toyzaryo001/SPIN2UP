"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Save } from "lucide-react";

export default function SettingsPage() {
    const [settings, setSettings] = useState<any>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get("/admin/settings");
            if (res.data.success) {
                setSettings(res.data.data);
            }
        } catch (error) {
            console.error("Fetch settings error:", error);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put("/admin/settings", settings);
            alert("บันทึกการตั้งค่าสำเร็จ");
        } catch (error) {
            console.error("Save settings error:", error);
            alert("เกิดข้อผิดพลาด");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (key: string, value: string) => {
        setSettings((prev: any) => ({ ...prev, [key]: value }));
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">ตั้งค่าระบบทั่วไป</h2>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 max-w-2xl">
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-700 border-b pb-2 mb-4">ข้อมูลเว็บไซต์</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อเว็บไซต์</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                    value={settings.siteName || ""}
                                    onChange={(e) => handleChange("siteName", e.target.value)}
                                    placeholder="เช่น PLAYNEX89 CASINO"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Prefix (สำหรับ Username)</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg uppercase"
                                    value={settings.prefix || ""}
                                    onChange={(e) => handleChange("prefix", e.target.value.toUpperCase())}
                                    placeholder="เช่น SPIN"
                                    maxLength={10}
                                />
                                <p className="text-xs text-slate-400 mt-1">ใช้สร้าง Username: PREFIX + เบอร์โทร 6 ตัวท้าย</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4">
                        <h3 className="font-bold text-slate-700 border-b pb-2 mb-4">ข้อกำหนดการเงิน</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ฝากขั้นต่ำ (บาท)</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                    value={settings.minDeposit || "1"}
                                    onChange={(e) => handleChange("minDeposit", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ถอนขั้นต่ำ (บาท)</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                    value={settings.minWithdraw || "100"}
                                    onChange={(e) => handleChange("minWithdraw", e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ถอนสูงสุดต่อครั้ง (บาท)</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                    value={settings.maxWithdrawPerTime || "50000"}
                                    onChange={(e) => handleChange("maxWithdrawPerTime", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนครั้งถอนต่อวัน</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                    value={settings.maxWithdrawPerDay || "5"}
                                    onChange={(e) => handleChange("maxWithdrawPerDay", e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h3 className="font-bold text-slate-700 border-b pb-2 mb-4">ตั้งค่าระบบ (System)</h3>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">JWT Secret Key</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono"
                                    value={settings.jwtSecret || ""}
                                    onChange={(e) => handleChange("jwtSecret", e.target.value)}
                                    placeholder="ใส่ Secret Key สำหรับ JWT Token"
                                />
                                <p className="text-xs text-slate-400 mt-1">ใช้สำหรับเข้ารหัส Token ควรเป็นค่าที่ยาวและปลอดภัย</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">API URL</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                    value={settings.apiUrl || ""}
                                    onChange={(e) => handleChange("apiUrl", e.target.value)}
                                    placeholder="https://api.yourdomain.com"
                                />
                                <p className="text-xs text-slate-400 mt-1">URL ของ Backend API</p>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save size={20} />
                                {loading ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

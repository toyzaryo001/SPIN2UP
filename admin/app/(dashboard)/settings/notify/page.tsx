"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Bell, Save } from "lucide-react";
import toast from "react-hot-toast";

export default function NotifySettingsPage() {
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
            toast.success("บันทึกสำเร็จ");
        } catch (error) {
            console.error("Save error:", error);
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (key: string, value: string | boolean) => {
        setSettings((prev: any) => ({ ...prev, [key]: value }));
    };

    const testTelegram = async () => {
        try {
            await api.post("/admin/settings/test-telegram");
            toast.success("ส่งข้อความทดสอบสำเร็จ!");
        } catch (error) {
            toast.error("ไม่สามารถส่งได้ กรุณาตรวจสอบ Token และ Chat ID");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Bell size={20} className="text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">ตั้งค่าการแจ้งเตือน</h2>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 max-w-2xl">
                <form onSubmit={handleSave} className="space-y-6">
                    {/* LINE Notification */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-700 border-b pb-2">LINE Notification</h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">LINE Notify Token</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono text-sm text-slate-900"
                                value={settings.lineNotifyToken || ""}
                                onChange={(e) => handleChange("lineNotifyToken", e.target.value)}
                                placeholder="ใส่ LINE Notify Token"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="lineNotifyDeposit"
                                checked={settings.lineNotifyDeposit === 'true' || settings.lineNotifyDeposit === true}
                                onChange={(e) => handleChange("lineNotifyDeposit", e.target.checked.toString())}
                                className="w-5 h-5 rounded"
                            />
                            <label htmlFor="lineNotifyDeposit" className="text-sm text-slate-700">แจ้งเตือนเมื่อมีฝากเงิน</label>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="lineNotifyWithdraw"
                                checked={settings.lineNotifyWithdraw === 'true' || settings.lineNotifyWithdraw === true}
                                onChange={(e) => handleChange("lineNotifyWithdraw", e.target.checked.toString())}
                                className="w-5 h-5 rounded"
                            />
                            <label htmlFor="lineNotifyWithdraw" className="text-sm text-slate-700">แจ้งเตือนเมื่อมีถอนเงิน</label>
                        </div>
                    </div>

                    {/* Telegram Notification */}
                    <div className="space-y-4 pt-4">
                        <h3 className="font-bold text-slate-700 border-b pb-2">Telegram Notification</h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Bot Token</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono text-sm text-slate-900"
                                value={settings.telegramBotToken || ""}
                                onChange={(e) => handleChange("telegramBotToken", e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Chat ID</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono text-sm text-slate-900"
                                value={settings.telegramChatId || ""}
                                onChange={(e) => handleChange("telegramChatId", e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="telegramNotifyDeposit"
                                checked={settings.telegramNotifyDeposit === 'true' || settings.telegramNotifyDeposit === true}
                                onChange={(e) => handleChange("telegramNotifyDeposit", e.target.checked.toString())}
                                className="w-5 h-5 rounded"
                            />
                            <label htmlFor="telegramNotifyDeposit" className="text-sm text-slate-700">แจ้งเตือนเมื่อมีฝากเงิน</label>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="telegramNotifyWithdraw"
                                checked={settings.telegramNotifyWithdraw === 'true' || settings.telegramNotifyWithdraw === true}
                                onChange={(e) => handleChange("telegramNotifyWithdraw", e.target.checked.toString())}
                                className="w-5 h-5 rounded"
                            />
                            <label htmlFor="telegramNotifyWithdraw" className="text-sm text-slate-700">แจ้งเตือนเมื่อมีถอนเงิน</label>
                        </div>
                        <button
                            type="button"
                            onClick={testTelegram}
                            className="px-4 py-2 border border-blue-500 text-blue-500 rounded-lg text-sm hover:bg-blue-50"
                        >
                            ทดสอบส่ง Telegram
                        </button>
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
                </form>
            </div>
        </div>
    );
}

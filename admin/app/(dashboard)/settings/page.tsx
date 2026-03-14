"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Save, RefreshCw, Upload, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
    const [settings, setSettings] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    const [adminPermissions, setAdminPermissions] = useState<any>(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    const hasPerm = (action: string) => {
        if (isSuperAdmin) return true;
        const p = adminPermissions?.['settings']?.[action];
        if (!p) return false;
        if (typeof p === 'boolean') return p;
        return !!p.manage;
    };

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const res = await api.get('/admin/me');
                if (res.data.success && res.data.data) {
                    setAdminPermissions(res.data.data.permissions || {});
                    setIsSuperAdmin(res.data.data.isSuperAdmin === true || res.data.data.role?.name === 'SUPER_ADMIN');
                }
            } catch (error) { console.error(error); }
        };
        fetchAdminData();
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
            toast.success("บันทึกการตั้งค่าสำเร็จ");
        } catch (error) {
            console.error("Save settings error:", error);
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (key: string, value: string) => {
        setSettings((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("กรุณาเลือกไฟล์รูปภาพ");
            e.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("ไฟล์ต้องมีขนาดไม่เกิน 5MB");
            e.target.value = "";
            return;
        }

        setUploadingLogo(true);
        try {
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const base64 = reader.result as string;
                    const res = await api.post("/admin/upload", {
                        image: base64,
                        folder: "site-logos"
                    });

                    if (res.data.success) {
                        handleChange("logoUrl", res.data.data.url);
                        toast.success("อัปโหลดโลโก้สำเร็จ");
                    }
                } catch (error: any) {
                    toast.error(error.response?.data?.message || "อัปโหลดโลโก้ไม่สำเร็จ");
                } finally {
                    setUploadingLogo(false);
                }
            };
            reader.onerror = () => {
                toast.error("อ่านไฟล์ไม่สำเร็จ");
                setUploadingLogo(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            toast.error("เกิดข้อผิดพลาด");
            setUploadingLogo(false);
        }

        e.target.value = "";
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
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                                    value={settings.siteName || ""}
                                    onChange={(e) => handleChange("siteName", e.target.value)}
                                    disabled={!hasPerm('general')}
                                    placeholder="เช่น PLAYNEX89 CASINO"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Logo URL</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                                    value={settings.logoUrl || ""}
                                    onChange={(e) => handleChange("logoUrl", e.target.value)}
                                    disabled={!hasPerm('general')}
                                    placeholder="https://example.com/logo.png"
                                />
                                <p className="text-xs text-slate-400 mt-1">ลิงก์รูปภาพโลโก้ (ถ้ามีจะแสดงแทนชื่อเว็บ)</p>
                                <div className="mt-3 space-y-3">
                                    {settings.logoUrl ? (
                                        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                            <img
                                                src={settings.logoUrl}
                                                alt="Site logo preview"
                                                className="h-14 w-14 rounded-lg border border-slate-200 bg-white object-contain p-1"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-slate-700">แสดงตัวอย่างโลโก้ปัจจุบัน</p>
                                                <p className="truncate text-xs text-slate-400">{settings.logoUrl}</p>
                                            </div>
                                            {hasPerm('general') && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleChange("logoUrl", "")}
                                                    className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                                                    title="ลบโลโก้"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ) : null}

                                    <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${uploadingLogo ? "border-yellow-300 bg-yellow-50 text-yellow-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"} ${!hasPerm('general') ? "cursor-not-allowed opacity-50" : ""}`}>
                                        {uploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                        {uploadingLogo ? "กำลังอัปโหลด..." : "อัปโหลดโลโก้"}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleLogoUpload}
                                            disabled={!hasPerm('general') || uploadingLogo}
                                        />
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Prefix (สำหรับ Username)</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg uppercase text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                                    value={settings.prefix || ""}
                                    onChange={(e) => handleChange("prefix", e.target.value.toUpperCase())}
                                    disabled={!hasPerm('general')}
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
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                                    value={settings.minDeposit || "1"}
                                    onChange={(e) => handleChange("minDeposit", e.target.value)}
                                    disabled={!hasPerm('general')}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ถอนขั้นต่ำ (บาท)</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                                    value={settings.minWithdraw || "100"}
                                    onChange={(e) => handleChange("minWithdraw", e.target.value)}
                                    disabled={!hasPerm('general')}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ถอนสูงสุดต่อครั้ง (บาท)</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                                    value={settings.maxWithdrawPerTime || "50000"}
                                    onChange={(e) => handleChange("maxWithdrawPerTime", e.target.value)}
                                    disabled={!hasPerm('general')}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนครั้งถอนต่อวัน</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                                    value={settings.maxWithdrawPerDay || "5"}
                                    onChange={(e) => handleChange("maxWithdrawPerDay", e.target.value)}
                                    disabled={!hasPerm('general')}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h3 className="font-bold text-slate-700 border-b pb-2 mb-4">ตั้งค่าระบบ (System)</h3>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">JWT Secret Key</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                                        value={settings.jwtSecret || ""}
                                        onChange={(e) => handleChange("jwtSecret", e.target.value)}
                                        disabled={!hasPerm('general')}
                                        placeholder="ใส่ Secret Key สำหรับ JWT Token"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!hasPerm('general')) return;
                                            const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
                                                .map(b => b.toString(16).padStart(2, '0'))
                                                .join('');
                                            handleChange("jwtSecret", secret);
                                        }}
                                        disabled={!hasPerm('general')}
                                        className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg transition-colors border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Generate Random Key"
                                    >
                                        <RefreshCw size={18} />
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">ใช้สำหรับเข้ารหัส Token (กดปุ่มเพื่อสุ่มค่าใหม่ให้ปลอดภัยที่สุด)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">API URL</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                                    value={settings.apiUrl || ""}
                                    onChange={(e) => handleChange("apiUrl", e.target.value)}
                                    disabled={!hasPerm('general')}
                                    placeholder="https://api.yourdomain.com"
                                />
                                <p className="text-xs text-slate-400 mt-1">URL ของ Backend API</p>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={loading || !hasPerm('general')}
                                className="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

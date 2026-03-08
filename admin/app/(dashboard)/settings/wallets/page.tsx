"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Save, Plus, Trash2, Wallet, Copy, Eye, EyeOff, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";

interface TrueMoneyWallet {
    id: number;
    phoneNumber: string;
    accountName: string;
    jwtSecret: string | null;
    hasSecret: boolean;
    webhookUrl: string;
    isActive: boolean;
}

export default function WalletsSettingsPage() {
    const [wallets, setWallets] = useState<TrueMoneyWallet[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showSecret, setShowSecret] = useState(false);
    const [form, setForm] = useState({ phoneNumber: "", accountName: "", jwtSecret: "" });

    const [adminPermissions, setAdminPermissions] = useState<any>(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    const hasPerm = (action: string) => {
        if (isSuperAdmin) return true;
        const p = adminPermissions?.[action];
        if (!p) return false;
        if (typeof p === 'boolean') return p;
        return !!p.manage;
    };

    const fetchWallets = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/settings/truemoney");
            setWallets(res.data.data || []);
        } catch {
            toast.error("โหลดข้อมูลวอลเล็ทไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
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
        fetchWallets();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.phoneNumber || !form.accountName) {
            toast.error("กรุณากรอกข้อมูลให้ครบ");
            return;
        }
        try {
            if (editingId) {
                await api.put(`/admin/settings/truemoney/${editingId}`, form);
                toast.success("อัปเดตวอลเล็ทสำเร็จ");
            } else {
                await api.post("/admin/settings/truemoney", form);
                toast.success("เพิ่มวอลเล็ทสำเร็จ");
            }
            setShowForm(false);
            setEditingId(null);
            setForm({ phoneNumber: "", accountName: "", jwtSecret: "" });
            fetchWallets();
        } catch {
            toast.error("บันทึกไม่สำเร็จ");
        }
    };

    const handleEdit = (wallet: TrueMoneyWallet) => {
        setForm({
            phoneNumber: wallet.phoneNumber,
            accountName: wallet.accountName,
            jwtSecret: "", // ไม่แสดง secret เดิม — ต้องกรอกใหม่ถ้าจะเปลี่ยน
        });
        setEditingId(wallet.id);
        setShowForm(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("ต้องการลบวอลเล็ทนี้?")) return;
        try {
            await api.delete(`/admin/settings/truemoney/${id}`);
            toast.success("ลบสำเร็จ");
            fetchWallets();
        } catch {
            toast.error("ลบไม่สำเร็จ");
        }
    };

    const handleToggle = async (wallet: TrueMoneyWallet) => {
        try {
            await api.put(`/admin/settings/truemoney/${wallet.id}`, { isActive: !wallet.isActive });
            toast.success(wallet.isActive ? "ปิดวอลเล็ท" : "เปิดวอลเล็ท");
            fetchWallets();
        } catch {
            toast.error("อัปเดตไม่สำเร็จ");
        }
    };

    const copyWebhookUrl = (url: string) => {
        navigator.clipboard.writeText(url);
        toast.success("คัดลอก Webhook URL แล้ว");
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Wallet className="w-6 h-6 text-blue-400" />
                        ตั้งค่า TrueMoney Wallet
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        ผูกวอลเล็ทสำหรับรับฝากเงินอัตโนมัติ — ใส่ JWT Secret ที่ได้จาก TrueWallet Webhook
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchWallets} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-1">
                        <RefreshCw className="w-4 h-4" /> รีเฟรช
                    </button>
                    <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ phoneNumber: "", accountName: "", jwtSecret: "" }); }}
                        disabled={!hasPerm('banks')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Plus className="w-4 h-4" /> เพิ่มวอลเล็ท
                    </button>
                </div>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">
                        {editingId ? "แก้ไขวอลเล็ท" : "เพิ่มวอลเล็ทใหม่"}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-300 mb-1">เบอร์โทรศัพท์</label>
                                <input type="text" value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
                                    placeholder="0812345678" className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-300 mb-1">ชื่อบัญชี</label>
                                <input type="text" value={form.accountName} onChange={e => setForm(f => ({ ...f, accountName: e.target.value }))}
                                    placeholder="ชื่อ นามสกุล" className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">JWT Secret (จาก TrueWallet Webhook)</label>
                            <div className="relative">
                                <input type={showSecret ? "text" : "password"} value={form.jwtSecret}
                                    onChange={e => setForm(f => ({ ...f, jwtSecret: e.target.value }))}
                                    placeholder={editingId ? "ปล่อยว่างถ้าไม่ต้องการเปลี่ยน" : "วางคีย์ที่ได้จาก TrueWallet"}
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white pr-10" />
                                <button type="button" onClick={() => setShowSecret(!showSecret)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">สำคัญ: ใส่ Secret ที่ได้รับหลังตั้งค่า Webhook ที่ TrueWallet เพื่อ verify ว่าข้อมูลมาจาก TrueWallet จริง</p>
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" disabled={!hasPerm('banks')} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
                                <Save className="w-4 h-4" /> {editingId ? "อัปเดต" : "บันทึก"}
                            </button>
                            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm">ยกเลิก</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Wallet List */}
            {loading ? (
                <div className="text-center text-gray-400 py-12">กำลังโหลด...</div>
            ) : wallets.length === 0 ? (
                <div className="text-center text-gray-500 py-12 bg-gray-800/50 rounded-xl border border-gray-700">
                    ยังไม่มีวอลเล็ท — กดปุ่ม "เพิ่มวอลเล็ท" เพื่อเริ่มต้น
                </div>
            ) : (
                <div className="space-y-4">
                    {wallets.map(wallet => (
                        <div key={wallet.id} className={`bg-gray-800 border rounded-xl p-5 ${wallet.isActive ? "border-gray-700" : "border-red-900/50 opacity-60"}`}>
                            <div className="flex items-start justify-between">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                                            <Wallet className="w-5 h-5 text-orange-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white">{wallet.accountName}</h3>
                                            <p className="text-sm text-gray-400">{wallet.phoneNumber}</p>
                                        </div>
                                        {wallet.isActive ? (
                                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> เปิดใช้งาน
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-1">
                                                <XCircle className="w-3 h-3" /> ปิดใช้งาน
                                            </span>
                                        )}
                                    </div>

                                    {/* JWT Secret Status */}
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-400">JWT Secret:</span>
                                        {wallet.hasSecret ? (
                                            <span className="text-green-400 font-mono text-xs bg-green-500/10 px-2 py-0.5 rounded">
                                                {wallet.jwtSecret} ✓
                                            </span>
                                        ) : (
                                            <span className="text-yellow-400 text-xs">⚠️ ยังไม่ได้ตั้งค่า</span>
                                        )}
                                    </div>

                                    {/* Webhook URL */}
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-400">Webhook URL:</span>
                                        <code className="text-xs text-blue-300 bg-gray-900 px-2 py-1 rounded font-mono">
                                            {wallet.webhookUrl}
                                        </code>
                                        <button onClick={() => copyWebhookUrl(wallet.webhookUrl)}
                                            className="text-gray-400 hover:text-white" title="คัดลอก">
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button onClick={() => handleToggle(wallet)}
                                        disabled={!hasPerm('banks')}
                                        className={`px-3 py-1.5 text-xs rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${wallet.isActive ? "bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30" : "bg-green-600/20 text-green-400 hover:bg-green-600/30"}`}>
                                        {wallet.isActive ? "ปิด" : "เปิด"}
                                    </button>
                                    <button onClick={() => handleEdit(wallet)}
                                        disabled={!hasPerm('banks')}
                                        className="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">แก้ไข</button>
                                    <button onClick={() => handleDelete(wallet.id)}
                                        disabled={!hasPerm('banks')}
                                        className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 text-xs rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Info Box */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-2">📋 วิธีตั้งค่า</h3>
                <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                    <li>เพิ่มวอลเล็ทโดยกรอกเบอร์โทรและชื่อบัญชี</li>
                    <li>ไปที่ TrueWallet → ตั้งค่า Webhook URL เป็น URL ที่แสดงด้านบน</li>
                    <li>หลังตั้งค่า จะได้ <strong className="text-yellow-400">JWT Secret</strong> กลับมา → นำมาใส่ในช่อง Secret</li>
                    <li>ระบบจะรับการแจ้งเตือนและฝากเงินให้ลูกค้าอัตโนมัติ</li>
                </ol>
            </div>
        </div>
    );
}

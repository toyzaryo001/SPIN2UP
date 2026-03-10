"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Smartphone, Plus, Edit2, Trash2, X, Save, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

interface TrueMoneyWallet {
    id: number;
    phoneNumber: string;
    accountName: string;
    isActive: boolean;
    isShow?: boolean;
    jwtSecret?: string | null;
    hasSecret?: boolean;
    webhookUrl?: string;
    minDeposit?: number;
}

export default function TrueMoneyPage() {
    const [wallets, setWallets] = useState<TrueMoneyWallet[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingWallet, setEditingWallet] = useState<TrueMoneyWallet | null>(null);
    const [deletingWallet, setDeletingWallet] = useState<TrueMoneyWallet | null>(null);

    const [formData, setFormData] = useState({ phoneNumber: "", accountName: "", isActive: true, isShow: true, jwtSecret: "", minDeposit: 0 });
    const [isSaving, setIsSaving] = useState(false);
    const [showSecret, setShowSecret] = useState(false);

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
        fetchWallets();
    }, []);

    const fetchWallets = async () => {
        try {
            const res = await api.get("/admin/settings/truemoney");
            if (res.data.success) setWallets(res.data.data);
        } catch (error) {
            console.error("Fetch truemoney error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const openModal = (wallet?: TrueMoneyWallet) => {
        if (wallet) {
            setEditingWallet(wallet);
            setFormData({ phoneNumber: wallet.phoneNumber, accountName: wallet.accountName, isActive: wallet.isActive, isShow: wallet.isShow ?? true, jwtSecret: "", minDeposit: wallet.minDeposit || 0 });
        } else {
            setEditingWallet(null);
            setFormData({ phoneNumber: "", accountName: "", isActive: true, isShow: true, jwtSecret: "", minDeposit: 0 });
        }
        setShowSecret(false);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.phoneNumber || !formData.accountName) {
            toast.error("กรุณากรอกข้อมูลให้ครบ");
            return;
        }
        setIsSaving(true);
        try {
            if (editingWallet) {
                const submissionData = { ...formData };
                // ถ้าแก้ไข และ ไม่ได้กรอก jwtSecret ใหม่ ให้ลบออกก่อนส่ง จะได้ไม่ทับของเดิม
                if (!submissionData.jwtSecret) {
                    delete (submissionData as any).jwtSecret;
                }
                await api.put(`/admin/settings/truemoney/${editingWallet.id}`, submissionData);
            } else {
                await api.post("/admin/settings/truemoney", formData);
            }
            setIsModalOpen(false);
            fetchWallets();
        } catch (error) {
            console.error("Save error:", error);
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingWallet) return;
        try {
            await api.delete(`/admin/settings/truemoney/${deletingWallet.id}`);
            setIsDeleteModalOpen(false);
            fetchWallets();
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    const handleToggleStatus = async (wallet: TrueMoneyWallet) => {
        try {
            const newStatus = !wallet.isActive;
            await api.put(`/admin/settings/truemoney/${wallet.id}`, { ...wallet, isActive: newStatus });
            setWallets(wallets.map(w => w.id === wallet.id ? { ...w, isActive: newStatus } : w));
            toast.success(`เปลี่ยนสถานะรับยอดเป็น ${newStatus ? 'เปิด' : 'ปิด'}`);
        } catch (error) {
            console.error("Toggle error:", error);
            toast.error("เปลี่ยนสถานะไม่สำเร็จ");
            fetchWallets();
        }
    };

    const handleToggleShow = async (wallet: TrueMoneyWallet) => {
        try {
            const newShow = !(wallet.isShow ?? true);
            await api.put(`/admin/settings/truemoney/${wallet.id}`, { ...wallet, isShow: newShow });
            setWallets(wallets.map(w => w.id === wallet.id ? { ...w, isShow: newShow } : w));
            toast.success(`เปลี่ยนสถานะโชว์หน้าเว็บเป็น ${newShow ? 'เปิด' : 'ปิด'}`);
        } catch (error) {
            console.error("Toggle show error:", error);
            toast.error("เปลี่ยนสถานะไม่สำเร็จ");
            fetchWallets();
        }
    };

    const copyWebhookUrl = (url?: string) => {
        if (!url) return;
        navigator.clipboard.writeText(url);
        toast.success("คัดลอก Webhook URL แล้ว");
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                        <Smartphone size={20} className="text-orange-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">จัดการ TrueMoney Wallet</h2>
                </div>
                <button onClick={() => openModal()} disabled={!hasPerm('banks')} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Plus size={18} /> เพิ่ม Wallet
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                                <th className="px-6 py-4">บัญชีรับเงิน</th>
                                <th className="px-6 py-4">เบอร์โทร / ชื่อบัญชี</th>
                                <th className="px-6 py-4">Webhook URL</th>
                                <th className="px-6 py-4">การเชื่อมต่อ</th>
                                <th className="px-6 py-4 text-center">โชว์หน้าเว็บ</th>
                                <th className="px-6 py-4 text-center">รับยอดออโต้</th>
                                <th className="px-6 py-4 text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        กำลังโหลด...
                                    </td>
                                </tr>
                            ) : wallets.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        ยังไม่มี TrueMoney Wallet
                                    </td>
                                </tr>
                            ) : (
                                wallets.map((wallet) => (
                                    <tr key={wallet.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-orange-50 rounded-lg p-1.5 border border-slate-100 flex-shrink-0 flex items-center justify-center">
                                                    <Smartphone size={24} className="text-orange-600" />
                                                </div>
                                                <span className="font-semibold text-slate-800">TrueMoney</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-mono text-slate-900 font-medium text-base">{wallet.phoneNumber}</span>
                                                <span className="text-slate-500 text-xs">{wallet.accountName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 max-w-[200px]">
                                                <code className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded truncate border border-blue-100 flex-1">
                                                    {wallet.webhookUrl || '-'}
                                                </code>
                                                {wallet.webhookUrl && (
                                                    <button onClick={() => copyWebhookUrl(wallet.webhookUrl)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded font-medium transition-colors whitespace-nowrap">
                                                        คัดลอก
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {wallet.hasSecret ? (
                                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                    ✓ มี Auth Key
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                                                    ⚠️ ขาด Auth Key
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleToggleShow(wallet)}
                                                disabled={!hasPerm('banks')}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${(wallet.isShow ?? true) ? 'bg-blue-500' : 'bg-slate-200'
                                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                title={(wallet.isShow ?? true) ? "แสดงบนหน้าฝากเงินผู้เล่น" : "ซ่อนจากหน้าฝากเงินผู้เล่น"}
                                            >
                                                <span className={`${(wallet.isShow ?? true) ? 'translate-x-6' : 'translate-x-1'
                                                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleToggleStatus(wallet)}
                                                disabled={!hasPerm('banks')}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${wallet.isActive ? 'bg-emerald-500' : 'bg-slate-200'
                                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                title={wallet.isActive ? "ระบบจะปรับยอดให้อัตโนมัติ" : "ปิดการปรับยอดอัตโนมัติ"}
                                            >
                                                <span className={`${wallet.isActive ? 'translate-x-6' : 'translate-x-1'
                                                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openModal(wallet)}
                                                    disabled={!hasPerm('banks')}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="แก้ไข"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => { setDeletingWallet(wallet); setIsDeleteModalOpen(true); }}
                                                    disabled={!hasPerm('banks')}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="ลบ"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">{editingWallet ? 'แก้ไข Wallet' : 'เพิ่ม Wallet'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทร *</label>
                                <input type="text" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} placeholder="0812345678" className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อบัญชี *</label>
                                <input type="text" value={formData.accountName} onChange={(e) => setFormData({ ...formData, accountName: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ฝากขั้นต่ำ</label>
                                <input type="number" min="0" step="0.01" value={formData.minDeposit} onChange={(e) => setFormData({ ...formData, minDeposit: Number(e.target.value) })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                            </div>
                            {editingWallet ? (
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
                                        Webhook Authorization Key
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showSecret ? "text" : "password"}
                                            value={formData.jwtSecret}
                                            onChange={(e) => setFormData({ ...formData, jwtSecret: e.target.value })}
                                            placeholder="วาง Authorization Key ที่ได้จาก TrueWallet"
                                            className="w-full px-4 py-2 pr-28 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowSecret(!showSecret)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                                        >
                                            {showSecret ? 'ซ่อน' : 'แสดง'}
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">
                                        * นำ Authorization Key ล่าสุดที่ได้จาก TrueWallet มาใส่ในช่องนี้
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-orange-50 border border-orange-100 p-3 rounded-lg">
                                    <p className="text-xs text-orange-700 font-medium">
                                        💡 วิธีการตั้งค่า Webhook (หลังกดบันทึก)
                                    </p>
                                    <ol className="text-xs text-orange-600 mt-1 list-decimal list-inside space-y-1">
                                        <li>กดบันทึกเพื่อเพิ่ม Wallet ใหม่ก่อน</li>
                                        <li>นำ Webhook URL ของ Wallet ที่ได้ไปตั้งค่าในแอป TrueWallet</li>
                                        <li>ได้ Authorization Key มาแล้ว ให้กลับมากด "แก้ไข" เพื่อใส่ Key</li>
                                    </ol>
                                </div>
                            )}
                            <div className="flex flex-col gap-3 pt-2">
                                <div className="flex items-center">
                                    <input type="checkbox" id="walletShow" checked={formData.isShow} onChange={(e) => setFormData({ ...formData, isShow: e.target.checked })} className="w-5 h-5 rounded text-blue-500 focus:ring-blue-500" />
                                    <div className="ml-2">
                                        <label htmlFor="walletShow" className="text-sm font-medium text-slate-700 cursor-pointer">โชว์หน้าเว็บ</label>
                                        <p className="text-xs text-slate-500">แสดงบัญชีนี้ในหน้าฝากเงินของฝั่งผู้เล่น</p>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <input type="checkbox" id="walletActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-5 h-5 rounded text-emerald-500 focus:ring-emerald-500" />
                                    <div className="ml-2">
                                        <label htmlFor="walletActive" className="text-sm font-medium text-slate-700 cursor-pointer">เปิดรับยอดออโต้</label>
                                        <p className="text-xs text-slate-500">ระบบจะทำการตรวจสอบและปรับยอดให้อัตโนมัติ (ควรเปิดไว้เสมอ)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">ยกเลิก</button>
                            <button onClick={handleSave} disabled={isSaving} className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2">
                                <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteModalOpen && deletingWallet && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="text-red-500" size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">ยืนยันการลบ</h3>
                            <p className="text-slate-500 mb-6">คุณต้องการลบ Wallet นี้ใช่หรือไม่?</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">ยกเลิก</button>
                            <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">ลบ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Smartphone, Plus, Edit, Trash2, X, Save, AlertTriangle } from "lucide-react";

interface TrueMoneyWallet {
    id: number;
    phoneNumber: string;
    accountName: string;
    isActive: boolean;
}

export default function TrueMoneyPage() {
    const [wallets, setWallets] = useState<TrueMoneyWallet[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingWallet, setEditingWallet] = useState<TrueMoneyWallet | null>(null);
    const [deletingWallet, setDeletingWallet] = useState<TrueMoneyWallet | null>(null);

    const [formData, setFormData] = useState({ phoneNumber: "", accountName: "", isActive: true });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
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
            setFormData({ phoneNumber: wallet.phoneNumber, accountName: wallet.accountName, isActive: wallet.isActive });
        } else {
            setEditingWallet(null);
            setFormData({ phoneNumber: "", accountName: "", isActive: true });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.phoneNumber || !formData.accountName) {
            alert("กรุณากรอกข้อมูลให้ครบ");
            return;
        }
        setIsSaving(true);
        try {
            if (editingWallet) {
                await api.put(`/admin/settings/truemoney/${editingWallet.id}`, formData);
            } else {
                await api.post("/admin/settings/truemoney", formData);
            }
            setIsModalOpen(false);
            fetchWallets();
        } catch (error) {
            console.error("Save error:", error);
            alert("เกิดข้อผิดพลาด");
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                        <Smartphone size={20} className="text-orange-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">จัดการ TrueMoney Wallet</h2>
                </div>
                <button onClick={() => openModal()} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800">
                    <Plus size={18} /> เพิ่ม Wallet
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full text-center py-12 text-slate-400">กำลังโหลด...</div>
                ) : wallets.length === 0 ? (
                    <div className="col-span-full bg-white p-12 rounded-xl border border-slate-100 text-center text-slate-400">
                        <Smartphone size={48} className="mx-auto mb-4 opacity-20" />
                        <p>ยังไม่มี TrueMoney Wallet</p>
                    </div>
                ) : (
                    wallets.map(wallet => (
                        <div key={wallet.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                                    <Smartphone size={24} className="text-orange-600" />
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${wallet.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {wallet.isActive ? 'ใช้งาน' : 'ปิด'}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">{wallet.phoneNumber}</h3>
                            <p className="text-slate-500 mt-1">{wallet.accountName}</p>
                            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                                <button onClick={() => openModal(wallet)} className="p-2 hover:bg-slate-100 rounded text-slate-500"><Edit size={16} /></button>
                                <button onClick={() => { setDeletingWallet(wallet); setIsDeleteModalOpen(true); }} className="p-2 hover:bg-red-50 rounded text-red-500"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))
                )}
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
                                <input type="text" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} placeholder="0812345678" className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อบัญชี *</label>
                                <input type="text" value={formData.accountName} onChange={(e) => setFormData({ ...formData, accountName: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900" />
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" id="walletActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-5 h-5 rounded" />
                                <label htmlFor="walletActive" className="ml-2 text-sm font-medium text-slate-700">เปิดใช้งาน</label>
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

"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Plus, Edit2, Trash2, X, Save, Image, AlertTriangle, ToggleLeft, ToggleRight } from "lucide-react";
import toast from "react-hot-toast";

interface Promotion {
    id: number;
    name: string;
    description?: string;
    type: string;
    value: number;
    minDeposit?: number;
    maxBonus?: number;
    turnover?: number;
    image?: string;
    isActive: boolean;
}

export default function PromotionsPage() {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
    const [deletingPromo, setDeletingPromo] = useState<Promotion | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        type: "PERCENT",
        value: "",
        minDeposit: "",
        maxBonus: "",
        turnover: "",
        isActive: true
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchPromotions();
    }, []);

    const fetchPromotions = async () => {
        try {
            const res = await api.get("/admin/promotions");
            if (res.data.success) {
                setPromotions(res.data.data);
            }
        } catch (error) {
            console.error("Fetch promotions error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingPromo(null);
        setFormData({ name: "", description: "", type: "PERCENT", value: "", minDeposit: "", maxBonus: "", turnover: "", isActive: true });
        setIsModalOpen(true);
    };

    const openEditModal = (promo: Promotion) => {
        setEditingPromo(promo);
        setFormData({
            name: promo.name,
            description: promo.description || "",
            type: promo.type,
            value: promo.value.toString(),
            minDeposit: promo.minDeposit?.toString() || "",
            maxBonus: promo.maxBonus?.toString() || "",
            turnover: promo.turnover?.toString() || "",
            isActive: promo.isActive
        });
        setIsModalOpen(true);
    };

    const openDeleteModal = (promo: Promotion) => {
        setDeletingPromo(promo);
        setIsDeleteModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error("กรุณากรอกชื่อโปรโมชั่น");
            return;
        }
        setIsSaving(true);
        try {
            const payload = {
                ...formData,
                value: Number(formData.value) || 0,
                minDeposit: Number(formData.minDeposit) || 0,
                maxBonus: Number(formData.maxBonus) || 0,
                turnover: Number(formData.turnover) || 1
            };

            if (editingPromo) {
                await api.put(`/admin/promotions/${editingPromo.id}`, payload);
            } else {
                await api.post("/admin/promotions", payload);
            }
            setIsModalOpen(false);
            fetchPromotions();
        } catch (error: any) {
            if (error.response?.status === 403) {
                toast.error("คุณไม่มีสิทธิ์ในการดำเนินการนี้");
            } else {
                console.error("Save error:", error);
                toast.error(error.response?.data?.message || "เกิดข้อผิดพลาด");
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingPromo) return;
        try {
            await api.delete(`/admin/promotions/${deletingPromo.id}`);
            setIsDeleteModalOpen(false);
            fetchPromotions();
        } catch (error: any) {
            if (error.response?.status === 403) {
                toast.error("คุณไม่มีสิทธิ์ในการลบโปรโมชั่น");
            } else {
                console.error("Delete error:", error);
                toast.error(error.response?.data?.message || "ไม่สามารถลบได้");
            }
        }
    };

    const toggleStatus = async (promo: Promotion) => {
        try {
            await api.patch(`/admin/promotions/${promo.id}/toggle`);
            fetchPromotions();
        } catch (error: any) {
            if (error.response?.status === 403) {
                toast.error("คุณไม่มีสิทธิ์ในการเปลี่ยนสถานะ");
            } else {
                console.error("Toggle error:", error);
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">จัดการโปรโมชั่น</h2>
                <button
                    onClick={openCreateModal}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 font-medium"
                >
                    <Plus size={20} />
                    เพิ่มโปรโมชั่น
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-slate-400">กำลังโหลด...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {promotions.length === 0 ? (
                        <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-100 text-slate-400">
                            <p>ยังไม่มีโปรโมชั่น</p>
                            <button onClick={openCreateModal} className="mt-2 text-yellow-600 font-medium hover:underline">+ เพิ่มโปรโมชั่นใหม่</button>
                        </div>
                    ) : (
                        promotions.map((promo) => (
                            <div key={promo.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                                <div className="h-40 bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-center text-slate-400 relative">
                                    {promo.image ? (
                                        <img src={promo.image} alt={promo.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <Image size={40} className="text-amber-300" />
                                            <span className="text-sm text-amber-400 mt-2">No Image</span>
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3">
                                        <button
                                            onClick={() => toggleStatus(promo)}
                                            className={`p-1 rounded-full ${promo.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
                                        >
                                            {promo.isActive ? <ToggleRight size={24} className="text-white" /> : <ToggleLeft size={24} className="text-white" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg text-slate-800">{promo.name}</h3>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${promo.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                                            {promo.isActive ? 'เปิด' : 'ปิด'}
                                        </span>
                                    </div>
                                    <p className="text-slate-500 text-sm mb-2 line-clamp-2">{promo.description || 'ไม่มีคำอธิบาย'}</p>
                                    <div className="text-sm text-slate-600 mb-4">
                                        <span className="font-bold text-yellow-600">
                                            {promo.type === 'PERCENT' ? `${promo.value}%` : `฿${promo.value}`}
                                        </span>
                                        {promo.maxBonus && <span className="text-slate-400"> (สูงสุด ฿{promo.maxBonus})</span>}
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-slate-100 flex justify-end gap-2">
                                        <button onClick={() => openEditModal(promo)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => openDeleteModal(promo)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">{editingPromo ? 'แก้ไขโปรโมชั่น' : 'เพิ่มโปรโมชั่นใหม่'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อโปรโมชั่น</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">คำอธิบาย</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg resize-none text-slate-900"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ประเภท</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900"
                                    >
                                        <option value="PERCENT">เปอร์เซ็นต์ (%)</option>
                                        <option value="FIXED">จำนวนเงินคงที่</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ค่าโปร</label>
                                    <input
                                        type="number"
                                        value={formData.value}
                                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                        placeholder={formData.type === 'PERCENT' ? 'เช่น 100' : 'เช่น 50'}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ฝากขั้นต่ำ</label>
                                    <input
                                        type="number"
                                        value={formData.minDeposit}
                                        onChange={(e) => setFormData({ ...formData, minDeposit: e.target.value })}
                                        placeholder="0"
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">โบนัสสูงสุด</label>
                                    <input
                                        type="number"
                                        value={formData.maxBonus}
                                        onChange={(e) => setFormData({ ...formData, maxBonus: e.target.value })}
                                        placeholder="0"
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">เทิร์นโอเวอร์</label>
                                    <input
                                        type="number"
                                        value={formData.turnover}
                                        onChange={(e) => setFormData({ ...formData, turnover: e.target.value })}
                                        placeholder="1"
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-300 text-yellow-500"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">เปิดใช้งานโปรโมชั่น</label>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Save size={18} />
                                {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && deletingPromo && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="text-red-500" size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">ยืนยันการลบ</h3>
                            <p className="text-slate-500 mb-6">
                                คุณต้องการลบโปรโมชั่น <strong>{deletingPromo.name}</strong> ใช่หรือไม่?
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                                ลบ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

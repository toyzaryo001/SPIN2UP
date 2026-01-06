"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Layers, Plus, Edit, Trash2, X, Save, ToggleLeft, ToggleRight, GripVertical } from "lucide-react";

interface Category {
    id: number;
    name: string;
    slug: string;
    icon?: string;
    description?: string;
    isActive: boolean;
    sortOrder: number;
    _count: { providers: number };
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Category | null>(null);
    const [formData, setFormData] = useState({ name: "", slug: "", icon: "", description: "", isActive: true });
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState<Category | null>(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const res = await api.get("/admin/categories");
            if (res.data.success) setCategories(res.data.data);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const openModal = (item?: Category) => {
        if (item) {
            setEditingItem(item);
            setFormData({ name: item.name, slug: item.slug, icon: item.icon || "", description: item.description || "", isActive: item.isActive });
        } else {
            setEditingItem(null);
            setFormData({ name: "", slug: "", icon: "", description: "", isActive: true });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const payload = { ...formData, slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-') };
            if (editingItem) {
                await api.put(`/admin/categories/${editingItem.id}`, payload);
            } else {
                await api.post("/admin/categories", payload);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) { alert("เกิดข้อผิดพลาด"); }
    };

    const toggle = async (id: number, isActive: boolean) => {
        try {
            await api.patch(`/admin/categories/${id}`, { isActive: !isActive });
            fetchData();
        } catch (error) { console.error(error); }
    };

    const confirmDelete = (item: Category) => {
        setDeletingItem(item);
        setIsDeleteOpen(true);
    };

    const handleDelete = async () => {
        if (!deletingItem) return;
        try {
            await api.delete(`/admin/categories/${deletingItem.id}`);
            setIsDeleteOpen(false);
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.message || "ไม่สามารถลบได้");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                        <Layers size={20} className="text-violet-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">หมวดหมู่เกม</h2>
                        <p className="text-sm text-slate-500">สล็อต, คาสิโน, ยิงปลา, กีฬา</p>
                    </div>
                </div>
                <button onClick={() => openModal()} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800">
                    <Plus size={18} /> เพิ่มหมวดหมู่
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-4 text-left w-12"></th>
                            <th className="px-6 py-4 text-left">หมวดหมู่</th>
                            <th className="px-6 py-4 text-left">Slug</th>
                            <th className="px-6 py-4 text-center">ค่ายเกม</th>
                            <th className="px-6 py-4 text-center">สถานะ</th>
                            <th className="px-6 py-4 text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">กำลังโหลด...</td></tr>
                        ) : categories.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">ยังไม่มีหมวดหมู่</td></tr>
                        ) : (
                            categories.map(cat => (
                                <tr key={cat.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4"><GripVertical size={16} className="text-slate-300 cursor-grab" /></td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {cat.icon && <span className="text-xl">{cat.icon}</span>}
                                            <span className="font-medium">{cat.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{cat.slug}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-2 py-1 bg-slate-100 rounded text-xs">{cat._count.providers} ค่าย</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => toggle(cat.id, cat.isActive)}>
                                            {cat.isActive ? <ToggleRight size={24} className="text-emerald-500" /> : <ToggleLeft size={24} className="text-slate-300" />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => openModal(cat)} className="p-2 hover:bg-slate-100 rounded"><Edit size={16} /></button>
                                        <button onClick={() => confirmDelete(cat)} className="p-2 hover:bg-red-50 rounded text-red-500"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">{editingItem ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">ชื่อหมวดหมู่ *</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Slug</label>
                                    <input type="text" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg" placeholder="auto" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">ไอคอน (Emoji)</label>
                                    <input type="text" value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg" placeholder="🎰" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">คำอธิบาย</label>
                                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" id="catActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-5 h-5 rounded" />
                                <label htmlFor="catActive" className="ml-2 text-sm">เปิดใช้งาน</label>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">ยกเลิก</button>
                            <button onClick={handleSave} className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center justify-center gap-2"><Save size={18} /> บันทึก</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteOpen && deletingItem && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="text-red-500" size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">ยืนยันการลบ</h3>
                        <p className="text-slate-500 mb-6">ลบหมวดหมู่ "{deletingItem.name}"?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setIsDeleteOpen(false)} className="flex-1 px-4 py-2 border rounded-lg">ยกเลิก</button>
                            <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg">ลบ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

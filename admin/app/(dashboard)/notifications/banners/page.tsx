"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Megaphone, Plus, Edit, Trash2, X, Save, AlertTriangle, Image } from "lucide-react";

interface Banner {
    id: number;
    title: string;
    image: string;
    link?: string;
    sortOrder: number;
    isActive: boolean;
}

export default function BannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
    const [deletingBanner, setDeletingBanner] = useState<Banner | null>(null);

    const [formData, setFormData] = useState({ title: "", image: "", link: "", sortOrder: "0", isActive: true });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        try {
            const res = await api.get("/admin/banners");
            if (res.data.success) setBanners(res.data.data);
        } catch (error) {
            console.error("Fetch banners error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const openModal = (banner?: Banner) => {
        if (banner) {
            setEditingBanner(banner);
            setFormData({ title: banner.title || "", image: banner.image, link: banner.link || "", sortOrder: banner.sortOrder.toString(), isActive: banner.isActive });
        } else {
            setEditingBanner(null);
            setFormData({ title: "", image: "", link: "", sortOrder: "0", isActive: true });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const payload = { ...formData, sortOrder: parseInt(formData.sortOrder) };
            if (editingBanner) {
                await api.put(`/admin/banners/${editingBanner.id}`, payload);
            } else {
                await api.post("/admin/banners", payload);
            }
            setIsModalOpen(false);
            fetchBanners();
        } catch (error) {
            console.error("Save error:", error);
            alert("เกิดข้อผิดพลาด");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingBanner) return;
        try {
            await api.delete(`/admin/banners/${deletingBanner.id}`);
            setIsDeleteModalOpen(false);
            fetchBanners();
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Megaphone size={20} className="text-purple-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">จัดการแบนเนอร์</h2>
                </div>
                <button onClick={() => openModal()} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800">
                    <Plus size={18} /> เพิ่มแบนเนอร์
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full text-center py-12 text-slate-400">กำลังโหลด...</div>
                ) : banners.length === 0 ? (
                    <div className="col-span-full bg-white p-12 rounded-xl border border-slate-100 text-center text-slate-400">
                        <Image size={48} className="mx-auto mb-4 opacity-20" />
                        <p>ยังไม่มีแบนเนอร์</p>
                    </div>
                ) : (
                    banners.map(banner => (
                        <div key={banner.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="h-40 bg-slate-100 relative">
                                {banner.image ? (
                                    <img src={banner.image} alt={banner.title || ''} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300"><Image size={48} /></div>
                                )}
                                <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs ${banner.isActive ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'}`}>
                                    {banner.isActive ? 'แสดง' : 'ซ่อน'}
                                </span>
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-slate-700">{banner.title || '(ไม่มีชื่อ)'}</h3>
                                <p className="text-xs text-slate-400 mt-1">ลำดับ: {banner.sortOrder}</p>
                                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                                    <button onClick={() => openModal(banner)} className="p-2 hover:bg-slate-100 rounded text-slate-500"><Edit size={16} /></button>
                                    <button onClick={() => { setDeletingBanner(banner); setIsDeleteModalOpen(true); }} className="p-2 hover:bg-red-50 rounded text-red-500"><Trash2 size={16} /></button>
                                </div>
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
                            <h3 className="text-xl font-bold">{editingBanner ? 'แก้ไขแบนเนอร์' : 'เพิ่มแบนเนอร์'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ/หัวข้อ</label>
                                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">URL รูปภาพ *</label>
                                <input type="text" value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} placeholder="https://..." className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Link (ถ้ามี)</label>
                                <input type="text" value={formData.link} onChange={(e) => setFormData({ ...formData, link: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ลำดับ</label>
                                    <input type="number" value={formData.sortOrder} onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900" />
                                </div>
                                <div className="flex items-center pt-6">
                                    <input type="checkbox" id="bannerActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-5 h-5 rounded" />
                                    <label htmlFor="bannerActive" className="ml-2 text-sm font-medium text-slate-700">แสดงผล</label>
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
            {isDeleteModalOpen && deletingBanner && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="text-red-500" size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">ยืนยันการลบ</h3>
                            <p className="text-slate-500 mb-6">คุณต้องการลบแบนเนอร์นี้ใช่หรือไม่?</p>
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

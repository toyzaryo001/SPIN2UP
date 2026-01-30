"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Megaphone, Plus, Edit, Trash2, X, Save, AlertTriangle, Image } from "lucide-react";
import toast from "react-hot-toast";

interface Banner {
    id: number;
    title: string;
    image: string;
    link?: string;
    sortOrder: number;
    isActive: boolean;
    position?: string; // TOP, SIDE
}

export default function BannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'TOP' | 'SIDE'>('TOP'); // 'TOP' = Large, 'SIDE' = Small

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
    const [deletingBanner, setDeletingBanner] = useState<Banner | null>(null);

    const [formData, setFormData] = useState({ title: "", image: "", link: "", sortOrder: "0", isActive: true, position: 'TOP' });
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
            setFormData({
                title: banner.title || "",
                image: banner.image,
                link: banner.link || "",
                sortOrder: banner.sortOrder.toString(),
                isActive: banner.isActive,
                position: banner.position || 'TOP'
            });
        } else {
            setEditingBanner(null);
            setFormData({ title: "", image: "", link: "", sortOrder: "0", isActive: true, position: activeTab });
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
            toast.error("เกิดข้อผิดพลาด");
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

    // Filter banners based on active Tab
    const filteredBanners = banners.filter(b => (b.position || 'TOP') === activeTab);

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

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('TOP')}
                    className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'TOP' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    แบนเนอร์ใหญ่ (Slide)
                </button>
                <button
                    onClick={() => setActiveTab('SIDE')}
                    className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'SIDE' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    แบนเนอร์เล็ก (ข้าง/ล่าง)
                </button>
            </div>

            {/* Table View */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                            <tr>
                                <th className="px-6 py-4 font-medium">รูปภาพ</th>
                                <th className="px-6 py-4 font-medium">ชื่อ/หัวข้อ</th>
                                <th className="px-6 py-4 font-medium">ลิงก์</th>
                                <th className="px-6 py-4 font-medium text-center">ลำดับ</th>
                                <th className="px-6 py-4 font-medium text-center">สถานะ</th>
                                <th className="px-6 py-4 font-medium text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">กำลังโหลด...</td>
                                </tr>
                            ) : filteredBanners.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        <Image size={32} className="mx-auto mb-2 opacity-20" />
                                        <p>ไม่มีข้อมูลแบนเนอร์ในส่วนนี้</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredBanners.map(banner => (
                                    <tr key={banner.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="w-24 h-14 bg-slate-100 rounded overflow-hidden border border-slate-200">
                                                {banner.image ? (
                                                    <img src={banner.image} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-slate-300"><Image size={20} /></div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 font-medium text-slate-700">{banner.title || '-'}</td>
                                        <td className="px-6 py-3 text-slate-500 truncate max-w-[150px]">{banner.link || '-'}</td>
                                        <td className="px-6 py-3 text-center">{banner.sortOrder}</td>
                                        <td className="px-6 py-3 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs ${banner.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                {banner.isActive ? 'แสดง' : 'ซ่อน'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => openModal(banner)} className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-500 transition-all shadow-sm hover:shadow"><Edit size={16} /></button>
                                                <button onClick={() => { setDeletingBanner(banner); setIsDeleteModalOpen(true); }} className="p-2 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg text-red-500 transition-all shadow-sm hover:shadow"><Trash2 size={16} /></button>
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
                            <h3 className="text-xl font-bold">{editingBanner ? 'แก้ไขแบนเนอร์' : 'เพิ่มแบนเนอร์'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            {/* Position Selector */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">ตำแหน่งแบนเนอร์</label>
                                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, position: 'TOP' })}
                                        className={`py-2 text-sm font-medium rounded-md transition-all ${formData.position === 'TOP' ? 'bg-white text-purple-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        แบนเนอร์ใหญ่
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, position: 'SIDE' })}
                                        className={`py-2 text-sm font-medium rounded-md transition-all ${formData.position === 'SIDE' ? 'bg-white text-purple-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        แบนเนอร์เล็ก
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ/หัวข้อ</label>
                                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:border-purple-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">URL รูปภาพ *</label>
                                <input type="text" value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} placeholder="https://..." className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:border-purple-500 outline-none" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Link (ถ้ามี)</label>
                                <input type="text" value={formData.link} onChange={(e) => setFormData({ ...formData, link: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:border-purple-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ลำดับ</label>
                                    <input type="number" value={formData.sortOrder} onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:border-purple-500 outline-none" />
                                </div>
                                <div className="flex items-center pt-6">
                                    <input type="checkbox" id="bannerActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500" />
                                    <label htmlFor="bannerActive" className="ml-2 text-sm font-medium text-slate-700 cursor-pointer">แสดงผล</label>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">ยกเลิก</button>
                            <button onClick={handleSave} disabled={isSaving} className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-slate-900/20">
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

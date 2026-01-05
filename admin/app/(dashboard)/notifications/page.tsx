"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Bell, Megaphone, Plus, Edit, Trash2, X, Save, AlertTriangle, Image, Type } from "lucide-react";

interface Banner {
    id: number;
    title: string;
    imageUrl: string;
    link?: string;
    sortOrder: number;
    isActive: boolean;
}

interface Announcement {
    id: number;
    type: 'POPUP' | 'MARQUEE';
    content: string;
    isActive: boolean;
}

export default function NotificationsPage() {
    const [activeTab, setActiveTab] = useState("banners");
    const [banners, setBanners] = useState<Banner[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);

    // Modal states
    const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
    const [deletingItem, setDeletingItem] = useState<{ type: string; id: number; name: string } | null>(null);

    // Form states
    const [bannerForm, setBannerForm] = useState({ title: "", imageUrl: "", link: "", sortOrder: "0", isActive: true });
    const [announcementForm, setAnnouncementForm] = useState({ type: "MARQUEE", content: "", isActive: true });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchBanners();
        fetchAnnouncements();
    }, []);

    const fetchBanners = async () => {
        try {
            const res = await api.get("/admin/banners");
            if (res.data.success) setBanners(res.data.data);
        } catch (error) {
            console.error("Fetch banners error:", error);
        }
    };

    const fetchAnnouncements = async () => {
        try {
            const res = await api.get("/admin/banners/announcements");
            if (res.data.success) setAnnouncements(res.data.data);
        } catch (error) {
            console.error("Fetch announcements error:", error);
        }
    };

    // Banner Modal handlers
    const openBannerModal = (banner?: Banner) => {
        if (banner) {
            setEditingBanner(banner);
            setBannerForm({ title: banner.title, imageUrl: banner.imageUrl, link: banner.link || "", sortOrder: banner.sortOrder.toString(), isActive: banner.isActive });
        } else {
            setEditingBanner(null);
            setBannerForm({ title: "", imageUrl: "", link: "", sortOrder: "0", isActive: true });
        }
        setIsBannerModalOpen(true);
    };

    const handleSaveBanner = async () => {
        setIsSaving(true);
        try {
            const payload = { ...bannerForm, sortOrder: parseInt(bannerForm.sortOrder) };
            if (editingBanner) {
                await api.put(`/admin/banners/${editingBanner.id}`, payload);
            } else {
                await api.post("/admin/banners", payload);
            }
            setIsBannerModalOpen(false);
            fetchBanners();
        } catch (error) {
            console.error("Save banner error:", error);
            alert("เกิดข้อผิดพลาด");
        } finally {
            setIsSaving(false);
        }
    };

    // Announcement Modal handlers
    const openAnnouncementModal = (announcement?: Announcement) => {
        if (announcement) {
            setEditingAnnouncement(announcement);
            setAnnouncementForm({ type: announcement.type, content: announcement.content, isActive: announcement.isActive });
        } else {
            setEditingAnnouncement(null);
            setAnnouncementForm({ type: "MARQUEE", content: "", isActive: true });
        }
        setIsAnnouncementModalOpen(true);
    };

    const handleSaveAnnouncement = async () => {
        setIsSaving(true);
        try {
            if (editingAnnouncement) {
                await api.put(`/admin/banners/announcements/${editingAnnouncement.id}`, announcementForm);
            } else {
                await api.post("/admin/banners/announcements", announcementForm);
            }
            setIsAnnouncementModalOpen(false);
            fetchAnnouncements();
        } catch (error) {
            console.error("Save announcement error:", error);
            alert("เกิดข้อผิดพลาด");
        } finally {
            setIsSaving(false);
        }
    };

    // Delete handlers
    const openDeleteModal = (type: string, id: number, name: string) => {
        setDeletingItem({ type, id, name });
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!deletingItem) return;
        try {
            if (deletingItem.type === 'banner') {
                await api.delete(`/admin/banners/${deletingItem.id}`);
                fetchBanners();
            } else {
                await api.delete(`/admin/banners/announcements/${deletingItem.id}`);
                fetchAnnouncements();
            }
            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error("Delete error:", error);
            alert("ไม่สามารถลบได้");
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">แจ้งเตือน & ประกาศ</h2>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab("banners")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "banners"
                        ? "border-yellow-500 text-yellow-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                >
                    <div className="flex items-center gap-2"><Megaphone size={16} /> แบนเนอร์ (Banner)</div>
                </button>
                <button
                    onClick={() => setActiveTab("announcements")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "announcements"
                        ? "border-yellow-500 text-yellow-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                >
                    <div className="flex items-center gap-2"><Type size={16} /> ประกาศ (Popup/Marquee)</div>
                </button>
            </div>

            {/* Banners Tab */}
            {activeTab === "banners" && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button onClick={() => openBannerModal()} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800">
                            <Plus size={18} /> เพิ่มแบนเนอร์
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {banners.length === 0 ? (
                            <div className="col-span-full bg-white p-12 rounded-xl border border-slate-100 text-center text-slate-400">
                                <Image size={48} className="mx-auto mb-4 opacity-20" />
                                <p>ยังไม่มีแบนเนอร์</p>
                            </div>
                        ) : (
                            banners.map(banner => (
                                <div key={banner.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                                    <div className="h-40 bg-slate-100 relative">
                                        {banner.imageUrl ? (
                                            <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300"><Image size={48} /></div>
                                        )}
                                        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs ${banner.isActive ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'}`}>
                                            {banner.isActive ? 'แสดง' : 'ซ่อน'}
                                        </span>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold text-slate-700">{banner.title}</h3>
                                        <p className="text-xs text-slate-400 mt-1">ลำดับ: {banner.sortOrder}</p>
                                        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                                            <button onClick={() => openBannerModal(banner)} className="p-2 hover:bg-slate-100 rounded text-slate-500"><Edit size={16} /></button>
                                            <button onClick={() => openDeleteModal('banner', banner.id, banner.title)} className="p-2 hover:bg-red-50 rounded text-red-500"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Announcements Tab */}
            {activeTab === "announcements" && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button onClick={() => openAnnouncementModal()} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800">
                            <Plus size={18} /> เพิ่มประกาศ
                        </button>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        {announcements.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <Bell size={48} className="mx-auto mb-4 opacity-20" />
                                <p>ยังไม่มีประกาศ</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-medium">
                                    <tr>
                                        <th className="px-6 py-4 text-left">ประเภท</th>
                                        <th className="px-6 py-4 text-left">ข้อความ</th>
                                        <th className="px-6 py-4 text-center">สถานะ</th>
                                        <th className="px-6 py-4 text-center">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {announcements.map(ann => (
                                        <tr key={ann.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs ${ann.type === 'POPUP' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {ann.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-700 max-w-md truncate">{ann.content}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-0.5 rounded text-xs ${ann.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {ann.isActive ? 'เปิด' : 'ปิด'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={() => openAnnouncementModal(ann)} className="p-2 hover:bg-slate-100 rounded text-slate-500"><Edit size={16} /></button>
                                                <button onClick={() => openDeleteModal('announcement', ann.id, ann.content.substring(0, 20))} className="p-2 hover:bg-red-50 rounded text-red-500"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Banner Modal */}
            {isBannerModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">{editingBanner ? 'แก้ไขแบนเนอร์' : 'เพิ่มแบนเนอร์'}</h3>
                            <button onClick={() => setIsBannerModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ/หัวข้อ</label>
                                <input type="text" value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">URL รูปภาพ</label>
                                <input type="text" value={bannerForm.imageUrl} onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })} placeholder="https://..." className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Link (ถ้ามี)</label>
                                <input type="text" value={bannerForm.link} onChange={(e) => setBannerForm({ ...bannerForm, link: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ลำดับ</label>
                                    <input type="number" value={bannerForm.sortOrder} onChange={(e) => setBannerForm({ ...bannerForm, sortOrder: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div className="flex items-center pt-6">
                                    <input type="checkbox" id="bannerActive" checked={bannerForm.isActive} onChange={(e) => setBannerForm({ ...bannerForm, isActive: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-yellow-500" />
                                    <label htmlFor="bannerActive" className="ml-2 text-sm font-medium text-slate-700">แสดงผล</label>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setIsBannerModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">ยกเลิก</button>
                            <button onClick={handleSaveBanner} disabled={isSaving} className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2">
                                <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Announcement Modal */}
            {isAnnouncementModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">{editingAnnouncement ? 'แก้ไขประกาศ' : 'เพิ่มประกาศ'}</h3>
                            <button onClick={() => setIsAnnouncementModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ประเภท</label>
                                <select value={announcementForm.type} onChange={(e) => setAnnouncementForm({ ...announcementForm, type: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg">
                                    <option value="MARQUEE">ข้อความวิ่ง (Marquee)</option>
                                    <option value="POPUP">Popup</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ข้อความ</label>
                                <textarea value={announcementForm.content} onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })} rows={4} className="w-full px-4 py-2 border border-slate-200 rounded-lg resize-none" placeholder="พิมพ์ข้อความประกาศ..." />
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" id="annActive" checked={announcementForm.isActive} onChange={(e) => setAnnouncementForm({ ...announcementForm, isActive: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-yellow-500" />
                                <label htmlFor="annActive" className="ml-2 text-sm font-medium text-slate-700">เปิดใช้งาน</label>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setIsAnnouncementModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">ยกเลิก</button>
                            <button onClick={handleSaveAnnouncement} disabled={isSaving} className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2">
                                <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteModalOpen && deletingItem && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="text-red-500" size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">ยืนยันการลบ</h3>
                            <p className="text-slate-500 mb-6">คุณต้องการลบ <strong>{deletingItem.name}</strong> ใช่หรือไม่?</p>
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

"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { MessageSquare, Plus, Edit, Trash2, X, Save, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

interface Announcement {
    id: number;
    type: string;
    title?: string;
    content: string;
    image?: string;
    isActive: boolean;
}

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);
    const [deletingAnn, setDeletingAnn] = useState<Announcement | null>(null);

    const [formData, setFormData] = useState({ type: "MARQUEE", title: "", content: "", image: "", isActive: true });
    const [isSaving, setIsSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const res = await api.get("/admin/banners/announcements");
            if (res.data.success) setAnnouncements(res.data.data);
        } catch (error) {
            console.error("Fetch announcements error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const openModal = (ann?: Announcement) => {
        if (ann) {
            setEditingAnn(ann);
            setFormData({
                type: ann.type,
                title: ann.title || "",
                content: ann.content,
                image: ann.image || "",
                isActive: ann.isActive
            });
        } else {
            setEditingAnn(null);
            setFormData({ type: "MARQUEE", title: "", content: "", image: "", isActive: true });
        }
        setIsModalOpen(true);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            try {
                const base64Image = reader.result;
                const res = await api.post('/admin/upload', { image: base64Image, folder: 'announcements' });
                if (res.data.success) {
                    setFormData(prev => ({ ...prev, image: res.data.data.url }));
                    toast.success('อัพโหลดรูปสำเร็จ');
                }
            } catch (error) {
                console.error('Upload error:', error);
                toast.error('อัพโหลดรูปไม่สำเร็จ');
            } finally {
                setUploading(false);
            }
        };
    };

    const handleSave = async () => {
        if (!formData.content.trim()) {
            toast.error("กรุณากรอกข้อความ");
            return;
        }
        setIsSaving(true);
        try {
            if (editingAnn) {
                await api.put(`/admin/banners/announcements/${editingAnn.id}`, formData);
            } else {
                await api.post("/admin/banners/announcements", formData);
            }
            setIsModalOpen(false);
            fetchAnnouncements();
            toast.success("บันทึกสำเร็จ");
        } catch (error) {
            console.error("Save error:", error);
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingAnn) return;
        try {
            await api.delete(`/admin/banners/announcements/${deletingAnn.id}`);
            setIsDeleteModalOpen(false);
            fetchAnnouncements();
            toast.success("ลบสำเร็จ");
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("ลบไม่สำเร็จ");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <MessageSquare size={20} className="text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">จัดการประกาศ (Popup/Marquee)</h2>
                </div>
                <button onClick={() => openModal()} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800">
                    <Plus size={18} /> เพิ่มประกาศ
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center text-slate-400">กำลังโหลด...</div>
                ) : announcements.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                        <p>ยังไม่มีประกาศ</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-4 text-left">รูปภาพ</th>
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
                                        {ann.image ? (
                                            <img src={ann.image} alt="" className="w-16 h-10 object-cover rounded border" />
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${ann.type === 'POPUP' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {ann.type === 'POPUP' ? 'Popup' : 'ข้อความวิ่ง'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-700 max-w-md">
                                        <p className="truncate">{ann.content}</p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-0.5 rounded text-xs ${ann.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {ann.isActive ? 'เปิด' : 'ปิด'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => openModal(ann)} className="p-2 hover:bg-slate-100 rounded text-slate-500"><Edit size={16} /></button>
                                        <button onClick={() => { setDeletingAnn(ann); setIsDeleteModalOpen(true); }} className="p-2 hover:bg-red-50 rounded text-red-500"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">{editingAnn ? 'แก้ไขประกาศ' : 'เพิ่มประกาศ'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ประเภท</label>
                                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900">
                                    <option value="MARQUEE">ข้อความวิ่ง (Marquee)</option>
                                    <option value="POPUP">Popup</option>
                                </select>
                            </div>

                            {/* Image Upload for Popup */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">รูปภาพ (Popup)</label>
                                <div className="flex items-start gap-4">
                                    <div className="w-24 h-24 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden relative shrink-0">
                                        {formData.image ? (
                                            <>
                                                <img src={formData.image} alt="" className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => setFormData({ ...formData, image: '' })}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-xs text-slate-400">ไม่มีรูป</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            disabled={uploading}
                                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                                        />
                                        <p className="mt-1 text-xs text-slate-400">รองรับไฟล์ JPG, PNG (แนะนำขนาด 800x600 px)</p>
                                        {uploading && <p className="text-xs text-blue-500 mt-1">กำลังอัพโหลด...</p>}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ข้อความ *</label>
                                <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={4} className="w-full px-4 py-2 border border-slate-200 rounded-lg resize-none text-slate-900" placeholder="พิมพ์ข้อความประกาศ..." />
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" id="annActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-5 h-5 rounded" />
                                <label htmlFor="annActive" className="ml-2 text-sm font-medium text-slate-700">เปิดใช้งาน</label>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">ยกเลิก</button>
                            <button onClick={handleSave} disabled={isSaving || uploading} className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2">
                                <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteModalOpen && deletingAnn && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="text-red-500" size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">ยืนยันการลบ</h3>
                            <p className="text-slate-500 mb-6">คุณต้องการลบประกาศนี้ใช่หรือไม่?</p>
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

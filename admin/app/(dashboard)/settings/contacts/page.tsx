"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import axios from "axios";
import { Plus, Trash2, Edit2, Check, X, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";

const CHANNEL_TYPES = [
    { value: "LINE", label: "LINE", icon: "💬", color: "#06C755" },
    { value: "TELEGRAM", label: "Telegram", icon: "✈️", color: "#0088CC" },
    { value: "FACEBOOK", label: "Facebook", icon: "📘", color: "#1877F2" },
    { value: "INSTAGRAM", label: "Instagram", icon: "📷", color: "#E4405F" },
    { value: "TIKTOK", label: "TikTok", icon: "🎵", color: "#000000" },
    { value: "TWITTER", label: "X (Twitter)", icon: "🐦", color: "#1DA1F2" },
    { value: "WHATSAPP", label: "WhatsApp", icon: "📱", color: "#25D366" },
    { value: "EMAIL", label: "Email", icon: "📧", color: "#EA4335" },
];

interface ContactChannel {
    id: number;
    type: string;
    name: string;
    url: string;
    icon?: string;
    isActive: boolean;
    sortOrder: number;
}

export default function ContactsPage() {
    const [contacts, setContacts] = useState<ContactChannel[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<ContactChannel | null>(null);

    const [formData, setFormData] = useState({
        type: "LINE",
        name: "",
        url: "",
    });

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
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/settings/contacts");
            if (res.data.success) {
                setContacts(res.data.data);
            }
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 403) {
                toast.error('คุณไม่มีสิทธิ์ในการดูช่องทางติดต่อ');
            } else {
                console.error("Fetch contacts error:", error);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const channelInfo = CHANNEL_TYPES.find(c => c.value === formData.type);
            const data = {
                ...formData,
                name: formData.name || channelInfo?.label || formData.type,
                icon: channelInfo?.icon,
            };

            if (editingContact) {
                await api.put(`/admin/settings/contacts/${editingContact.id}`, data);
            } else {
                await api.post("/admin/settings/contacts", data);
            }
            setIsModalOpen(false);
            setEditingContact(null);
            setFormData({ type: "LINE", name: "", url: "" });
            fetchContacts();
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 403) {
                toast.error('คุณไม่มีสิทธิ์ในการจัดการช่องทางติดต่อ');
            } else {
                console.error("Save contact error:", error);
                toast.error("เกิดข้อผิดพลาด");
            }
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("ยืนยันการลบช่องทางติดต่อนี้?")) return;
        try {
            await api.delete(`/admin/settings/contacts/${id}`);
            fetchContacts();
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 403) {
                toast.error('คุณไม่มีสิทธิ์ในการลบช่องทางติดต่อ');
            } else {
                console.error("Delete contact error:", error);
            }
        }
    };

    const toggleActive = async (contact: ContactChannel) => {
        try {
            await api.put(`/admin/settings/contacts/${contact.id}`, {
                ...contact,
                isActive: !contact.isActive,
            });
            fetchContacts();
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 403) {
                toast.error('คุณไม่มีสิทธิ์ในการเปลี่ยนสถานะ');
            } else {
                console.error("Toggle active error:", error);
            }
        }
    };

    const openEdit = (contact: ContactChannel) => {
        setEditingContact(contact);
        setFormData({
            type: contact.type,
            name: contact.name,
            url: contact.url,
        });
        setIsModalOpen(true);
    };

    const getChannelInfo = (type: string) => {
        return CHANNEL_TYPES.find(c => c.value === type) || { label: type, icon: "💬", color: "#666" };
    };

    if (loading) {
        return <div className="p-6">กำลังโหลด...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">ช่องทางติดต่อ</h2>
                <button
                    onClick={() => {
                        setEditingContact(null);
                        setFormData({ type: "LINE", name: "", url: "" });
                        setIsModalOpen(true);
                    }}
                    disabled={!hasPerm('contacts')}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus size={20} />
                    เพิ่มช่องทาง
                </button>
            </div>

            {contacts.length === 0 ? (
                <div className="bg-white p-8 rounded-xl text-center text-slate-500">
                    <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                    <p>ยังไม่มีช่องทางติดต่อ</p>
                    <p className="text-sm mt-2">กดปุ่ม "เพิ่มช่องทาง" เพื่อเพิ่มช่องทางติดต่อใหม่</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {contacts.map((contact) => {
                        const channelInfo = getChannelInfo(contact.type);
                        return (
                            <div
                                key={contact.id}
                                className={`bg-white p-5 rounded-xl shadow-sm border transition-all ${contact.isActive ? "border-slate-100" : "border-red-200 bg-red-50 opacity-60"
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                                        style={{ background: `${channelInfo.color}20` }}
                                    >
                                        {contact.icon || channelInfo.icon}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => toggleActive(contact)}
                                            disabled={!hasPerm('contacts')}
                                            className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${contact.isActive
                                                ? "bg-emerald-100 text-emerald-600"
                                                : "bg-slate-100 text-slate-400"
                                                }`}
                                            title={contact.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                                        >
                                            {contact.isActive ? <Check size={16} /> : <X size={16} />}
                                        </button>
                                        <button
                                            onClick={() => openEdit(contact)}
                                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(contact.id)}
                                            disabled={!hasPerm('contacts')}
                                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="font-bold text-slate-800">{contact.name}</h3>
                                <p className="text-sm text-slate-500 mt-1 truncate">{contact.url}</p>
                                <span
                                    className="inline-block mt-3 text-xs font-medium px-2 py-1 rounded"
                                    style={{ background: `${channelInfo.color}20`, color: channelInfo.color }}
                                >
                                    {channelInfo.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold mb-6">
                            {editingContact ? "แก้ไขช่องทาง" : "เพิ่มช่องทางใหม่"}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    ประเภท
                                </label>
                                <select
                                    required
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    disabled={!hasPerm('contacts')}
                                >
                                    {CHANNEL_TYPES.map((ch) => (
                                        <option key={ch.value} value={ch.value}>
                                            {ch.icon} {ch.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    ชื่อแสดง (ถ้าไม่ใส่จะใช้ชื่อประเภท)
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    disabled={!hasPerm('contacts')}
                                    placeholder="เช่น LINE Official, Support Team"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    ลิงค์
                                </label>
                                <input
                                    type="url"
                                    required
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                                    value={formData.url}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    disabled={!hasPerm('contacts')}
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={!hasPerm('contacts')}
                                    className="flex-1 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

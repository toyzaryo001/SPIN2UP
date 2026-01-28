"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Gamepad2, Plus, Edit, Trash2, X, Save, ToggleLeft, ToggleRight, Flame, Sparkles, Search } from "lucide-react";
import toast from "react-hot-toast";

interface Provider {
    id: number;
    name: string;
    category?: { name: string };
}

interface Game {
    id: number;
    name: string;
    slug: string;
    providerId?: number;
    provider?: { name: string; category: { name: string } };
    thumbnail?: string;
    isActive: boolean;
    isHot: boolean;
    isNew: boolean;
    sortOrder: number;
}

export default function GamesPage() {
    const [games, setGames] = useState<Game[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterProvider, setFilterProvider] = useState("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Game | null>(null);
    const [formData, setFormData] = useState({ name: "", slug: "", providerId: "", thumbnail: "", isActive: true, isHot: false, isNew: false });
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState<Game | null>(null);

    useEffect(() => { fetchData(); fetchProviders(); }, []);

    const fetchProviders = async () => {
        try {
            const res = await api.get("/admin/providers");
            if (res.data.success) setProviders(res.data.data);
        } catch (error) { console.error(error); }
    };

    const fetchData = async () => {
        try {
            const res = await api.get("/admin/games");
            if (res.data.success) setGames(res.data.data);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const openModal = (item?: Game) => {
        if (item) {
            setEditingItem(item);
            setFormData({ name: item.name, slug: item.slug, providerId: item.providerId?.toString() || "", thumbnail: item.thumbnail || "", isActive: item.isActive, isHot: item.isHot, isNew: item.isNew });
        } else {
            setEditingItem(null);
            setFormData({ name: "", slug: "", providerId: "", thumbnail: "", isActive: true, isHot: false, isNew: false });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const payload = { ...formData, slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'), providerId: formData.providerId ? Number(formData.providerId) : null };
            if (editingItem) {
                await api.put(`/admin/games/${editingItem.id}`, payload);
            } else {
                await api.post("/admin/games", payload);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) { toast.error("เกิดข้อผิดพลาด"); }
    };

    const toggle = async (id: number, field: 'isActive' | 'isHot' | 'isNew', value: boolean) => {
        try {
            await api.patch(`/admin/games/${id}`, { [field]: !value });
            fetchData();
        } catch (error) { console.error(error); }
    };

    const confirmDelete = (item: Game) => {
        setDeletingItem(item);
        setIsDeleteOpen(true);
    };

    const handleDelete = async () => {
        if (!deletingItem) return;
        try {
            await api.delete(`/admin/games/${deletingItem.id}`);
            setIsDeleteOpen(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "ไม่สามารถลบได้");
        }
    };

    const filtered = games.filter(g => {
        const matchSearch = g.name.toLowerCase().includes(search.toLowerCase());
        const matchProvider = filterProvider === "all" || g.providerId === Number(filterProvider);
        return matchSearch && matchProvider;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                        <Gamepad2 size={20} className="text-violet-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">จัดการเกม</h2>
                        <p className="text-sm text-slate-500">เกมทั้งหมดในระบบ</p>
                    </div>
                </div>
                <button onClick={() => openModal()} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800">
                    <Plus size={18} /> เพิ่มเกม
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-4 flex-wrap">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-slate-900" placeholder="ค้นหาเกม..." />
                </div>
                <select value={filterProvider} onChange={(e) => setFilterProvider(e.target.value)} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-900">
                    <option value="all">ทุกค่าย</option>
                    {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-4 text-left">เกม</th>
                            <th className="px-6 py-4 text-left">ค่าย</th>
                            <th className="px-6 py-4 text-center">HOT</th>
                            <th className="px-6 py-4 text-center">NEW</th>
                            <th className="px-6 py-4 text-center">สถานะ</th>
                            <th className="px-6 py-4 text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">กำลังโหลด...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">ไม่พบเกม</td></tr>
                        ) : (
                            filtered.map(game => (
                                <tr key={game.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {game.thumbnail && <img src={game.thumbnail} alt={game.name} className="w-10 h-10 rounded object-cover" />}
                                            <div>
                                                <p className="font-medium text-slate-900 flex items-center gap-2">
                                                    {game.name}
                                                    {game.isHot && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-xs flex items-center gap-0.5"><Flame size={12} /> HOT</span>}
                                                    {game.isNew && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-xs flex items-center gap-0.5"><Sparkles size={12} /> NEW</span>}
                                                </p>
                                                <p className="text-xs text-slate-400">{game.slug}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {game.provider ? (
                                            <div>
                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{game.provider.name}</span>
                                                <p className="text-xs text-slate-400 mt-1">{game.provider.category?.name}</p>
                                            </div>
                                        ) : <span className="text-slate-300">-</span>}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => toggle(game.id, 'isHot', game.isHot)} className={`p-1.5 rounded ${game.isHot ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-300'}`}>
                                            <Flame size={18} />
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => toggle(game.id, 'isNew', game.isNew)} className={`p-1.5 rounded ${game.isNew ? 'bg-blue-100 text-blue-500' : 'bg-slate-100 text-slate-300'}`}>
                                            <Sparkles size={18} />
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => toggle(game.id, 'isActive', game.isActive)}>
                                            {game.isActive ? <ToggleRight size={24} className="text-emerald-500" /> : <ToggleLeft size={24} className="text-slate-300" />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => openModal(game)} className="p-2 hover:bg-slate-100 rounded"><Edit size={16} /></button>
                                        <button onClick={() => confirmDelete(game)} className="p-2 hover:bg-red-50 rounded text-red-500"><Trash2 size={16} /></button>
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
                            <h3 className="text-xl font-bold">{editingItem ? 'แก้ไขเกม' : 'เพิ่มเกม'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">ชื่อเกม *</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Slug</label>
                                    <input type="text" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900" placeholder="auto" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">ค่ายเกม</label>
                                    <select value={formData.providerId} onChange={(e) => setFormData({ ...formData, providerId: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900">
                                        <option value="">ไม่ระบุ</option>
                                        {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">URL รูปภาพ</label>
                                <input type="text" value={formData.thumbnail} onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900" />
                            </div>
                            <div className="flex flex-wrap gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4 rounded" />
                                    <span className="text-sm">เปิดใช้งาน</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.isHot} onChange={(e) => setFormData({ ...formData, isHot: e.target.checked })} className="w-4 h-4 rounded text-red-500" />
                                    <span className="text-sm text-red-500 flex items-center gap-1"><Flame size={14} /> HOT</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.isNew} onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })} className="w-4 h-4 rounded text-blue-500" />
                                    <span className="text-sm text-blue-500 flex items-center gap-1"><Sparkles size={14} /> NEW</span>
                                </label>
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
                        <p className="text-slate-500 mb-6">ลบเกม "{deletingItem.name}"?</p>
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

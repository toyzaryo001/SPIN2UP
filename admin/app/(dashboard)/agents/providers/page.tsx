"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Building2, Plus, Edit, Trash2, X, Save, ToggleLeft, ToggleRight, GripVertical, Loader2, Gamepad2, Upload, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast";

// DnD Kit
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Sortable Row Component ---
function SortableRow({ id, children }: { id: number, children: any }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
        position: isDragging ? 'relative' as 'relative' : undefined as any,
        backgroundColor: isDragging ? '#f8fafc' : undefined,
    };

    return (
        <tr ref={setNodeRef} style={style} className={isDragging ? "shadow-lg" : "hover:bg-slate-50"}>
            <td className="px-6 py-4">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
                    <GripVertical size={16} className="text-slate-300 hover:text-slate-500" />
                </div>
            </td>
            {children}
        </tr>
    );
}

// --- Types ---
interface Category {
    id: number;
    name: string;
}

interface Provider {
    id: number;
    name: string;
    slug: string;
    logo?: string;
    categoryId: number;
    category: { name: string };
    isActive: boolean;
    isLobbyMode?: boolean;
    sortOrder: number;
    _count: { games: number };
}

export default function ProvidersPage() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCat, setFilterCat] = useState("all");

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Provider | null>(null);
    const [formData, setFormData] = useState({ name: "", slug: "", logo: "", categoryId: "", isActive: true });

    // Delete State
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState<Provider | null>(null);

    // Saving Order State
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [uploading, setUploading] = useState(false);

    // --- Logo Upload Handler ---
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('กรุณาเลือกไฟล์รูปภาพ');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('ไฟล์ต้องมีขนาดไม่เกิน 5MB');
            return;
        }

        setUploading(true);
        try {
            // Convert to Base64
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const base64 = reader.result as string;
                    const res = await api.post('/admin/upload', {
                        image: base64,
                        folder: 'provider-logos'
                    });
                    if (res.data.success) {
                        setFormData(prev => ({ ...prev, logo: res.data.data.url }));
                        toast.success('อัพโหลดโลโก้สำเร็จ');
                    }
                } catch (err: any) {
                    toast.error(err.response?.data?.message || 'อัพโหลดไม่สำเร็จ');
                } finally {
                    setUploading(false);
                }
            };
            reader.onerror = () => {
                toast.error('อ่านไฟล์ไม่สำเร็จ');
                setUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            toast.error('เกิดข้อผิดพลาด');
            setUploading(false);
        }
        // Reset input so same file can be selected again
        e.target.value = '';
    };

    // Sensors for DnD
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Prevent accidental drags
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => { fetchData(); fetchCategories(); }, []);

    const fetchCategories = async () => {
        try {
            const res = await api.get("/admin/categories");
            if (res.data.success) setCategories(res.data.data);
        } catch (error) { console.error(error); }
    };

    const fetchData = async () => {
        try {
            const res = await api.get("/admin/providers");
            if (res.data.success) {
                // Ensure proper sorting by sortOrder
                const sorted = (res.data.data as Provider[]).sort((a, b) => a.sortOrder - b.sortOrder);
                setProviders(sorted);
            }
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    // --- Drag Handler ---
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setProviders((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over?.id);

                // Optimistic Update
                const newItems = arrayMove(items, oldIndex, newIndex);

                // Trigger Save
                saveReorder(newItems);

                return newItems;
            });
        }
    };

    const saveReorder = async (items: Provider[]) => {
        setIsSavingOrder(true);
        try {
            // Prepare payload: re-assign sortOrder based on new index
            const updatePayload = items.map((item, index) => ({
                id: item.id,
                sortOrder: index + 1 // 1-based index
            }));

            await api.put('/admin/providers/reorder', { items: updatePayload });
            toast.success("จัดลำดับเรียบร้อย");
        } catch (error) {
            toast.error("บันทึกลำดับไม่สำเร็จ");
            fetchData(); // Revert on error
        } finally {
            setIsSavingOrder(false);
        }
    };

    // --- Actions ---

    const openModal = (item?: Provider) => {
        if (item) {
            setEditingItem(item);
            setFormData({ name: item.name, slug: item.slug, logo: item.logo || "", categoryId: item.categoryId.toString(), isActive: item.isActive });
        } else {
            setEditingItem(null);
            setFormData({ name: "", slug: "", logo: "", categoryId: categories[0]?.id.toString() || "", isActive: true });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.categoryId) { toast.error("กรุณาเลือกหมวดหมู่"); return; }
        try {
            const payload = { ...formData, slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'), categoryId: Number(formData.categoryId) };
            if (editingItem) {
                await api.put(`/admin/providers/${editingItem.id}`, payload);
            } else {
                await api.post("/admin/providers", payload);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) { toast.error("เกิดข้อผิดพลาด"); }
    };

    const toggle = async (id: number, isActive: boolean) => {
        try {
            await api.patch(`/admin/providers/${id}`, { isActive: !isActive });
            fetchData();
        } catch (error) { console.error(error); }
    };

    const toggleLobbyMode = async (id: number, isLobbyMode: boolean) => {
        try {
            await api.patch(`/admin/providers/${id}`, { isLobbyMode: !isLobbyMode });
            toast.success(isLobbyMode ? "ปิด Lobby Mode" : "เปิด Lobby Mode");
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("เกิดข้อผิดพลาด");
        }
    };

    const confirmDelete = (item: Provider) => {
        setDeletingItem(item);
        setIsDeleteOpen(true);
    };

    const handleDelete = async () => {
        if (!deletingItem) return;
        try {
            await api.delete(`/admin/providers/${deletingItem.id}`);
            setIsDeleteOpen(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "ไม่สามารถลบได้");
        }
    };

    // Filter Logic
    const filtered = filterCat === "all" ? providers : providers.filter(p => p.categoryId === Number(filterCat));
    // NOTE: Drag and drop is disabled when filtered for safety usually, but we allow it here. 
    // It will only reorder relative to global list if we used indices from global, 
    // BUT we are using arrayMove on the 'providers' state. 
    // If 'filtered' is used on UI but 'providers' is used for logic, dragging a filtered item might be weird.
    // FIX: Only allow dragging when NOT filtered, or handle filtered reorder carefully.
    // For simplicity: Disable SortableContext when filtered.
    const isDragEnabled = filterCat === "all";

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Building2 size={20} className="text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">ค่ายเกม</h2>
                        <p className="text-sm text-slate-500">
                            {isSavingOrder ? <span className="flex items-center text-yellow-600 gap-1"><Loader2 size={12} className="animate-spin" /> กำลังบันทึกลำดับ...</span> : "ลากวางเพื่อจัดลำดับ (เฉพาะดูทั้งหมด)"}
                        </p>
                    </div>
                </div>
                <button onClick={() => openModal()} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800">
                    <Plus size={18} /> เพิ่มค่ายเกม
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-900">
                    <option value="all">ทุกหมวดหมู่ (ลากวางได้)</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-4 text-left w-12"></th>
                                <th className="px-6 py-4 text-left">ค่ายเกม</th>
                                <th className="px-6 py-4 text-left">หมวดหมู่</th>
                                <th className="px-6 py-4 text-center">เกม</th>
                                <th className="px-6 py-4 text-center">Lobby</th>
                                <th className="px-6 py-4 text-center">สถานะ</th>
                                <th className="px-6 py-4 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <SortableContext items={filtered.map(p => p.id)} strategy={verticalListSortingStrategy} disabled={!isDragEnabled}>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">กำลังโหลด...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">ยังไม่มีค่ายเกม</td></tr>
                                ) : (
                                    filtered.map(prov => (
                                        <SortableRow key={prov.id} id={prov.id}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {prov.logo && <img src={prov.logo} alt={prov.name} className="w-8 h-8 rounded object-contain" />}
                                                    <span className="font-medium text-slate-900">{prov.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded text-xs">{prov.category.name}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-2 py-1 bg-slate-100 rounded text-xs">{prov._count.games} เกม</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={() => toggleLobbyMode(prov.id, prov.isLobbyMode || false)} title={prov.isLobbyMode ? "ปิด Lobby Mode" : "เปิด Lobby Mode"}>
                                                    {prov.isLobbyMode ? (
                                                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs flex items-center gap-1">
                                                            <Gamepad2 size={12} /> LOBBY
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-slate-100 text-slate-400 rounded text-xs">ปกติ</span>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={() => toggle(prov.id, prov.isActive)}>
                                                    {prov.isActive ? <ToggleRight size={24} className="text-emerald-500" /> : <ToggleLeft size={24} className="text-slate-300" />}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={() => openModal(prov)} className="p-2 hover:bg-slate-100 rounded"><Edit size={16} /></button>
                                                <button onClick={() => confirmDelete(prov)} className="p-2 hover:bg-red-50 rounded text-red-500"><Trash2 size={16} /></button>
                                            </td>
                                        </SortableRow>
                                    ))
                                )}
                            </tbody>
                        </SortableContext>
                    </table>
                </DndContext>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">{editingItem ? 'แก้ไขค่ายเกม' : 'เพิ่มค่ายเกม'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">ชื่อค่าย *</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Slug</label>
                                    <input type="text" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900" placeholder="auto" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">หมวดหมู่ *</label>
                                    <select value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900">
                                        <option value="">เลือก</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">โลโก้</label>
                                {formData.logo ? (
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                        <img src={formData.logo} alt="Logo" className="w-16 h-16 rounded-lg object-contain border border-slate-200 bg-white" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-slate-500 truncate">{formData.logo}</p>
                                        </div>
                                        <button type="button" onClick={() => setFormData({ ...formData, logo: '' })} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบโลโก้">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${uploading ? 'border-yellow-400 bg-yellow-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50'}`}>
                                        {uploading ? (
                                            <div className="flex flex-col items-center gap-1">
                                                <Loader2 size={24} className="text-yellow-500 animate-spin" />
                                                <span className="text-xs text-yellow-600 font-medium">กำลังอัพโหลด...</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1">
                                                <Upload size={24} className="text-slate-400" />
                                                <span className="text-xs text-slate-500">คลิกเพื่ออัพโหลดรูปโลโก้</span>
                                                <span className="text-[10px] text-slate-400">PNG, JPG, WEBP (ไม่เกิน 5MB)</span>
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploading} />
                                    </label>
                                )}
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" id="provActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-5 h-5 rounded" />
                                <label htmlFor="provActive" className="ml-2 text-sm">เปิดใช้งาน</label>
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
                        <p className="text-slate-500 mb-6">ลบค่ายเกม "{deletingItem.name}"?</p>
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

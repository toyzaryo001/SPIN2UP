"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Layers, Plus, Edit, Trash2, X, Save, ToggleLeft, ToggleRight, GripVertical, Upload } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

// Sortable Row Component
function SortableRow({ cat, toggle, openModal, confirmDelete, isImageIcon }: {
    cat: Category;
    toggle: (id: number, isActive: boolean) => void;
    openModal: (item: Category) => void;
    confirmDelete: (item: Category) => void;
    isImageIcon: (icon: string) => boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: isDragging ? '#f8fafc' : undefined,
    };

    return (
        <tr ref={setNodeRef} style={style} className="hover:bg-slate-50">
            <td className="px-6 py-4">
                <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 rounded">
                    <GripVertical size={16} className="text-slate-400" />
                </button>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                    {cat.icon && (isImageIcon(cat.icon) ? (
                        <img src={cat.icon} alt="" className="w-8 h-8 rounded object-cover" />
                    ) : (
                        <span className="text-xl">{cat.icon}</span>
                    ))}
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
    );
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Category | null>(null);
    const [formData, setFormData] = useState({ name: "", slug: "", icon: "", description: "", isActive: true });
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState<Category | null>(null);
    const [uploading, setUploading] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const res = await api.get("/admin/categories");
            if (res.data.success) setCategories(res.data.data);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = categories.findIndex(c => c.id === active.id);
        const newIndex = categories.findIndex(c => c.id === over.id);

        const newCategories = arrayMove(categories, oldIndex, newIndex);
        setCategories(newCategories);

        // Save new order to server
        try {
            const items = newCategories.map((cat, index) => ({ id: cat.id, sortOrder: index }));
            await api.put("/admin/categories/reorder", { items });
        } catch (error) {
            console.error("Reorder failed:", error);
            fetchData(); // Revert on error
        }
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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            // Compress image using canvas
            const compressImage = (file: File): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const maxSize = 800; // Max width/height
                            let { width, height } = img;

                            if (width > height && width > maxSize) {
                                height = (height * maxSize) / width;
                                width = maxSize;
                            } else if (height > maxSize) {
                                width = (width * maxSize) / height;
                                height = maxSize;
                            }

                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx?.drawImage(img, 0, 0, width, height);

                            // Compress to JPEG with 80% quality
                            const base64 = canvas.toDataURL('image/jpeg', 0.8);
                            resolve(base64);
                        };
                        img.onerror = reject;
                        img.src = e.target?.result as string;
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            };

            const base64 = await compressImage(file);

            // Upload to Cloudinary via our API
            const res = await api.post('/admin/upload', {
                image: base64,
                folder: 'categories'
            });

            if (res.data.success) {
                setFormData({ ...formData, icon: res.data.data.url });
            } else {
                alert('อัพโหลดไม่สำเร็จ');
            }
        } catch (err) {
            console.error('Upload error:', err);
            alert('เกิดข้อผิดพลาดในการอัพโหลด');
        }
        setUploading(false);
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

    const isImageIcon = (icon: string) => {
        return icon.startsWith('http') || icon.startsWith('data:') || icon.startsWith('/');
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
                        <p className="text-sm text-slate-500">ลากเพื่อจัดลำดับ</p>
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
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">กำลังโหลด...</td></tr>
                                ) : categories.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">ยังไม่มีหมวดหมู่</td></tr>
                                ) : (
                                    categories.map(cat => (
                                        <SortableRow
                                            key={cat.id}
                                            cat={cat}
                                            toggle={toggle}
                                            openModal={openModal}
                                            confirmDelete={confirmDelete}
                                            isImageIcon={isImageIcon}
                                        />
                                    ))
                                )}
                            </tbody>
                        </SortableContext>
                    </DndContext>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">{editingItem ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อหมวดหมู่ *</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                                <input type="text" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900" placeholder="auto" />
                            </div>

                            {/* Icon Section */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">ไอคอน</label>
                                <div className="flex gap-4 items-start">
                                    <div className="flex-shrink-0">
                                        {formData.icon ? (
                                            <div className="relative">
                                                {isImageIcon(formData.icon) ? (
                                                    <img src={formData.icon} alt="icon" className="w-20 h-20 rounded-xl object-cover border-2 border-slate-200" />
                                                ) : (
                                                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center text-4xl border-2 border-slate-200">
                                                        {formData.icon}
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, icon: "" })}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 shadow-lg"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="w-20 h-20 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                                                <Upload size={24} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-2">
                                        <label className={`flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${uploading ? 'border-yellow-500 bg-yellow-50' : 'border-slate-300 hover:border-yellow-500 hover:bg-yellow-50'}`}>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleFileUpload}
                                                disabled={uploading}
                                            />
                                            <Upload size={16} className="text-slate-500" />
                                            <span className="text-sm text-slate-600">
                                                {uploading ? 'กำลังอัพโหลด...' : 'อัพโหลดรูป'}
                                            </span>
                                        </label>
                                        <p className="text-xs text-slate-400 text-center mt-1">ขนาดไฟล์ไม่เกิน 25 MB</p>

                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500">หรือใส่ Emoji:</span>
                                            <input
                                                type="text"
                                                value={isImageIcon(formData.icon) ? '' : formData.icon}
                                                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-900 text-center text-lg"
                                                placeholder="🎰"
                                                maxLength={2}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">คำอธิบาย</label>
                                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900" />
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" id="catActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-5 h-5 rounded" />
                                <label htmlFor="catActive" className="ml-2 text-sm text-slate-700">เปิดใช้งาน</label>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700">ยกเลิก</button>
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

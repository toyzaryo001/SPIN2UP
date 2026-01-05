"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Plus, Edit, Trash2, X, Save, ShieldCheck, AlertTriangle, Check } from "lucide-react";

interface Role {
    id: number;
    name: string;
    description?: string;
    permissions: string;
}

// Permission matrix - each category has features with view/manage permissions
const PERMISSION_MATRIX = [
    {
        key: 'members',
        label: 'สมาชิก',
        features: [
            { key: 'list', label: 'รายการสมาชิก' },
            { key: 'register', label: 'สมัครสมาชิก' },
            { key: 'history', label: 'ประวัติแก้ไข' },
        ]
    },
    {
        key: 'manual',
        label: 'ฝาก-ถอน Manual',
        features: [
            { key: 'deposit', label: 'ฝากเงิน (manual)' },
            { key: 'withdraw', label: 'ถอนเงิน (manual)' },
            { key: 'history', label: 'ประวัติรายการ' },
        ]
    },
    {
        key: 'reports',
        label: 'รายงาน',
        features: [
            { key: 'new_users', label: 'รายงานสมัครใหม่' },
            { key: 'deposits', label: 'รายงานฝากเงิน' },
            { key: 'withdrawals', label: 'รายงานถอนเงิน' },
            { key: 'profit', label: 'รายงานกำไร-ขาดทุน' },
        ]
    },
    {
        key: 'settings',
        label: 'ตั้งค่า',
        features: [
            { key: 'general', label: 'ตั้งค่าทั่วไป' },
            { key: 'features', label: 'ควบคุมฟีเจอร์' },
            { key: 'contacts', label: 'ช่องทางติดต่อ' },
            { key: 'banks', label: 'บัญชีธนาคาร' },
            { key: 'truemoney', label: 'TrueMoney' },
        ]
    },
    {
        key: 'promotions',
        label: 'โปรโมชั่น',
        features: [
            { key: 'list', label: 'จัดการโปรโมชั่น' },
            { key: 'history', label: 'ประวัติการรับโปร' },
        ]
    },
    {
        key: 'banners',
        label: 'แบนเนอร์/ประกาศ',
        features: [
            { key: 'banners', label: 'แบนเนอร์' },
            { key: 'announcements', label: 'ประกาศ (Popup)' },
        ]
    },
    {
        key: 'agents',
        label: 'จัดการ Agent',
        features: [
            { key: 'settings', label: 'ตั้งค่า Agent' },
            { key: 'categories', label: 'หมวดหมู่เกม' },
            { key: 'providers', label: 'ค่ายเกม' },
            { key: 'games', label: 'จัดการเกม' },
        ]
    },
    {
        key: 'activities',
        label: 'กิจกรรม',
        features: [
            { key: 'cashback', label: 'ตั้งค่ายอดเสีย' },
            { key: 'streak', label: 'ตั้งค่าฝากสะสม' },
            { key: 'commission', label: 'ตั้งค่าคอมมิชชั่น' },
        ]
    },
    {
        key: 'staff',
        label: 'พนักงาน',
        features: [
            { key: 'admins', label: 'จัดการแอดมิน' },
            { key: 'roles', label: 'สิทธิ์การเข้าถึง' },
            { key: 'logs', label: 'ประวัติแอดมิน' },
        ]
    },
];

export default function StaffRolesPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [deletingRole, setDeletingRole] = useState<Role | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        permissions: {} as Record<string, Record<string, { view: boolean; manage: boolean }>>
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const res = await api.get("/staff/roles");
            if (res.data.success) {
                setRoles(res.data.data);
            }
        } catch (error) {
            console.error("Fetch roles error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getDefaultPermissions = () => {
        const perms: Record<string, Record<string, { view: boolean; manage: boolean }>> = {};
        PERMISSION_MATRIX.forEach(cat => {
            perms[cat.key] = {};
            cat.features.forEach(feat => {
                perms[cat.key][feat.key] = { view: false, manage: false };
            });
        });
        return perms;
    };

    const parsePermissions = (permString: string) => {
        try {
            const parsed = JSON.parse(permString);
            const result = getDefaultPermissions();
            // Convert old format to new format if needed
            Object.keys(parsed).forEach(catKey => {
                if (!result[catKey]) result[catKey] = {};
                Object.keys(parsed[catKey]).forEach(featKey => {
                    const val = parsed[catKey][featKey];
                    if (typeof val === 'object' && val !== null) {
                        result[catKey][featKey] = {
                            view: val.view || false,
                            manage: val.manage || false
                        };
                    } else if (typeof val === 'boolean') {
                        // Old format: convert to new format
                        if (!result[catKey][featKey]) {
                            result[catKey][featKey] = { view: false, manage: false };
                        }
                        result[catKey][featKey].view = val;
                        result[catKey][featKey].manage = val;
                    }
                });
            });
            return result;
        } catch {
            return getDefaultPermissions();
        }
    };

    const openCreateModal = () => {
        setEditingRole(null);
        setFormData({ name: "", description: "", permissions: getDefaultPermissions() });
        setIsModalOpen(true);
    };

    const openEditModal = (role: Role) => {
        setEditingRole(role);
        setFormData({
            name: role.name,
            description: role.description || "",
            permissions: parsePermissions(role.permissions)
        });
        setIsModalOpen(true);
    };

    const openDeleteModal = (role: Role) => {
        setDeletingRole(role);
        setIsDeleteModalOpen(true);
    };

    const togglePermission = (catKey: string, featKey: string, type: 'view' | 'manage') => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [catKey]: {
                    ...prev.permissions[catKey],
                    [featKey]: {
                        ...prev.permissions[catKey]?.[featKey],
                        [type]: !prev.permissions[catKey]?.[featKey]?.[type]
                    }
                }
            }
        }));
    };

    const selectAllCategory = (catKey: string, select: boolean) => {
        const cat = PERMISSION_MATRIX.find(c => c.key === catKey);
        if (!cat) return;

        setFormData(prev => {
            const newCatPerms: Record<string, { view: boolean; manage: boolean }> = {};
            cat.features.forEach(feat => {
                newCatPerms[feat.key] = { view: select, manage: select };
            });
            return {
                ...prev,
                permissions: {
                    ...prev.permissions,
                    [catKey]: newCatPerms
                }
            };
        });
    };

    const isCategoryAllSelected = (catKey: string) => {
        const cat = PERMISSION_MATRIX.find(c => c.key === catKey);
        if (!cat) return false;
        return cat.features.every(feat =>
            formData.permissions[catKey]?.[feat.key]?.view &&
            formData.permissions[catKey]?.[feat.key]?.manage
        );
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            alert("กรุณากรอกชื่อบทบาท");
            return;
        }
        setIsSaving(true);
        try {
            const payload = {
                name: formData.name,
                description: formData.description,
                permissions: JSON.stringify(formData.permissions)
            };
            if (editingRole) {
                await api.put(`/staff/roles/${editingRole.id}`, payload);
            } else {
                await api.post("/staff/roles", payload);
            }
            await fetchRoles();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Save role error:", error);
            alert("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingRole) return;
        try {
            await api.delete(`/staff/roles/${deletingRole.id}`);
            await fetchRoles();
            setIsDeleteModalOpen(false);
            setDeletingRole(null);
        } catch (error) {
            console.error("Delete role error:", error);
            alert("เกิดข้อผิดพลาดในการลบ");
        }
    };

    const getPermissionCount = (permStr: string) => {
        try {
            const perms = JSON.parse(permStr);
            let count = 0;
            Object.values(perms).forEach((cat: any) => {
                Object.values(cat).forEach((feat: any) => {
                    if (typeof feat === 'object') {
                        if (feat.view) count++;
                        if (feat.manage) count++;
                    } else if (feat === true) {
                        count++;
                    }
                });
            });
            return count;
        } catch {
            return 0;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">สิทธิ์การเข้าถึง (Roles)</h2>
                    <p className="text-slate-500 text-sm">กำหนดบทบาทและสิทธิ์การใช้งานเมนูต่างๆ</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-800 flex items-center gap-2"
                >
                    <Plus size={18} />
                    เพิ่มบทบาท
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-slate-400">Loading...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {roles.map((role) => (
                        <div key={role.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                        <ShieldCheck size={20} className="text-yellow-500" />
                                        {role.name}
                                    </h3>
                                    <p className="text-slate-500 text-sm">{role.description || 'ไม่มีคำอธิบาย'}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openEditModal(role)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><Edit size={16} /></button>
                                    <button onClick={() => openDeleteModal(role)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={16} /></button>
                                </div>
                            </div>

                            <div className="text-sm">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Check size={16} className="text-emerald-500" />
                                    <span>{getPermissionCount(role.permissions)} สิทธิ์ที่เปิดใช้งาน</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {roles.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-xl border-dashed border-2 border-slate-200">
                            <p>ยังไม่มีการกำหนดบทบาท</p>
                            <button onClick={openCreateModal} className="mt-2 text-yellow-600 font-medium hover:underline">+ เพิ่มบทบาทใหม่</button>
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">{editingRole ? 'แก้ไขบทบาท' : 'เพิ่มบทบาทใหม่'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อบทบาท</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="เช่น Support, Accountant, Manager"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">คำอธิบาย</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="อธิบายหน้าที่ของบทบาทนี้"
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                            </div>
                        </div>

                        <div className="mb-6">
                            <h4 className="font-semibold text-slate-700 mb-3">กำหนดสิทธิ์</h4>
                            <div className="space-y-4 max-h-[400px] overflow-y-auto">
                                {PERMISSION_MATRIX.map(cat => (
                                    <div key={cat.key} className="border border-slate-200 rounded-lg overflow-hidden">
                                        {/* Category Header */}
                                        <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-200">
                                            <span className="font-semibold text-slate-700">{cat.label}</span>
                                            <button
                                                type="button"
                                                onClick={() => selectAllCategory(cat.key, !isCategoryAllSelected(cat.key))}
                                                className="text-xs text-yellow-600 hover:underline"
                                            >
                                                {isCategoryAllSelected(cat.key) ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                                            </button>
                                        </div>

                                        {/* Table */}
                                        <table className="w-full">
                                            <thead className="bg-slate-100">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">รายการ</th>
                                                    <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 w-20">ดู</th>
                                                    <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 w-20">จัดการ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {cat.features.map((feat, idx) => (
                                                    <tr key={feat.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                                        <td className="px-4 py-2.5 text-sm text-slate-600">{feat.label}</td>
                                                        <td className="px-2 py-2 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.permissions[cat.key]?.[feat.key]?.view || false}
                                                                onChange={() => togglePermission(cat.key, feat.key, 'view')}
                                                                className="w-4 h-4 rounded border-slate-300 text-yellow-500 focus:ring-yellow-500"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-2 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.permissions[cat.key]?.[feat.key]?.manage || false}
                                                                onChange={() => togglePermission(cat.key, feat.key, 'manage')}
                                                                className="w-4 h-4 rounded border-slate-300 text-yellow-500 focus:ring-yellow-500"
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Save size={18} />
                                {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteModalOpen && deletingRole && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                <AlertTriangle size={24} className="text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">ยืนยันการลบบทบาท</h3>
                                <p className="text-slate-500 text-sm">บทบาท: {deletingRole.name}</p>
                            </div>
                        </div>
                        <p className="text-slate-600 mb-6">การลบบทบาทนี้จะทำให้แอดมินที่ใช้บทบาทนี้ไม่มีสิทธิ์ใดๆ คุณแน่ใจหรือไม่?</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600"
                            >
                                ลบบทบาท
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

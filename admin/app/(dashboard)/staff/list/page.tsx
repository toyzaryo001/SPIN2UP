"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { UserPlus, Edit, Trash2, Shield, Search, X, Save, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Staff {
    id: number;
    username: string;
    fullName: string;
    phone: string;
    isActive: boolean;
    isSuperAdmin: boolean;
    role?: { id: number; name: string };
    roleId?: number;
    createdAt: string;
    lastLoginAt?: string;
}

interface Role {
    id: number;
    name: string;
}

export default function StaffListPage() {
    const [staffs, setStaffs] = useState<Staff[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        fullName: "",
        roleId: "",
        status: "ACTIVE"
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchStaffs();
        fetchRoles();
    }, []);

    const fetchStaffs = async () => {
        try {
            const res = await api.get("/staff/users");
            if (res.data.success) {
                setStaffs(res.data.data);
            }
        } catch (error) {
            console.error("Fetch staff error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const res = await api.get("/staff/roles");
            if (res.data.success) {
                setRoles(res.data.data);
            }
        } catch (error) {
            console.error("Fetch roles error:", error);
        }
    };

    const openCreateModal = () => {
        setEditingStaff(null);
        setFormData({ username: "", password: "", fullName: "", roleId: "", status: "ACTIVE" });
        setIsModalOpen(true);
    };

    const openEditModal = (staff: Staff) => {
        setEditingStaff(staff);
        setFormData({
            username: staff.username,
            password: "",
            fullName: staff.fullName,
            roleId: staff.role?.id?.toString() || "",
            status: staff.isActive ? "ACTIVE" : "SUSPENDED"
        });
        setIsModalOpen(true);
    };

    const openDeleteModal = (staff: Staff) => {
        setDeletingStaff(staff);
        setIsDeleteModalOpen(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (editingStaff) {
                // Update
                await api.put(`/staff/users/${editingStaff.id}`, formData);
            } else {
                // Create
                await api.post("/staff/users", formData);
            }
            setIsModalOpen(false);
            fetchStaffs();
        } catch (error: any) {
            if (error.response?.status === 403) {
                alert("คุณไม่มีสิทธิ์ในการดำเนินการนี้");
            } else {
                console.error("Save error:", error);
                alert(error.response?.data?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingStaff) return;
        try {
            await api.delete(`/staff/users/${deletingStaff.id}`);
            setIsDeleteModalOpen(false);
            fetchStaffs();
        } catch (error) {
            console.error("Delete error:", error);
            alert("ไม่สามารถลบได้");
        }
    };

    const filteredStaffs = staffs.filter(s =>
        s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">จัดการพนักงาน (Admin)</h2>
                    <p className="text-slate-500 text-sm">จัดการบัญชีผู้ดูแลระบบและกำหนดสิทธิ์การใช้งาน</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
                >
                    <UserPlus size={18} />
                    เพิ่มพนักงาน
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อ, เบอร์โทร..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        />
                    </div>
                </div>

                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-4">Username</th>
                            <th className="px-6 py-4">ชื่อ-นามสกุล</th>
                            <th className="px-6 py-4">ตำแหน่ง (Role)</th>
                            <th className="px-6 py-4">เข้าใช้งานล่าสุด</th>
                            <th className="px-6 py-4 text-center">สถานะ</th>
                            <th className="px-6 py-4 text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={6} className="text-center py-8">Loading...</td></tr>
                        ) : filteredStaffs.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-8 text-slate-400">ไม่พบข้อมูลพนักงาน</td></tr>
                        ) : (
                            filteredStaffs.map((staff) => (
                                <tr key={staff.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-semibold text-slate-900">{staff.username}</td>
                                    <td className="px-6 py-4 text-slate-900">{staff.fullName}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-slate-600">
                                            <Shield size={14} />
                                            {staff.isSuperAdmin ? 'Super Admin' : (staff.role?.name || 'No Role')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {staff.lastLoginAt ? formatDate(staff.lastLoginAt) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs ${staff.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {staff.isActive ? 'ACTIVE' : 'SUSPENDED'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => openEditModal(staff)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => openDeleteModal(staff)} className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900">{editingStaff ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงานใหม่'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    disabled={!!editingStaff}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:bg-slate-100 text-slate-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    รหัสผ่าน {editingStaff && <span className="text-slate-400 font-normal">(เว้นว่างถ้าไม่เปลี่ยน)</span>}
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-slate-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ-นามสกุล</label>
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-slate-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ตำแหน่ง (Role)</label>
                                <select
                                    value={formData.roleId}
                                    onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-slate-900"
                                >
                                    <option value="">-- เลือกตำแหน่ง --</option>
                                    {roles.map(role => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </select>
                            </div>
                            {editingStaff && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">สถานะ</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-slate-900"
                                    >
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="SUSPENDED">SUSPENDED</option>
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-900"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Save size={18} />
                                {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && deletingStaff && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="text-red-500" size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-slate-900">ยืนยันการลบ</h3>
                            <p className="text-slate-500 mb-6">
                                คุณต้องการลบพนักงาน <strong>{deletingStaff.username}</strong> ใช่หรือไม่?
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-900"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                                ลบ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

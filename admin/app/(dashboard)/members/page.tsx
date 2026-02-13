"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatBaht, formatDate } from "@/lib/utils";
import { Search, UserPlus, Edit, Ban, X, Save, AlertTriangle, CheckCircle, Trash2, RotateCw } from "lucide-react";
import toast from "react-hot-toast";

interface User {
    id: number;
    username: string;
    fullName: string;
    phone: string;
    bankName: string;
    bankAccount: string;
    balance: number;
    bonusBalance: number;
    status: string;
    lineId?: string;
    createdAt: string;
}

export default function MembersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [statusUser, setStatusUser] = useState<User | null>(null);
    const [deleteUser, setDeleteUser] = useState<User | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string>("");

    const [formData, setFormData] = useState({
        username: "",
        fullName: "",
        phone: "",
        password: "",
        bankName: "",
        bankAccount: "",
        lineId: ""
    });
    const [isSaving, setIsSaving] = useState(false);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/admin/users?page=${page}&limit=10&search=${search}`);
            if (res.data.success) {
                setUsers(res.data.data.users);
                setTotalPages(res.data.data.pagination.totalPages);
            }
        } catch (error) {
            console.error("Fetch users error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers();
        }, 500);
        return () => clearTimeout(timer);
    }, [search, page]);

    // Get current user role from token
    useEffect(() => {
        const token = localStorage.getItem("admin_token");
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setCurrentUserRole(payload.role || "");
            } catch (e) {
                console.error("Failed to parse token");
            }
        }
    }, []);

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({ username: "", fullName: "", phone: "", password: "", bankName: "", bankAccount: "", lineId: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            fullName: user.fullName,
            phone: user.phone,
            password: "",
            bankName: user.bankName,
            bankAccount: user.bankAccount,
            lineId: user.lineId || ""
        });
        setIsModalOpen(true);
    };

    const openStatusModal = (user: User) => {
        setStatusUser(user);
        setIsStatusModalOpen(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (editingUser) {
                await api.put(`/admin/users/${editingUser.id}`, formData);
            } else {
                await api.post("/admin/users", formData);
            }
            setIsModalOpen(false);
            fetchUsers();
        } catch (error) {
            console.error("Save error:", error);
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!statusUser) return;
        try {
            const newStatus = statusUser.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
            await api.patch(`/admin/users/${statusUser.id}/status`, { status: newStatus });
            setIsStatusModalOpen(false);
            fetchUsers();
        } catch (error) {
            console.error("Status change error:", error);
            toast.error("เกิดข้อผิดพลาด");
        }
    };

    const openDeleteModal = (user: User) => {
        setDeleteUser(user);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteUser) return;
        try {
            await api.delete(`/admin/users/${deleteUser.id}`);
            setIsDeleteModalOpen(false);
            setDeleteUser(null);
            fetchUsers();
            toast.success("ลบสมาชิกสำเร็จ");
        } catch (error: any) {
            console.error("Delete error:", error);
            const message = error.response?.data?.message || "เกิดข้อผิดพลาด";
            toast.error(message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-slate-800">จัดการสมาชิก</h2>
                    <button
                        onClick={fetchUsers}
                        disabled={loading}
                        className={`p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-all ${loading ? 'animate-spin' : ''}`}
                        title="รีเฟรชข้อมูล"
                    >
                        <RotateCw size={20} />
                    </button>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-yellow-500/20 transition-all"
                >
                    <UserPlus size={20} />
                    <span>เพิ่มสมาชิก</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-slate-900"
                        placeholder="ค้นหา (Username, ชื่อ, เบอร์โทร)..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">ข้อมูลส่วนตัว</th>
                                <th className="px-6 py-4">ธนาคาร</th>
                                <th className="px-6 py-4 text-right">เครดิตคงเหลือ</th>
                                <th className="px-6 py-4 text-center">สถานะ</th>
                                <th className="px-6 py-4">สมัครเมื่อ</th>
                                <th className="px-6 py-4 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                                        ไม่พบข้อมูลสมาชิก
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-slate-800">{user.username}</p>
                                                <p className="text-slate-500 mt-0.5">{user.fullName}</p>
                                                <div className="flex items-center gap-1 text-slate-400 mt-1 text-xs">
                                                    <span>{user.phone}</span>
                                                    {user.lineId && (
                                                        <>
                                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                            <span>ID: {user.lineId}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            <p>{user.bankName}</p>
                                            <p className="text-slate-500 text-xs mt-0.5">{user.bankAccount}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="font-bold text-emerald-600">{formatBaht(user.balance)}</p>
                                            {Number(user.bonusBalance) > 0 && (
                                                <p className="text-xs text-amber-500 mt-0.5">
                                                    โบนัส: {formatBaht(user.bonusBalance)}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === "ACTIVE"
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : "bg-red-100 text-red-800"
                                                    }`}
                                            >
                                                {user.status === "ACTIVE" ? "ปกติ" : "ระงับ"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                            {formatDate(user.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => openEditModal(user)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="แก้ไข">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => openStatusModal(user)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="เปลี่ยนสถานะ">
                                                    <Ban size={18} />
                                                </button>
                                                <button onClick={() => openDeleteModal(user)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบสมาชิก">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500">
                    <div>หน้า {page} จาก {totalPages}</div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
                        >
                            ก่อนหน้า
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
                        >
                            ถัดไป
                        </button>
                    </div>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">{editingUser ? 'แก้ไขข้อมูลสมาชิก' : 'เพิ่มสมาชิกใหม่'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทร</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    disabled={!!editingUser}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg disabled:bg-slate-100 text-slate-900"
                                    placeholder="0812345678"
                                />
                                {!editingUser && (
                                    <p className="text-xs text-slate-400 mt-1">Username จะสร้างอัตโนมัติจาก Prefix + เบอร์โทร 6 หลักท้าย</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ-นามสกุล</label>
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    รหัสผ่าน {editingUser && <span className="text-slate-400 font-normal">(เว้นว่างถ้าไม่เปลี่ยน)</span>}
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ธนาคาร</label>
                                    <select
                                        value={formData.bankName}
                                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900"
                                    >
                                        <option value="">-- เลือกธนาคาร --</option>
                                        <option value="KBANK">กสิกรไทย</option>
                                        <option value="SCB">ไทยพาณิชย์</option>
                                        <option value="KTB">กรุงไทย</option>
                                        <option value="BBL">กรุงเทพ</option>
                                        <option value="TTB">ทหารไทยธนชาต</option>
                                        <option value="BAY">กรุงศรี</option>
                                        <option value="GSB">ออมสิน</option>
                                        <option value="BAAC">ธ.ก.ส.</option>
                                        <option value="GHB">อาคารสงเคราะห์</option>
                                        <option value="CIMB">ซีไอเอ็มบี</option>
                                        <option value="UOB">ยูโอบี</option>
                                        <option value="TISCO">ทิสโก้</option>
                                        <option value="KKP">เกียรตินาคินภัทร</option>
                                        <option value="LH">แลนด์ แอนด์ เฮ้าส์</option>
                                        <option value="ICBC">ไอซีบีซี</option>
                                        <option value="SME">SME Bank</option>
                                        <option value="ISBT">อิสลามแห่งประเทศไทย</option>
                                        <option value="TRUEWALLET">True Wallet</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">เลขบัญชี</label>
                                    <input
                                        type="text"
                                        value={formData.bankAccount}
                                        onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Line ID (ถ้ามี)</label>
                                <input
                                    type="text"
                                    value={formData.lineId}
                                    onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
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
            )
            }

            {/* Status Change Modal */}
            {
                isStatusModalOpen && statusUser && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
                            <div className="flex flex-col items-center text-center">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${statusUser.status === 'ACTIVE' ? 'bg-red-100' : 'bg-emerald-100'}`}>
                                    {statusUser.status === 'ACTIVE' ? (
                                        <AlertTriangle className="text-red-500" size={32} />
                                    ) : (
                                        <CheckCircle className="text-emerald-500" size={32} />
                                    )}
                                </div>
                                <h3 className="text-xl font-bold mb-2">
                                    {statusUser.status === 'ACTIVE' ? 'ระงับบัญชี' : 'เปิดใช้งานบัญชี'}
                                </h3>
                                <p className="text-slate-500 mb-6">
                                    {statusUser.status === 'ACTIVE'
                                        ? `คุณต้องการระงับบัญชี ${statusUser.username} ใช่หรือไม่?`
                                        : `คุณต้องการเปิดใช้งานบัญชี ${statusUser.username} ใช่หรือไม่?`
                                    }
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsStatusModalOpen(false)}
                                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={handleToggleStatus}
                                    className={`flex-1 px-4 py-2 text-white rounded-lg ${statusUser.status === 'ACTIVE' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                                >
                                    ยืนยัน
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && deleteUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-red-100">
                                <Trash2 className="text-red-500" size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-red-600">ลบสมาชิก</h3>
                            <p className="text-slate-500 mb-2">
                                คุณต้องการลบสมาชิก <strong>{deleteUser.username}</strong> ใช่หรือไม่?
                            </p>
                            <p className="text-red-500 text-sm mb-4">
                                ⚠️ การลบจะไม่สามารถกู้คืนได้!
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setIsDeleteModalOpen(false); setDeleteUser(null); }}
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 px-4 py-2 text-white rounded-lg bg-red-500 hover:bg-red-600"
                            >
                                ยืนยันลบ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

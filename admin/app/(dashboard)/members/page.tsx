"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatBaht, formatDate } from "@/lib/utils";
import { Search, UserPlus, Edit, X, Save, AlertTriangle, CheckCircle, Trash2, RotateCw, Copy, History, Ban, ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Download } from "lucide-react";
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

interface HistoryItem {
    id: number;
    type: string;
    amount: number;
    status: string;
    createdAt: string;
    subType?: string;
    note?: string;
}

// --- Bank Logo ---
const BANK_FILE_MAP: Record<string, string> = {
    "kbank": "KBANK", "scb": "SCB", "ktb": "KTB", "bbl": "BBL", "bay": "BAY",
    "tmb": "TTB", "ttb": "TTB", "gsb": "GSB", "ghb": "GHB", "baac": "BAAC",
    "uob": "UOB", "cimb": "CIMB", "kkp": "KKP", "tisco": "TISCO", "lhb": "LHB",
    "tcrb": "TCRB", "ibank": "IBANK", "icbc": "ICBC", "hsbc": "HSBC", "citi": "CITI",
    "promptpay": "PromptPay", "truemoney": "TrueMoney", "lh": "LHB", "isbt": "IBANK", "sme": "SME",
};

function BankLogo({ code, size = 28 }: { code: string; size?: number }) {
    const normalizedCode = code.toLowerCase().replace(/[^a-z0-9]/g, '');
    const fileName = BANK_FILE_MAP[normalizedCode] || code.toUpperCase();
    const logoUrl = `/bank-logos/${fileName}.png`;

    return (
        <img
            src={logoUrl}
            alt={code}
            width={size}
            height={size}
            className="rounded bg-white object-contain shrink-0"
            onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent && !parent.querySelector('.bank-fallback')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'bank-fallback rounded bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold shrink-0';
                    fallback.style.width = `${size}px`;
                    fallback.style.height = `${size}px`;
                    fallback.style.fontSize = `${size * 0.35}px`;
                    fallback.textContent = code.slice(0, 2).toUpperCase();
                    parent.appendChild(fallback);
                }
            }}
        />
    );
}

// --- Copy to Clipboard ---
function CopyButton({ text }: { text: string }) {
    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(text);
            toast.success("คัดลอกแล้ว", { duration: 1500 });
        } catch {
            toast.error("คัดลอกไม่สำเร็จ");
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="ml-1.5 p-0.5 text-slate-300 hover:text-blue-500 transition-colors rounded"
            title="คัดลอก Username"
        >
            <Copy size={13} />
        </button>
    );
}

export default function MembersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deleteUser, setDeleteUser] = useState<User | null>(null);
    const [historyUser, setHistoryUser] = useState<User | null>(null);
    const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historySummary, setHistorySummary] = useState({ totalDeposit: 0, totalWithdraw: 0, profit: 0 });

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

    const openHistoryModal = async (user: User) => {
        setHistoryUser(user);
        setIsHistoryModalOpen(true);
        setHistoryLoading(true);
        try {
            const res = await api.get(`/admin/users/${user.id}`);
            if (res.data.success) {
                const userData = res.data.data;
                // Get transactions
                const txRes = await api.get(`/admin/transactions?userId=${user.id}&limit=50`);
                if (txRes.data.success) {
                    setHistoryData(txRes.data.data.transactions || txRes.data.data || []);
                }
                // Calculate summary
                const allTx = txRes.data?.data?.transactions || txRes.data?.data || [];
                let totalDeposit = 0, totalWithdraw = 0;
                allTx.forEach((tx: any) => {
                    if (tx.status === 'COMPLETED' || tx.status === 'APPROVED') {
                        if (tx.type === 'DEPOSIT') totalDeposit += Number(tx.amount);
                        if (tx.type === 'WITHDRAW') totalWithdraw += Number(tx.amount);
                    }
                });
                setHistorySummary({
                    totalDeposit,
                    totalWithdraw,
                    profit: totalDeposit - totalWithdraw
                });
            }
        } catch (error) {
            console.error("Fetch history error:", error);
            toast.error("ไม่สามารถโหลดประวัติได้");
        } finally {
            setHistoryLoading(false);
        }
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
        if (!editingUser) return;
        try {
            const newStatus = editingUser.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
            await api.patch(`/admin/users/${editingUser.id}/status`, { status: newStatus });
            setEditingUser({ ...editingUser, status: newStatus });
            fetchUsers();
            toast.success(newStatus === "SUSPENDED" ? "ระงับบัญชีแล้ว" : "เปิดใช้งานบัญชีแล้ว");
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
                <div className="flex items-center gap-2">
                    <button
                        onClick={async () => {
                            try {
                                const res = await api.get('/admin/users?page=1&limit=10000');
                                const allUsers = res.data?.data?.users || res.data?.data || [];
                                const BOM = '\uFEFF';
                                const headers = ['Username', 'ชื่อ-นามสกุล', 'เบอร์โทร', 'ธนาคาร', 'เลขบัญชี', 'ยอดคงเหลือ', 'สถานะ', 'วันที่สมัคร'];
                                const rows = allUsers.map((u: any) => [
                                    u.username, u.fullName, u.phone, u.bankName, u.bankAccount, u.balance || 0, u.status, formatDate(u.createdAt)
                                ].map((c: any) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','));
                                const csv = BOM + [headers.join(','), ...rows].join('\n');
                                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(blob);
                                link.download = `สมาชิก_${new Date().toISOString().slice(0, 10)}.csv`;
                                link.click();
                                URL.revokeObjectURL(link.href);
                                toast.success('Export สำเร็จ');
                            } catch {
                                toast.error('Export ไม่สำเร็จ');
                            }
                        }}
                        className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-all"
                    >
                        <Download size={18} />
                        Export
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-yellow-500/20 transition-all"
                    >
                        <UserPlus size={20} />
                        <span>เพิ่มสมาชิก</span>
                    </button>
                </div>
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
                                                <div className="flex items-center">
                                                    <p className="font-bold text-slate-800">{user.username}</p>
                                                    <CopyButton text={user.username} />
                                                </div>
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
                                            <div className="flex items-center gap-2">
                                                <BankLogo code={user.bankName} />
                                                <div>
                                                    <p className="font-medium">{user.bankName}</p>
                                                    <p className="text-slate-500 text-xs mt-0.5">{user.bankAccount}</p>
                                                </div>
                                            </div>
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
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => openEditModal(user)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="แก้ไข">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => openHistoryModal(user)} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="ประวัติ">
                                                    <History size={18} />
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
                            {/* Username (locked when editing) */}
                            {editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                                    <div className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 select-all cursor-default flex items-center gap-2">
                                        <span>{editingUser.username}</span>
                                        <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">ล็อค</span>
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทร</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900"
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

                            {/* Suspend / Activate Toggle (only in edit mode) */}
                            {editingUser && (
                                <div className="border-t border-slate-200 pt-4 mt-2">
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${editingUser.status === 'ACTIVE' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                                {editingUser.status === 'ACTIVE' ? (
                                                    <CheckCircle className="text-emerald-500" size={18} />
                                                ) : (
                                                    <Ban className="text-red-500" size={18} />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-700">
                                                    สถานะบัญชี: <span className={editingUser.status === 'ACTIVE' ? 'text-emerald-600' : 'text-red-600'}>
                                                        {editingUser.status === 'ACTIVE' ? 'ปกติ' : 'ระงับ'}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleToggleStatus}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${editingUser.status === 'ACTIVE'
                                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                                }`}
                                        >
                                            {editingUser.status === 'ACTIVE' ? 'ระงับบัญชี' : 'เปิดใช้งาน'}
                                        </button>
                                    </div>
                                </div>
                            )}
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

            {/* History Modal */}
            {isHistoryModalOpen && historyUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">ประวัติสมาชิก</h3>
                                <p className="text-slate-500 text-sm">{historyUser.username} — {historyUser.fullName}</p>
                            </div>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        {historyLoading ? (
                            <div className="py-12 text-center text-slate-400">กำลังโหลดข้อมูล...</div>
                        ) : (
                            <>
                                {/* Summary Cards */}
                                <div className="grid grid-cols-3 gap-3 mb-6">
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                                        <div className="flex items-center justify-center gap-1 text-emerald-500 mb-1">
                                            <ArrowDownCircle size={16} />
                                            <span className="text-xs font-medium">ฝากรวม</span>
                                        </div>
                                        <p className="text-xl font-bold text-emerald-700">{formatBaht(historySummary.totalDeposit)}</p>
                                    </div>
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                                        <div className="flex items-center justify-center gap-1 text-red-500 mb-1">
                                            <ArrowUpCircle size={16} />
                                            <span className="text-xs font-medium">ถอนรวม</span>
                                        </div>
                                        <p className="text-xl font-bold text-red-700">{formatBaht(historySummary.totalWithdraw)}</p>
                                    </div>
                                    <div className={`${historySummary.profit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'} border rounded-xl p-4 text-center`}>
                                        <div className={`flex items-center justify-center gap-1 ${historySummary.profit >= 0 ? 'text-blue-500' : 'text-amber-500'} mb-1`}>
                                            {historySummary.profit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                            <span className="text-xs font-medium">กำไร-ขาดทุน</span>
                                        </div>
                                        <p className={`text-xl font-bold ${historySummary.profit >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                                            {historySummary.profit >= 0 ? '+' : ''}{formatBaht(historySummary.profit)}
                                        </p>
                                    </div>
                                </div>

                                {/* Transaction List */}
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 text-left">ประเภท</th>
                                                <th className="px-4 py-3 text-right">จำนวน</th>
                                                <th className="px-4 py-3 text-center">สถานะ</th>
                                                <th className="px-4 py-3 text-right">เวลา</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {historyData.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">ไม่พบรายการ</td>
                                                </tr>
                                            ) : (
                                                historyData.slice(0, 30).map((tx) => (
                                                    <tr key={tx.id} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${['DEPOSIT', 'MANUAL_ADD'].includes(tx.type) ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                                                    {['DEPOSIT', 'MANUAL_ADD'].includes(tx.type) ? (
                                                                        <ArrowDownCircle size={14} className="text-emerald-500" />
                                                                    ) : (
                                                                        <ArrowUpCircle size={14} className="text-red-500" />
                                                                    )}
                                                                </div>
                                                                <span className="font-medium text-slate-700">
                                                                    {tx.type === 'DEPOSIT' ? 'ฝาก' : tx.type === 'MANUAL_ADD' ? 'เพิ่มเครดิต' : tx.type === 'MANUAL_DEDUCT' ? 'ลดเครดิต' : 'ถอน'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className={`px-4 py-3 text-right font-bold ${['DEPOSIT', 'MANUAL_ADD'].includes(tx.type) ? 'text-emerald-600' : 'text-red-600'}`}>
                                                            {['DEPOSIT', 'MANUAL_ADD'].includes(tx.type) ? '+' : '-'}{formatBaht(tx.amount)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${tx.status === 'COMPLETED' || tx.status === 'APPROVED'
                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                : tx.status === 'PENDING'
                                                                    ? 'bg-yellow-100 text-yellow-700'
                                                                    : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                {tx.status === 'COMPLETED' || tx.status === 'APPROVED' ? 'สำเร็จ' : tx.status === 'PENDING' ? 'รอดำเนินการ' : 'ไม่สำเร็จ'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-xs text-slate-500">
                                                            {formatDate(tx.createdAt)}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

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

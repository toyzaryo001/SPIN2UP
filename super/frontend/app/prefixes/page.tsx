'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
    Shield, Database, Plus, Trash2, Edit2, Power, PowerOff,
    LogOut, RefreshCw, CheckCircle, XCircle, Globe, Key, Copy, Check
} from 'lucide-react';

interface Prefix {
    id: number;
    code: string;
    name: string;
    databaseUrl: string;
    adminDomain: string | null;
    playerDomain: string | null;
    logo: string | null;
    primaryColor: string | null;
    isActive: boolean;
    createdAt: string;
}

export default function PrefixesPage() {
    const router = useRouter();
    const [prefixes, setPrefixes] = useState<Prefix[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingPrefix, setEditingPrefix] = useState<Prefix | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        databaseUrl: '',
        adminDomain: '',
        playerDomain: '',
        createInitialAdmin: true,
        initialAdminUsername: 'admin',
        initialAdminPassword: ''
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

    useEffect(() => {
        const token = localStorage.getItem('superAdminToken');
        const userData = localStorage.getItem('superAdminUser');

        if (!token) {
            router.push('/login');
            return;
        }

        if (userData) {
            setUser(JSON.parse(userData));
        }

        fetchPrefixes();
    }, []);

    const getAuthHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('superAdminToken')}`
    });

    const fetchPrefixes = async () => {
        try {
            const res = await fetch(`${API_URL}/api/prefixes`, {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                setPrefixes(data.data);
            }
        } catch (error) {
            console.error('Error fetching prefixes:', error);
            toast.error('ไม่สามารถโหลดข้อมูล Prefix ได้');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('superAdminToken');
        localStorage.removeItem('superAdminUser');
        router.push('/login');
        toast.success('ออกจากระบบเรียบร้อย');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingPrefix
            ? `${API_URL}/api/prefixes/${editingPrefix.id}`
            : `${API_URL}/api/prefixes`;
        const method = editingPrefix ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                if (data.warning) {
                    toast.error(data.warning, { duration: 6000 });
                } else {
                    toast.success(editingPrefix ? 'บันทึกการแก้ไขสำเร็จ' : 'สร้าง Prefix สำเร็จ');
                }
                fetchPrefixes();
                closeModal();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Error saving prefix:', error);
            toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('ยืนยันการลบ Prefix นี้?')) return;

        try {
            const res = await fetch(`${API_URL}/api/prefixes/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                toast.success('ลบ Prefix สำเร็จ');
                fetchPrefixes();
            } else {
                toast.error(data.message || 'ไม่สามารถลบได้');
            }
        } catch (error) {
            console.error('Error deleting prefix:', error);
            toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        }
    };

    const handleToggle = async (prefix: Prefix) => {
        try {
            const res = await fetch(`${API_URL}/api/prefixes/${prefix.id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ isActive: !prefix.isActive })
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`เปลี่ยนสถานะเป็น ${!prefix.isActive ? 'Active' : 'Inactive'} แล้ว`);
                fetchPrefixes();
            } else {
                toast.error(data.message || 'ไม่สามารถเปลี่ยนสถานะได้');
            }
        } catch (error) {
            console.error('Error toggling prefix:', error);
            toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        }
    };

    const openEditModal = (prefix: Prefix) => {
        setFormData({
            code: prefix.code,
            name: prefix.name,
            databaseUrl: prefix.databaseUrl,
            adminDomain: prefix.adminDomain || '',
            playerDomain: prefix.playerDomain || '',
            createInitialAdmin: true,
            initialAdminUsername: 'admin',
            initialAdminPassword: ''
        });
        setEditingPrefix(prefix);
        setShowModal(true);
    };

    const openCreateModal = () => {
        setFormData({
            code: '', name: '', databaseUrl: '', adminDomain: '', playerDomain: '',
            createInitialAdmin: true, initialAdminUsername: 'admin', initialAdminPassword: ''
        });
        setEditingPrefix(null);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingPrefix(null);
        setFormData({
            code: '', name: '', databaseUrl: '', adminDomain: '', playerDomain: '',
            createInitialAdmin: true, initialAdminUsername: 'admin', initialAdminPassword: ''
        });
    };

    const copyDatabaseUrl = (prefix: Prefix) => {
        navigator.clipboard.writeText(prefix.databaseUrl);
        setCopiedId(prefix.id);
        toast.success('คัดลอก Database URL แล้ว');
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <RefreshCw className="animate-spin text-purple-500" size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
            {/* Header */}
            <header className="bg-slate-800/50 backdrop-blur-lg border-b border-white/10 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl flex items-center justify-center">
                            <Shield size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">PREFIX MASTER</h1>
                            <p className="text-purple-300 text-sm">จัดการ Prefix ทั้งหมด</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-purple-300 hidden sm:block">สวัสดี, {user?.fullName || 'Admin'}</span>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                        >
                            <LogOut size={18} />
                            <span className="hidden sm:inline">ออกจากระบบ</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                <Database className="text-purple-400" size={24} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">Prefixes ทั้งหมด</p>
                                <p className="text-3xl font-bold text-white">{prefixes.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                                <CheckCircle className="text-green-400" size={24} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">Active</p>
                                <p className="text-3xl font-bold text-white">
                                    {prefixes.filter(p => p.isActive).length}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                                <XCircle className="text-red-400" size={24} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">Inactive</p>
                                <p className="text-3xl font-bold text-white">
                                    {prefixes.filter(p => !p.isActive).length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Prefix List */}
                <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-white/10">
                    <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <h2 className="text-xl font-bold text-white">รายการ Prefix</h2>
                        <button
                            onClick={openCreateModal}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                        >
                            <Plus size={18} />
                            สร้าง Prefix ใหม่
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="px-6 py-4 text-left text-purple-300 font-medium">Code</th>
                                    <th className="px-6 py-4 text-left text-purple-300 font-medium">Name</th>
                                    <th className="px-6 py-4 text-left text-purple-300 font-medium hidden lg:table-cell">Database</th>
                                    <th className="px-6 py-4 text-left text-purple-300 font-medium hidden md:table-cell">Domains</th>
                                    <th className="px-6 py-4 text-left text-purple-300 font-medium">Status</th>
                                    <th className="px-6 py-4 text-left text-purple-300 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prefixes.map((prefix) => (
                                    <tr key={prefix.id} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-lg font-bold text-purple-400 bg-purple-500/20 px-2 py-1 rounded">
                                                {prefix.code}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-white font-medium">{prefix.name}</td>
                                        <td className="px-6 py-4 hidden lg:table-cell">
                                            <button
                                                onClick={() => copyDatabaseUrl(prefix)}
                                                className="flex items-center gap-2 text-slate-400 hover:text-white text-sm"
                                            >
                                                {copiedId === prefix.id ? (
                                                    <Check size={14} className="text-green-400" />
                                                ) : (
                                                    <Copy size={14} />
                                                )}
                                                <span className="font-mono truncate max-w-[150px]">
                                                    {prefix.databaseUrl.substring(0, 30)}...
                                                </span>
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <div className="space-y-1">
                                                {prefix.adminDomain && (
                                                    <div className="flex items-center gap-1 text-sm text-slate-400">
                                                        <Globe size={14} />
                                                        {prefix.adminDomain}
                                                    </div>
                                                )}
                                                {prefix.playerDomain && (
                                                    <div className="flex items-center gap-1 text-sm text-slate-400">
                                                        <Globe size={14} />
                                                        {prefix.playerDomain}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggle(prefix)}
                                                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm transition-colors ${prefix.isActive
                                                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                                    }`}
                                            >
                                                {prefix.isActive ? <Power size={14} /> : <PowerOff size={14} />}
                                                <span className="hidden sm:inline">{prefix.isActive ? 'Active' : 'Inactive'}</span>
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openEditModal(prefix)}
                                                    className="p-2 hover:bg-white/10 rounded-lg text-blue-400 transition-colors"
                                                    title="แก้ไข"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(prefix.id)}
                                                    className="p-2 hover:bg-white/10 rounded-lg text-red-400 transition-colors"
                                                    title="ลบ"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {prefixes.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                            <Database size={48} className="mx-auto mb-4 opacity-50" />
                                            <p>ยังไม่มี Prefix</p>
                                            <p className="text-sm mt-1">คลิก "สร้าง Prefix ใหม่" เพื่อเริ่มต้น</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-lg border border-white/10 shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">
                                {editingPrefix ? 'แก้ไข Prefix' : 'สร้าง Prefix ใหม่'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-white text-2xl">
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-purple-300 text-sm mb-2">Prefix Code *</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white font-mono"
                                        placeholder=""
                                        required
                                        disabled={!!editingPrefix}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-purple-300 text-sm mb-2">Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white"
                                    placeholder=""
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-purple-300 text-sm mb-2">Database URL *</label>
                                <input
                                    type="text"
                                    value={formData.databaseUrl}
                                    onChange={(e) => setFormData({ ...formData, databaseUrl: e.target.value })}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white font-mono text-sm"
                                    placeholder=""
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-purple-300 text-sm mb-2">Admin Domain</label>
                                    <input
                                        type="text"
                                        value={formData.adminDomain}
                                        onChange={(e) => setFormData({ ...formData, adminDomain: e.target.value })}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white"
                                        placeholder=""
                                    />
                                </div>
                                <div>
                                    <label className="block text-purple-300 text-sm mb-2">Player Domain</label>
                                    <input
                                        type="text"
                                        value={formData.playerDomain}
                                        onChange={(e) => setFormData({ ...formData, playerDomain: e.target.value })}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white"
                                        placeholder=""
                                    />
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-4 mt-4">
                                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                                    <Shield size={18} className="text-purple-400" />
                                    จัดการแอดมิน (Admin Management)
                                </h4>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="createInitialAdmin"
                                            checked={formData.createInitialAdmin}
                                            onChange={(e) => setFormData({ ...formData, createInitialAdmin: e.target.checked })}
                                            className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-purple-600 focus:ring-purple-500"
                                        />
                                        <label htmlFor="createInitialAdmin" className="text-slate-300 text-sm cursor-pointer select-none">
                                            {editingPrefix ? 'รีเซ็ต/สร้างแอดมินใหม่ (Reset/Create)' : 'สร้าง User แอดมินเริ่มต้นให้ทันที'}
                                        </label>
                                    </div>

                                    {formData.createInitialAdmin && (
                                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                            <div>
                                                <label className="block text-purple-300 text-sm mb-2">Username</label>
                                                <input
                                                    type="text"
                                                    value={formData.initialAdminUsername}
                                                    onChange={(e) => setFormData({ ...formData, initialAdminUsername: e.target.value })}
                                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white"
                                                    placeholder="admin"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-purple-300 text-sm mb-2">Password</label>
                                                <input
                                                    type="text"
                                                    value={formData.initialAdminPassword}
                                                    onChange={(e) => setFormData({ ...formData, initialAdminPassword: e.target.value })}
                                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white"
                                                    placeholder="ตั้งรหัสผ่าน..."
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                                >
                                    {editingPrefix ? 'บันทึก' : 'สร้าง Prefix'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

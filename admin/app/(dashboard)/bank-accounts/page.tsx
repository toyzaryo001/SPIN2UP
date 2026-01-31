"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Plus, Trash2, Edit2, Check, X, Search, Filter } from "lucide-react";
import { formatBaht } from "@/lib/utils";
import toast from "react-hot-toast";
import BankLogo from "@/components/BankLogo";

export default function BankAccountsPage() {
    const [banks, setBanks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBank, setEditingBank] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"all" | "deposit" | "withdraw">("all");
    const [searchTerm, setSearchTerm] = useState("");

    // Form state
    const [formData, setFormData] = useState({
        bankName: "",
        accountName: "",
        accountNumber: "",
        type: "deposit", // deposit, withdraw
        balance: 0,
    });

    useEffect(() => {
        fetchBanks();
    }, []);

    const fetchBanks = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/settings/banks");
            if (res.data.success) {
                setBanks(res.data.data);
            }
        } catch (error) {
            console.error("Fetch banks error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Ensure balance is a number
            const submissionData = {
                ...formData,
                balance: Number(formData.balance)
            };

            if (editingBank) {
                await api.put(`/admin/settings/banks/${editingBank.id}`, submissionData);
            } else {
                await api.post("/admin/settings/banks", submissionData);
            }
            setIsModalOpen(false);
            setEditingBank(null);
            setFormData({ bankName: "", accountName: "", accountNumber: "", type: "deposit", balance: 0 });
            fetchBanks();
            toast.success(editingBank ? "แก้ไขข้อมูลสำเร็จ" : "เพิ่มบัญชีสำเร็จ");
        } catch (error) {
            console.error("Save bank error:", error);
            toast.error("เกิดข้อผิดพลาด");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("ยืนยันการลบ?")) return;
        try {
            await api.delete(`/admin/settings/banks/${id}`);
            fetchBanks();
            toast.success("ลบบัญชีสำเร็จ");
        } catch (error) {
            console.error("Delete bank error:", error);
            toast.error("ลบไม่สำเร็จ");
        }
    };

    const handleToggleStatus = async (bank: any) => {
        try {
            const newStatus = !bank.isActive;
            await api.put(`/admin/settings/banks/${bank.id}`, { ...bank, isActive: newStatus });

            // Optimistic update
            setBanks(banks.map(b => b.id === bank.id ? { ...b, isActive: newStatus } : b));
            toast.success(`เปลี่ยนสถานะเป็น ${newStatus ? 'ใช้งาน' : 'ปิดใช้งาน'}`);
        } catch (error) {
            console.error("Toggle Status Error:", error);
            toast.error("เปลี่ยนสถานะไม่สำเร็จ");
            fetchBanks(); // Revert on error
        }
    };

    const openEdit = (bank: any) => {
        setEditingBank(bank);
        setFormData({
            bankName: bank.bankName,
            accountName: bank.accountName,
            accountNumber: bank.accountNumber,
            type: bank.type,
            balance: bank.balance || 0,
        });
        setIsModalOpen(true);
    };

    // Filter banks
    const filteredBanks = banks.filter(bank => {
        const matchesTab = activeTab === "all" || bank.type === activeTab;
        const matchesSearch =
            bank.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bank.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bank.accountNumber.includes(searchTerm);
        return matchesTab && matchesSearch;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">จัดการบัญชีหน้าเว็บ</h2>
                    <p className="text-slate-500 text-sm mt-1">จัดการบัญชีธนาคารสำหรับฝาก-ถอน</p>
                </div>
                <button
                    onClick={() => {
                        setEditingBank(null);
                        setFormData({ bankName: "", accountName: "", accountNumber: "", type: "deposit", balance: 0 });
                        setIsModalOpen(true);
                    }}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    เพิ่มบัญชี
                </button>
            </div>

            {/* Filters & Tabs */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab("all")}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        ทั้งหมด
                    </button>
                    <button
                        onClick={() => setActiveTab("deposit")}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'deposit' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        บัญชีฝาก
                    </button>
                    <button
                        onClick={() => setActiveTab("withdraw")}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'withdraw' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        บัญชีถอน
                    </button>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="ค้นหาบัญชี..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 text-sm"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                                <th className="px-6 py-4">ธนาคาร</th>
                                <th className="px-6 py-4">เลขบัญชี / ชื่อบัญชี</th>
                                <th className="px-6 py-4">ประเภท</th>
                                <th className="px-6 py-4 text-right">ยอดเงินคงเหลือ</th>
                                <th className="px-6 py-4 text-center">สถานะ</th>
                                <th className="px-6 py-4 text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredBanks.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        ไม่พบข้อมูลบัญชีธนาคาร
                                    </td>
                                </tr>
                            ) : (
                                filteredBanks.map((bank) => (
                                    <tr key={bank.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-50 rounded-lg p-1.5 border border-slate-100 flex-shrink-0">
                                                    <BankLogo bankCode={bank.bankName} width={28} height={28} />
                                                </div>
                                                <span className="font-semibold text-slate-800">{bank.bankName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-mono text-slate-900 font-medium text-base">{bank.accountNumber}</span>
                                                <span className="text-slate-500 text-xs">{bank.accountName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${bank.type === 'deposit'
                                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                                }`}>
                                                {bank.type === 'deposit' ? 'บัญชีฝาก' : 'บัญชีถอน'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-mono font-bold ${Number(bank.balance) > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                                                {formatBaht(bank.balance || 0)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleToggleStatus(bank)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${bank.isActive ? 'bg-emerald-500' : 'bg-slate-200'
                                                    }`}
                                            >
                                                <span className={`${bank.isActive ? 'translate-x-6' : 'translate-x-1'
                                                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEdit(bank)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="แก้ไข"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(bank.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="ลบ"
                                                >
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
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 relative shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer p-1 hover:bg-slate-100 rounded-full transition-colors" onClick={() => setIsModalOpen(false)}>
                            <X size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-6 text-slate-800">{editingBank ? 'แก้ไขบัญชี' : 'เพิ่มบัญชีใหม่'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ธนาคาร</label>
                                <div className="space-y-2">
                                    <select
                                        required
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                                        value={formData.bankName}
                                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                    >
                                        <option value="">-- เลือกธนาคาร --</option>
                                        <option value="KBANK">ธนาคารกสิกรไทย (KBANK)</option>
                                        <option value="SCB">ธนาคารไทยพาณิชย์ (SCB)</option>
                                        <option value="BBL">ธนาคารกรุงเทพ (BBL)</option>
                                        <option value="KTB">ธนาคารกรุงไทย (KTB)</option>
                                        <option value="BAY">ธนาคารกรุงศรีอยุธยา (BAY)</option>
                                        <option value="TMB">ธนาคารทหารไทยธนชาต (TTB)</option>
                                        <option value="GSB">ธนาคารออมสิน (GSB)</option>
                                        <option value="BAAC">ธ.ก.ส. (BAAC)</option>
                                        <option value="LHBANK">ธนาคารแลนด์แอนด์เฮ้าส์ (LH)</option>
                                        <option value="CIMB">ธนาคารซีไอเอ็มบี (CIMB)</option>
                                        <option value="UOB">ธนาคารยูโอบี (UOB)</option>
                                        <option value="TISCO">ธนาคารทิสโก้ (TISCO)</option>
                                    </select>

                                    {formData.bankName && (
                                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <BankLogo bankCode={formData.bankName} width={40} height={40} />
                                            <span className="text-sm font-medium text-slate-600">ตัวอย่างโลโก้</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">เลขบัญชี</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                                        value={formData.accountNumber}
                                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ยอดเงินเริ่มต้น</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                                        value={formData.balance}
                                        onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อบัญชี</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                                    value={formData.accountName}
                                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ประเภท</label>
                                <select
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="deposit">บัญชีฝาก (ลูกค้าโอนเข้า)</option>
                                    <option value="withdraw">บัญชีถอน (โอนให้ลูกค้า)</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium shadow-lg shadow-slate-900/20 transition-all active:scale-95"
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

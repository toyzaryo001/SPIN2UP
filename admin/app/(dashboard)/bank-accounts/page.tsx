"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { formatBaht } from "@/lib/utils";
import toast from "react-hot-toast";
import BankLogo from "@/components/BankLogo";

export default function BankAccountsPage() {
    const [banks, setBanks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBank, setEditingBank] = useState<any>(null);

    // Form state
    const [formData, setFormData] = useState({
        bankName: "",
        accountName: "",
        accountNumber: "",
        type: "deposit", // deposit, withdraw
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
            if (editingBank) {
                await api.put(`/admin/settings/banks/${editingBank.id}`, formData);
            } else {
                await api.post("/admin/settings/banks", formData);
            }
            setIsModalOpen(false);
            setEditingBank(null);
            setFormData({ bankName: "", accountName: "", accountNumber: "", type: "deposit" });
            fetchBanks();
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
        } catch (error) {
            console.error("Delete bank error:", error);
        }
    };

    const openEdit = (bank: any) => {
        setEditingBank(bank);
        setFormData({
            bankName: bank.bankName,
            accountName: bank.accountName,
            accountNumber: bank.accountNumber,
            type: bank.type,
        });
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">จัดการบัญชีหน้าเว็บ</h2>
                <button
                    onClick={() => {
                        setEditingBank(null);
                        setFormData({ bankName: "", accountName: "", accountNumber: "", type: "deposit" });
                        setIsModalOpen(true);
                    }}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors"
                >
                    <Plus size={20} />
                    เพิ่มบัญชี
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {banks.map((bank) => (
                    <div key={bank.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
                        {/* Background Logo Effect */}
                        <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
                            <BankLogo bankCode={bank.bankName} width={120} height={120} />
                        </div>

                        <div className="flex justify-between items-start mb-4">
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${bank.type === 'deposit' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                {bank.type === 'deposit' ? 'บัญชีฝาก' : 'บัญชีถอน'}
                            </div>
                            <div className="flex gap-2 relative z-10">
                                <button onClick={() => openEdit(bank)} className="text-slate-400 hover:text-blue-600">
                                    <Edit2 size={18} />
                                </button>
                                <button onClick={() => handleDelete(bank.id)} className="text-slate-400 hover:text-red-600">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center p-2 border border-slate-100">
                                <BankLogo bankCode={bank.bankName} width={40} height={40} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{bank.bankName}</h3>
                                <p className="text-slate-500 text-sm">{bank.accountName}</p>
                            </div>
                        </div>

                        <p className="text-lg font-mono text-slate-700 bg-slate-50 p-2 rounded text-center border border-slate-100">
                            {bank.accountNumber}
                        </p>

                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-sm text-slate-400">สถานะ</span>
                            <span className={`flex items-center gap-1 text-sm font-medium ${bank.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {bank.isActive ? <Check size={16} /> : <X size={16} />}
                                {bank.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
                        <div className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer" onClick={() => setIsModalOpen(false)}>
                            <X size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-6">{editingBank ? 'แก้ไขบัญชี' : 'เพิ่มบัญชีใหม่'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ธนาคาร (โลโก้แสดงอัตโนมัติ)</label>
                                <div className="space-y-2">
                                    <select
                                        required
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900"
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
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">เลขบัญชี</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900"
                                    value={formData.accountNumber}
                                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อบัญชี</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900"
                                    value={formData.accountName}
                                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ประเภท</label>
                                <select
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="deposit">บัญชีฝาก (ลูกค้าโอนเข้า)</option>
                                    <option value="withdraw">บัญชีถอน (โอนให้ลูกค้า)</option>
                                </select>
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
                                    className="flex-1 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
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

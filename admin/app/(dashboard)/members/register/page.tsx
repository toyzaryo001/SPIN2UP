"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { UserPlus, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function MemberRegisterPage() {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        fullName: "",
        phone: "",
        password: "",
        confirmPassword: "",
        bankName: "",
        bankAccount: "",
        lineId: "",
        referrerCode: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            alert("รหัสผ่านไม่ตรงกัน");
            return;
        }

        if (!formData.fullName || !formData.phone || !formData.bankName || !formData.bankAccount || !formData.password) {
            alert("กรุณากรอกข้อมูลให้ครบ");
            return;
        }

        setIsSaving(true);
        try {
            const res = await api.post("/admin/users", formData);
            if (res.data.success) {
                alert("สร้างสมาชิกสำเร็จ!");
                router.push("/members");
            }
        } catch (error: any) {
            console.error("Create error:", error);
            alert(error.response?.data?.message || "เกิดข้อผิดพลาด");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/members" className="p-2 hover:bg-slate-100 rounded-lg">
                    <ArrowLeft size={20} />
                </Link>
                <h2 className="text-2xl font-bold text-slate-800">สมัครสมาชิกใหม่</h2>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 max-w-2xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                            <UserPlus size={24} className="text-yellow-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">กรอกข้อมูลสมาชิกใหม่</h3>
                            <p className="text-sm text-slate-400">Username จะถูกสร้างอัตโนมัติจาก Prefix + เบอร์โทร 6 ตัวท้าย</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ-นามสกุล *</label>
                            <input
                                type="text"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                placeholder="ชื่อจริง นามสกุล"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทร *</label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                placeholder="0812345678"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">ธนาคาร *</label>
                            <select
                                value={formData.bankName}
                                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                            >
                                <option value="">-- เลือกธนาคาร --</option>
                                <option value="KBANK">กสิกรไทย (KBANK)</option>
                                <option value="SCB">ไทยพาณิชย์ (SCB)</option>
                                <option value="KTB">กรุงไทย (KTB)</option>
                                <option value="BBL">กรุงเทพ (BBL)</option>
                                <option value="TTB">ทหารไทยธนชาต (TTB)</option>
                                <option value="BAY">กรุงศรีอยุธยา (BAY)</option>
                                <option value="GSB">ออมสิน (GSB)</option>
                                <option value="BAAC">ธ.ก.ส. (BAAC)</option>
                                <option value="GHB">อาคารสงเคราะห์ (GHB)</option>
                                <option value="CIMB">ซีไอเอ็มบี (CIMB)</option>
                                <option value="UOB">ยูโอบี (UOB)</option>
                                <option value="TISCO">ทิสโก้ (TISCO)</option>
                                <option value="KKP">เกียรตินาคินภัทร (KKP)</option>
                                <option value="LH">แลนด์ แอนด์ เฮ้าส์ (LH)</option>
                                <option value="ICBC">ไอซีบีซี (ICBC)</option>
                                <option value="SME">SME Bank</option>
                                <option value="ISBT">อิสลามแห่งประเทศไทย</option>
                                <option value="TRUEWALLET">True Wallet</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">เลขบัญชี *</label>
                            <input
                                type="text"
                                value={formData.bankAccount}
                                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                placeholder="xxx-x-xxxxx-x"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">รหัสผ่าน *</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">ยืนยันรหัสผ่าน *</label>
                            <input
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">ID Line (ถ้ามี)</label>
                            <input
                                type="text"
                                value={formData.lineId}
                                onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">รหัสแนะนำ (ถ้ามี)</label>
                            <input
                                type="text"
                                value={formData.referrerCode}
                                onChange={(e) => setFormData({ ...formData, referrerCode: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Link href="/members" className="flex-1 px-4 py-3 border border-slate-200 rounded-lg text-center hover:bg-slate-50">
                            ยกเลิก
                        </Link>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 px-4 py-3 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Save size={20} />
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

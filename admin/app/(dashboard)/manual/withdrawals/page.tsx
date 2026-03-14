"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { formatBaht, formatDate } from "@/lib/utils";
import { AlertCircle, AlertTriangle, Check, Clock, RefreshCw, Search, X } from "lucide-react";
import toast from "react-hot-toast";

interface Withdrawal {
    id: number;
    userId: number;
    user: {
        username: string;
        fullName: string;
        bankName: string;
        bankAccount: string;
    };
    amount: number;
    status: string;
    createdAt: string;
    note?: string;
    settleStatus?: string | null;
    settledExternalUsername?: string | null;
    settledAgent?: { id: number; code: string; name: string } | null;
}

type ModalType = "APPROVE" | "REJECT" | null;
type RejectMode = "RETURN_TO_GAME" | "KEEP_IN_WEB_WALLET";

export default function PendingWithdrawalsPage() {
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedTx, setSelectedTx] = useState<Withdrawal | null>(null);
    const [modalType, setModalType] = useState<ModalType>(null);
    const [approveMode, setApproveMode] = useState<"manual" | "auto">("manual");
    const [rejectReason, setRejectReason] = useState("");
    const [rejectMode, setRejectMode] = useState<RejectMode>("RETURN_TO_GAME");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [adminPermissions, setAdminPermissions] = useState<any>(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    const hasPerm = (action: string) => {
        if (isSuperAdmin) return true;
        const p = adminPermissions?.manual?.[action];
        if (!p) return false;
        if (typeof p === "boolean") return p;
        return !!p.manage;
    };

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const res = await api.get("/admin/me");
                if (res.data.success && res.data.data) {
                    setAdminPermissions(res.data.data.permissions || {});
                    setIsSuperAdmin(
                        res.data.data.isSuperAdmin === true ||
                        res.data.data.role?.name === "SUPER_ADMIN"
                    );
                }
            } catch (error) {
                console.error(error);
            }
        };

        fetchAdminData();
        fetchWithdrawals();
    }, []);

    const fetchWithdrawals = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/transactions/pending-withdrawals");
            if (res.data.success) {
                setWithdrawals(res.data.data);
            }
        } catch (error) {
            console.error("Fetch withdrawals error:", error);
        } finally {
            setLoading(false);
        }
    };

    const openApproveModal = (tx: Withdrawal) => {
        setSelectedTx(tx);
        setModalType("APPROVE");
        setApproveMode("manual");
    };

    const openRejectModal = (tx: Withdrawal) => {
        setSelectedTx(tx);
        setModalType("REJECT");
        setRejectReason("");
        setRejectMode("RETURN_TO_GAME");
    };

    const closeModal = () => {
        setSelectedTx(null);
        setModalType(null);
        setIsSubmitting(false);
    };

    const handleConfirmApprove = async () => {
        if (!selectedTx) return;
        setIsSubmitting(true);
        try {
            const res = await api.post("/admin/manual/approve-withdrawal", {
                transactionId: selectedTx.id,
                mode: approveMode,
            });

            if (res.data.success) {
                toast.success(res.data.message);
                fetchWithdrawals();
                closeModal();
            } else {
                toast.error(res.data.message || "เกิดข้อผิดพลาด");
            }
        } catch (error: any) {
            console.error("Approve error:", error);
            toast.error(error.response?.data?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmReject = async () => {
        if (!selectedTx) return;
        setIsSubmitting(true);
        try {
            const res = await api.post("/admin/manual/reject-withdrawal", {
                transactionId: selectedTx.id,
                note: rejectReason,
                rejectMode,
            });

            if (res.data.success) {
                toast.success(res.data.message);
                fetchWithdrawals();
                closeModal();
            } else {
                toast.error(res.data.message || "เกิดข้อผิดพลาด");
            }
        } catch (error: any) {
            console.error("Reject error:", error);
            toast.error(error.response?.data?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filtered = withdrawals.filter((w) =>
        w.user.username.toLowerCase().includes(search.toLowerCase()) ||
        (w.user.fullName || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 relative">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Clock size={20} className="text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">รายการรอถอน</h2>
                        <p className="text-sm text-slate-400">{withdrawals.length} รายการรอดำเนินการ</p>
                    </div>
                </div>
                <button onClick={fetchWithdrawals} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                    <RefreshCw size={20} />
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg"
                        placeholder="ค้นหา username หรือชื่อ..."
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-4 text-left">วันเวลา</th>
                            <th className="px-6 py-4 text-left">สมาชิก</th>
                            <th className="px-6 py-4 text-left">ปลายทาง</th>
                            <th className="px-6 py-4 text-right">จำนวนเงิน</th>
                            <th className="px-6 py-4 text-center">ดำเนินการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">กำลังโหลด...</td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">ไม่มีรายการรอถอน</td>
                            </tr>
                        ) : (
                            filtered.map((w) => (
                                <tr key={w.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-500">{formatDate(w.createdAt)}</td>
                                    <td className="px-6 py-4">
                                        <p className="font-medium">{w.user.username}</p>
                                        <p className="text-xs text-slate-400">{w.user.fullName || "-"}</p>
                                        <p className="text-xs text-slate-400">
                                            กระดาน: {w.settledAgent?.code || "-"}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-medium">{w.user.bankName}</p>
                                        <p className="text-xs text-slate-400">{w.user.bankAccount}</p>
                                        <p className="text-xs text-slate-400">
                                            สถานะ settle: {w.settleStatus || "PENDING"}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-bold text-lg text-red-600">{formatBaht(w.amount)}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => openApproveModal(w)}
                                                disabled={!hasPerm("withdrawals")}
                                                className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Check size={14} /> อนุมัติ
                                            </button>
                                            <button
                                                onClick={() => openRejectModal(w)}
                                                disabled={!hasPerm("withdrawals")}
                                                className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <X size={14} /> ปฏิเสธ
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {modalType === "APPROVE" && selectedTx && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-emerald-50 p-6 border-b border-emerald-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <Check size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-emerald-900">ยืนยันการอนุมัติถอนเงิน</h3>
                                <p className="text-sm text-emerald-700">รายการ #{selectedTx.id}</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-sm border border-slate-100">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">สมาชิก:</span>
                                    <span className="font-medium text-right">
                                        {selectedTx.user.username}
                                        <br />
                                        <span className="text-xs text-slate-400">{selectedTx.user.fullName || "-"}</span>
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">ปลายทาง:</span>
                                    <span className="font-medium text-right">
                                        {selectedTx.user.bankName}
                                        <br />
                                        {selectedTx.user.bankAccount}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">กระดานที่ settle:</span>
                                    <span className="font-medium text-right">{selectedTx.settledAgent?.code || "-"}</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                                    <span className="text-slate-500">ยอดถอน:</span>
                                    <span className="font-bold text-lg text-red-600">{formatBaht(selectedTx.amount)}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-700">เลือกวิธีการโอนเงินจริง</label>

                                <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${approveMode === "manual" ? "border-emerald-500 bg-emerald-50/50" : "border-slate-100 hover:border-slate-200"}`}>
                                    <input
                                        type="radio"
                                        name="approveMode"
                                        value="manual"
                                        checked={approveMode === "manual"}
                                        onChange={() => setApproveMode("manual")}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-medium text-slate-900">โอนเอง (Manual)</div>
                                        <div className="text-xs text-slate-500">ใช้เมื่อผู้รับผิดชอบจะโอนเงินจริงเอง</div>
                                    </div>
                                </label>

                                <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${approveMode === "auto" ? "border-emerald-500 bg-emerald-50/50" : "border-slate-100 hover:border-slate-200"}`}>
                                    <input
                                        type="radio"
                                        name="approveMode"
                                        value="auto"
                                        checked={approveMode === "auto"}
                                        onChange={() => setApproveMode("auto")}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-medium text-slate-900">โอนอัตโนมัติ (Gateway)</div>
                                        <div className="text-xs text-slate-500">ใช้เฉพาะเมื่อ gateway ฝั่งถอนพร้อมใช้งาน</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 flex justify-end gap-2 border-t border-slate-100">
                            <button onClick={closeModal} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium">ยกเลิก</button>
                            <button
                                onClick={handleConfirmApprove}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? "กำลังดำเนินการ..." : "ยืนยันอนุมัติ"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {modalType === "REJECT" && selectedTx && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-red-50 p-6 border-b border-red-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-red-900">ยืนยันการปฏิเสธ</h3>
                                <p className="text-sm text-red-700">รายการ #{selectedTx.id}</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-sm border border-slate-100">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">ยอดเงิน:</span>
                                    <span className="font-bold text-red-600">{formatBaht(selectedTx.amount)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">กระดานล่าสุด:</span>
                                    <span className="font-medium">{selectedTx.settledAgent?.code || "-"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">ยูสในกระดาน:</span>
                                    <span className="font-medium">{selectedTx.settledExternalUsername || "-"}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">เหตุผลที่ปฏิเสธ (ไม่บังคับ)</label>
                                <textarea
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm"
                                    rows={3}
                                    placeholder="เช่น ข้อมูลปลายทางไม่ถูกต้อง, ทำรายการซ้ำ, รอตรวจสอบเพิ่มเติม"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-700">รูปแบบการคืนยอด</label>

                                <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${rejectMode === "RETURN_TO_GAME" ? "border-red-500 bg-red-50/60" : "border-slate-100 hover:border-slate-200"}`}>
                                    <input
                                        type="radio"
                                        name="rejectMode"
                                        checked={rejectMode === "RETURN_TO_GAME"}
                                        onChange={() => setRejectMode("RETURN_TO_GAME")}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-medium text-sm text-slate-900">คืนยอดกลับเข้าเกม</div>
                                        <div className="text-xs text-slate-500">เติมเครดิตกลับเข้ากระดานล่าสุดเพื่อให้ลูกค้าเล่นต่อได้ทันที</div>
                                    </div>
                                </label>

                                <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${rejectMode === "KEEP_IN_WEB_WALLET" ? "border-amber-500 bg-amber-50/60" : "border-slate-100 hover:border-slate-200"}`}>
                                    <input
                                        type="radio"
                                        name="rejectMode"
                                        checked={rejectMode === "KEEP_IN_WEB_WALLET"}
                                        onChange={() => setRejectMode("KEEP_IN_WEB_WALLET")}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-medium text-sm text-slate-900">ไม่คืนยอดกลับเข้าเกม</div>
                                        <div className="text-xs text-slate-500">เงินจะกลับไปอยู่ในกระเป๋าปกติของเว็บ และจะย้ายเข้าเกมอีกครั้งเมื่อเข้าเล่นใหม่</div>
                                    </div>
                                </label>
                            </div>

                            {rejectMode === "KEEP_IN_WEB_WALLET" && (
                                <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-700 text-xs rounded-lg">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                    <span>รายการนี้จะไม่เติมเครดิตกลับเข้ากระดานทันที แต่ยอดจะกลับไปอยู่ในกระเป๋าปกติของเว็บก่อน</span>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 flex justify-end gap-2 border-t border-slate-100">
                            <button onClick={closeModal} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium">ยกเลิก</button>
                            <button
                                onClick={handleConfirmReject}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? "กำลังดำเนินการ..." : "ยืนยันปฏิเสธ"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";

import { useState } from 'react';
import { Plus, CreditCard, ExternalLink, Settings } from 'lucide-react';

export default function PaymentPage() {
    const [showAddModal, setShowAddModal] = useState(false);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">จัดการระบบชำระเงิน</h2>
                    <p className="text-slate-500">เชื่อมต่อและตั้งค่าบริการชำระเงินภายนอก (Payment Gateway)</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2.5 rounded-lg shadow-md transition-all active:scale-95"
                >
                    <Plus size={20} />
                    <span>เพิ่มบริการชำระเงิน</span>
                </button>
            </div>

            {/* Content Area - Placeholder for now */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Placeholder Card */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center h-64 text-slate-400 border-dashed">
                    <CreditCard size={48} className="mb-4 opacity-20" />
                    <p className="font-medium">ยังไม่มีบริการชำระเงินที่เชื่อมต่อ</p>
                    <p className="text-sm mt-1">กดปุ่ม "เพิ่มบริการชำระเงิน" เพื่อเริ่มต้น</p>
                </div>
            </div>

            {/* Add Modal (Mockup) */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">เลือกบริการชำระเงิน</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                                ✕
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <CreditCard size={20} />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-700">GB Prime Pay</div>
                                    <div className="text-xs text-slate-500">QR Payment, Credit Card</div>
                                </div>
                            </button>
                            <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group">
                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                    <Settings size={20} />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-700">Custom API</div>
                                    <div className="text-xs text-slate-500">เชื่อมต่อผ่าน API กำหนดเอง</div>
                                </div>
                            </button>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

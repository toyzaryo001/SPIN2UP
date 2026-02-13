"use client";

import { useState, useEffect } from 'react';
import { CreditCard, Settings, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PaymentGateway {
    id: number;
    code: string;
    name: string;
    config: string;
    isActive: boolean;
    logo?: string;
}

export default function PaymentPage() {
    const [gateways, setGateways] = useState<PaymentGateway[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
    const [configForm, setConfigForm] = useState<any>({});

    const fetchGateways = async () => {
        setIsLoading(true);
        try {
            const res = await api.payment.getGateways();
            if (res.data.success) {
                setGateways(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch gateways', error);
            toast.error('โหลดข้อมูลไม่สำเร็จ');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGateways();
    }, []);

    const handleToggle = async (id: number) => {
        try {
            const res = await api.payment.toggleGateway(id);
            if (res.data.success) {
                toast.success('อัพเดทสถานะเรียบร้อย');
                setGateways(prev => prev.map(g =>
                    g.id === id ? { ...g, isActive: !g.isActive } : g
                ));
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
        }
    };

    const handleEdit = (gateway: PaymentGateway) => {
        let parsedConfig = {};
        try {
            parsedConfig = JSON.parse(gateway.config);
        } catch (e) {
            parsedConfig = {};
        }
        setConfigForm(parsedConfig);
        setEditingGateway(gateway);
    };

    const handleSaveConfig = async () => {
        if (!editingGateway) return;

        try {
            const res = await api.payment.updateGateway(editingGateway.id, {
                name: editingGateway.name,
                config: JSON.stringify(configForm),
                isActive: editingGateway.isActive
            });

            if (res.data.success) {
                toast.success('บันทึกการตั้งค่าเรียบร้อย');
                setEditingGateway(null);
                fetchGateways(); // Refresh
            }
        } catch (error) {
            toast.error('บันทึกไม่สำเร็จ');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">จัดการระบบชำระเงิน</h2>
                    <p className="text-slate-500">เชื่อมต่อและตั้งค่าบริการชำระเงินภายนอก (Payment Gateway)</p>
                </div>
                <button
                    onClick={fetchGateways}
                    className="flex items-center gap-2 bg-white text-slate-600 border border-slate-200 px-4 py-2.5 rounded-lg hover:bg-slate-50 transition-all"
                >
                    <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                    <span>รีเฟรช</span>
                </button>
            </div>

            {/* Gateways List */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <RefreshCw className="animate-spin text-slate-400" size={32} />
                </div>
            ) : gateways.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                    <p>ไม่พบ Gateway ในระบบ (กรุณาเพิ่มข้อมูลในฐานข้อมูล)</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {gateways.map(gateway => (
                        <div key={gateway.id} className={cn(
                            "bg-white rounded-xl border shadow-sm transition-all overflow-hidden",
                            gateway.isActive ? "border-blue-200 shadow-blue-50" : "border-slate-200 opacity-80"
                        )}>
                            <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", gateway.isActive ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400")}>
                                        <CreditCard size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{gateway.name}</h3>
                                        <p className="text-xs text-slate-500 font-mono uppercase">{gateway.code}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-xs font-bold",
                                        gateway.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                                    )}>
                                        {gateway.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                                    </span>
                                </div>
                            </div>

                            <div className="p-5 bg-slate-50/50 space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">API Configured</span>
                                    {gateway.config && gateway.config !== '{}' ? (
                                        <span className="text-green-600 flex items-center gap-1"><CheckCircle size={14} /> Yes</span>
                                    ) : (
                                        <span className="text-red-500 flex items-center gap-1"><AlertCircle size={14} /> No</span>
                                    )}
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => handleToggle(gateway.id)}
                                        className={cn(
                                            "flex-1 py-2 rounded-lg text-sm font-medium border transition-colors",
                                            gateway.isActive
                                                ? "border-red-200 text-red-600 hover:bg-red-50"
                                                : "border-green-200 text-green-600 hover:bg-green-50"
                                        )}
                                    >
                                        {gateway.isActive ? 'ปิดการใช้งาน' : 'เปิดใช้งาน'}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(gateway)}
                                        className="flex-1 bg-slate-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Settings size={16} /> ตั้งค่า
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {editingGateway && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">ตั้งค่า {editingGateway.name}</h3>
                            <button onClick={() => setEditingGateway(null)} className="text-slate-400 hover:text-slate-600">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="space-y-4">
                                {editingGateway.code === 'bibpay' ? (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-slate-700">API Key</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                                value={configForm.apiKey || ''}
                                                onChange={e => setConfigForm({ ...configForm, apiKey: e.target.value })}
                                                placeholder="Enter API Key"
                                            />
                                            <p className="text-xs text-slate-400">คีย์สำหรับเชื่อมต่อ API ของ BIBPAY</p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-slate-700">Callback URL (Optional)</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                                value={configForm.callbackUrl || ''}
                                                onChange={e => setConfigForm({ ...configForm, callbackUrl: e.target.value })}
                                                placeholder="https://..."
                                            />
                                            <p className="text-xs text-slate-400">ปล่อยว่างเพื่อใช้ค่า Default ของระบบ</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700">Configuration (JSON)</label>
                                        <textarea
                                            className="w-full h-40 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xs"
                                            value={JSON.stringify(configForm, null, 2)}
                                            onChange={e => {
                                                try {
                                                    const parsed = JSON.parse(e.target.value);
                                                    setConfigForm(parsed);
                                                } catch (err) {
                                                    // Allow typing invalid json
                                                }
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setEditingGateway(null)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">
                                ยกเลิก
                            </button>
                            <button onClick={handleSaveConfig} className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-colors font-medium">
                                บันทึกการตั้งค่า
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

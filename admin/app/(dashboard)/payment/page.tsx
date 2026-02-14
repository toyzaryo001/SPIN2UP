"use client";

import { useState, useEffect } from 'react';
import { CreditCard, Settings, RefreshCw, CheckCircle, XCircle, AlertCircle, Plus, Trash2, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { cn, formatBaht } from '@/lib/utils';
import { toast } from 'sonner';

interface PaymentGateway {
    id: number;
    code: string;
    name: string;
    config: string;
    isActive: boolean;
    logo?: string;
    // Parsed from config
    canDeposit?: boolean;
    canWithdraw?: boolean;
}

const SUPPORTED_PROVIDERS = [
    { code: 'bibpay', name: 'BIBPAY QR', description: 'ระบบ QR Code อัตโนมัติ' }
];

export default function PaymentPage() {
    const [gateways, setGateways] = useState<PaymentGateway[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal States
    const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

    // Balance States
    const [balances, setBalances] = useState<Record<number, number>>({});
    const [loadingBalances, setLoadingBalances] = useState<Record<number, boolean>>({});

    // Forms
    const [configForm, setConfigForm] = useState<any>({});
    const [addForm, setAddForm] = useState({ name: '', apiKey: '', secretKey: '', apiEndpoint: '' });

    const fetchBalance = async (id: number) => {
        setLoadingBalances(prev => ({ ...prev, [id]: true }));
        try {
            const res = await api.payment.getGatewayBalance(id);
            if (res.data.success) {
                setBalances(prev => ({ ...prev, [id]: res.data.data.balance }));
            }
        } catch (error) {
            console.error(`Failed to fetch balance for gateway ${id}`, error);
        } finally {
            setLoadingBalances(prev => ({ ...prev, [id]: false }));
        }
    };

    const fetchGateways = async () => {
        setIsLoading(true);
        try {
            const res = await api.payment.getGateways();
            if (res.data.success) {
                const data = res.data.data.map((g: any) => {
                    let parsedConfig = {};
                    try { parsedConfig = JSON.parse(g.config); } catch { }
                    return {
                        ...g,
                        canDeposit: (parsedConfig as any).canDeposit !== false, // Default true if undefined
                        canWithdraw: (parsedConfig as any).canWithdraw !== false // Default true if undefined
                    };
                });
                setGateways(data);
                // Fetch balances for active gateways
                data.forEach((g: PaymentGateway) => {
                    if (g.isActive && g.config && g.config !== '{}') {
                        fetchBalance(g.id);
                    }
                });
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

    const updateGatewayConfig = async (id: number, newConfig: any) => {
        const gateway = gateways.find(g => g.id === id);
        if (!gateway) return;

        try {
            // Merge new config with existing parsed config
            let currentConfig = {};
            try { currentConfig = JSON.parse(gateway.config); } catch { }

            const updatedConfig = { ...currentConfig, ...newConfig };

            const res = await api.payment.updateGateway(id, {
                name: gateway.name,
                config: JSON.stringify(updatedConfig),
                isActive: gateway.isActive
            });

            if (res.data.success) {
                toast.success('บันทึกการตั้งค่าเรียบร้อย');
                // Update local state
                setGateways(prev => prev.map(g => {
                    if (g.id === id) {
                        return {
                            ...g,
                            config: JSON.stringify(updatedConfig),
                            canDeposit: updatedConfig.canDeposit !== false,
                            canWithdraw: updatedConfig.canWithdraw !== false
                        };
                    }
                    return g;
                }));
            }
        } catch (error) {
            toast.error('บันทึกการตั้งค่าไม่สำเร็จ');
        }
    };

    const handleToggleDeposit = (id: number, currentValue: boolean) => {
        updateGatewayConfig(id, { canDeposit: !currentValue });
    };

    const handleToggleWithdraw = (id: number, currentValue: boolean) => {
        updateGatewayConfig(id, { canWithdraw: !currentValue });
    };

    const handleToggleStatus = async (id: number) => {
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

    const handleDelete = async (id: number) => {
        if (!confirm('คุณต้องการลบ Payment Gateway นี้ใช่หรือไม่?')) return;
        try {
            const res = await api.payment.deleteGateway(id);
            if (res.data.success) {
                toast.success('ลบข้อมูลเรียบร้อย');
                fetchGateways();
            }
        } catch (error) {
            toast.error('ลบข้อมูลไม่สำเร็จ');
        }
    }

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
                fetchGateways();
            }
        } catch (error) {
            toast.error('บันทึกไม่สำเร็จ');
        }
    };

    const handleAddGateway = async () => {
        if (!selectedProvider) return;

        try {
            const provider = SUPPORTED_PROVIDERS.find(p => p.code === selectedProvider);
            const config = {
                apiKey: addForm.apiKey,
                secretKey: addForm.secretKey,
                apiEndpoint: addForm.apiEndpoint,
                canDeposit: true,
                canWithdraw: true
            };

            const res = await api.payment.createGateway({
                code: selectedProvider,
                name: addForm.name || provider?.name,
                config: JSON.stringify(config)
            });

            if (res.data.success) {
                toast.success('เพิ่ม Payment Gateway เรียบร้อย');
                setShowAddModal(false);
                setSelectedProvider(null);
                setAddForm({ name: '', apiKey: '', secretKey: '', apiEndpoint: '' });
                fetchGateways();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'เพิ่มข้อมูลไม่สำเร็จ');
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
                <div className="flex gap-2">
                    <button
                        onClick={fetchGateways}
                        className="flex items-center gap-2 bg-white text-slate-600 border border-slate-200 px-4 py-2.5 rounded-lg hover:bg-slate-50 transition-all"
                    >
                        <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                        <span className="hidden sm:inline">รีเฟรช</span>
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                    >
                        <Plus size={18} />
                        <span>เพิ่ม Payment</span>
                    </button>
                </div>
            </div>

            {/* Gateways Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                                <th className="px-6 py-4">ผู้ให้บริการ</th>
                                <th className="px-6 py-4 text-center">API Config</th>
                                <th className="px-6 py-4 text-right">ยอดเงินคงเหลือ</th>
                                <th className="px-6 py-4 text-center">ฝากเงิน</th>
                                <th className="px-6 py-4 text-center">ถอนเงิน</th>
                                <th className="px-6 py-4 text-center">สถานะ</th>
                                <th className="px-6 py-4 text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <div className="flex justify-center">
                                            <RefreshCw className="animate-spin text-slate-400" size={24} />
                                        </div>
                                    </td>
                                </tr>
                            ) : gateways.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        ยังไม่มี Payment Gateway
                                    </td>
                                </tr>
                            ) : (
                                gateways.map(gateway => (
                                    <tr key={gateway.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", gateway.isActive ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400")}>
                                                    <CreditCard size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800">{gateway.name}</h3>
                                                    <p className="text-xs text-slate-500 font-mono uppercase">{gateway.code}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {gateway.config && gateway.config !== '{}' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                                                    <CheckCircle size={12} /> Connected
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                                                    <AlertCircle size={12} /> Not Configured
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className="font-mono font-bold text-slate-800">
                                                    {balances[gateway.id] !== undefined
                                                        ? formatBaht(balances[gateway.id])
                                                        : '-.--'}
                                                </span>
                                                <button
                                                    onClick={() => fetchBalance(gateway.id)}
                                                    disabled={loadingBalances[gateway.id]}
                                                    className="p-1 text-slate-400 hover:text-blue-600 rounded-full transition-all"
                                                >
                                                    <RefreshCw size={14} className={loadingBalances[gateway.id] ? "animate-spin text-blue-600" : ""} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleToggleDeposit(gateway.id, gateway.canDeposit || false)}
                                                className={cn(
                                                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
                                                    gateway.canDeposit ? 'bg-emerald-500' : 'bg-slate-200'
                                                )}
                                                title="เปิด/ปิด การฝาก"
                                            >
                                                <span className={cn(
                                                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                    gateway.canDeposit ? 'translate-x-6' : 'translate-x-1'
                                                )} />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleToggleWithdraw(gateway.id, gateway.canWithdraw || false)}
                                                className={cn(
                                                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
                                                    gateway.canWithdraw ? 'bg-amber-500' : 'bg-slate-200'
                                                )}
                                                title="เปิด/ปิด การถอน"
                                            >
                                                <span className={cn(
                                                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                    gateway.canWithdraw ? 'translate-x-6' : 'translate-x-1'
                                                )} />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleToggleStatus(gateway.id)}
                                                className={cn(
                                                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
                                                    gateway.isActive ? 'bg-blue-600' : 'bg-slate-200'
                                                )}
                                                title="เปิด/ปิด ระบบหลัก"
                                            >
                                                <span className={cn(
                                                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                    gateway.isActive ? 'translate-x-6' : 'translate-x-1'
                                                )} />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(gateway)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="ตั้งค่า"
                                                >
                                                    <Settings size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(gateway.id)}
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

            {/* Add Gateway Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">เพิ่ม Payment Gateway</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            {!selectedProvider ? (
                                <div className="space-y-4">
                                    <h4 className="font-medium text-slate-700 mb-4">เลือกผู้ให้บริการ</h4>
                                    <div className="grid gap-3">
                                        {SUPPORTED_PROVIDERS.map(provider => (
                                            <button
                                                key={provider.code}
                                                onClick={() => {
                                                    setSelectedProvider(provider.code);
                                                    setAddForm(prev => ({ ...prev, name: provider.name }));
                                                }}
                                                className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 group-hover:text-blue-600">
                                                        <CreditCard size={20} />
                                                    </div>
                                                    <div>
                                                        <h5 className="font-bold text-slate-800">{provider.name}</h5>
                                                        <p className="text-xs text-slate-500">{provider.description}</p>
                                                    </div>
                                                </div>
                                                <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-500" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in slide-in-from-right-4 duration-200">
                                    <button
                                        onClick={() => setSelectedProvider(null)}
                                        className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-4"
                                    >
                                        ← ย้อนกลับ
                                    </button>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-sm font-medium text-slate-700">ชื่อเรียก (Display Name)</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={addForm.name}
                                                onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-700">API Endpoint</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                                value={addForm.apiEndpoint}
                                                onChange={e => setAddForm({ ...addForm, apiEndpoint: e.target.value })}
                                                placeholder="https://api.example.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-700">Secret Key</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                                value={addForm.secretKey}
                                                onChange={e => setAddForm({ ...addForm, secretKey: e.target.value })}
                                                placeholder="ความลับร้านค้า"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-700">API Key</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                                value={addForm.apiKey}
                                                onChange={e => setAddForm({ ...addForm, apiKey: e.target.value })}
                                                placeholder="PUBLIC_KEY..."
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4 flex justify-end gap-3">
                                        <button
                                            onClick={() => setShowAddModal(false)}
                                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                        >
                                            ยกเลิก
                                        </button>
                                        <button
                                            onClick={handleAddGateway}
                                            className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-700"
                                        >
                                            บันทึก
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal (Preserving logic, styling updated) */}
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
                                            <label className="text-sm font-medium text-slate-700">API Endpoint</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                                value={configForm.apiEndpoint || ''}
                                                onChange={e => setConfigForm({ ...configForm, apiEndpoint: e.target.value })}
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-slate-700">Secret Key</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                                value={configForm.secretKey || ''}
                                                onChange={e => setConfigForm({ ...configForm, secretKey: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-slate-700">API Key</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                                value={configForm.apiKey || ''}
                                                onChange={e => setConfigForm({ ...configForm, apiKey: e.target.value })}
                                            />
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
                                        <div className="flex gap-4 pt-4 border-t border-slate-100">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={configForm.canDeposit !== false}
                                                    onChange={e => setConfigForm({ ...configForm, canDeposit: e.target.checked })}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                />
                                                <span className="text-sm text-slate-700">เปิดรับฝากเงิน</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={configForm.canWithdraw !== false}
                                                    onChange={e => setConfigForm({ ...configForm, canWithdraw: e.target.checked })}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                />
                                                <span className="text-sm text-slate-700">เปิดโอนออก (ถอน)</span>
                                            </label>
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

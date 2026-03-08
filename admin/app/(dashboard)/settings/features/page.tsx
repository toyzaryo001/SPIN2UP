"use client";

import { useState, useEffect } from "react";
import {
    ToggleLeft, ToggleRight, RefreshCw, Settings, AlertCircle, CheckCircle,
    Wallet, Gamepad2, Gift, Users, Bell, Wrench
} from "lucide-react";
import api from "@/lib/api";
import axios from "axios";

interface Feature {
    id: number;
    key: string;
    name: string;
    description: string | null;
    isEnabled: boolean;
    updatedAt: string;
}

interface FeatureCategory {
    id: string;
    label: string;
    icon: React.ReactNode;
    color: string;
    borderColor: string;
    bgColor: string;
    keys: string[];
}

const categories: FeatureCategory[] = [
    {
        id: 'finance',
        label: '💰 การเงิน',
        icon: <Wallet size={20} />,
        color: 'text-yellow-400',
        borderColor: 'border-yellow-500/40',
        bgColor: 'bg-slate-800',
        keys: ['deposit', 'withdraw', 'deposit_bank', 'deposit_truemoney', 'deposit_promptpay', 'auto_deposit', 'auto_withdraw', 'manual_deposit'],
    },
    {
        id: 'games',
        label: '🎮 เกม & เนื้อหา',
        icon: <Gamepad2 size={20} />,
        color: 'text-blue-400',
        borderColor: 'border-blue-500/40',
        bgColor: 'bg-slate-800',
        keys: ['games', 'ranking_board'],
    },
    {
        id: 'promos',
        label: '🎁 โปรโมชั่น & รางวัล',
        icon: <Gift size={20} />,
        color: 'text-purple-400',
        borderColor: 'border-purple-500/40',
        bgColor: 'bg-slate-800',
        keys: ['cashback', 'promotions', 'referral', 'vip', 'streak'],
    },
    {
        id: 'users',
        label: '👥 ระบบผู้ใช้',
        icon: <Users size={20} />,
        color: 'text-cyan-400',
        borderColor: 'border-cyan-500/40',
        bgColor: 'bg-slate-800',
        keys: ['registration'],
    },
    {
        id: 'notify',
        label: '📢 การแจ้งเตือน',
        icon: <Bell size={20} />,
        color: 'text-orange-400',
        borderColor: 'border-orange-500/40',
        bgColor: 'bg-slate-800',
        keys: ['announcement_popup', 'line_notify'],
    },
    {
        id: 'system',
        label: '🔧 ระบบ',
        icon: <Wrench size={20} />,
        color: 'text-red-400',
        borderColor: 'border-red-500/40',
        bgColor: 'bg-slate-800',
        keys: ['maintenance'],
    },
];

export default function FeaturesPage() {
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [adminPermissions, setAdminPermissions] = useState<any>(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    const hasPerm = (action: string) => {
        if (isSuperAdmin) return true;
        const p = adminPermissions?.['settings']?.[action];
        if (!p) return false;
        if (typeof p === 'boolean') return p;
        return !!p.manage;
    };

    const fetchFeatures = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/settings/features");
            setFeatures(res.data.data || []);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 403) {
                setMessage({ type: 'error', text: 'คุณไม่มีสิทธิ์ในการดู Features' });
            } else {
                console.error("Failed to fetch features", error);
            }
        } finally {
            setLoading(false);
        }
    };

    const initFeatures = async () => {
        try {
            await api.post("/admin/settings/features/init");
            await fetchFeatures();
            setMessage({ type: 'success', text: 'สร้าง features เริ่มต้นสำเร็จ' });
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 403) {
                setMessage({ type: 'error', text: 'คุณไม่มีสิทธิ์ในการสร้าง Features' });
            } else {
                setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด' });
            }
        }
    };

    const toggleFeature = async (key: string, currentValue: boolean) => {
        try {
            setUpdating(key);
            await api.put(`/admin/settings/features/${key}`, { isEnabled: !currentValue });
            setFeatures(features.map(f => f.key === key ? { ...f, isEnabled: !currentValue } : f));
            setMessage({ type: 'success', text: `อัปเดตสถานะ ${key} สำเร็จ` });
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 403) {
                setMessage({ type: 'error', text: 'คุณไม่มีสิทธิ์ในการเปลี่ยนสถานะ Features' });
            } else {
                setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการอัปเดต' });
            }
        } finally {
            setUpdating(null);
        }
    };

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const res = await api.get('/admin/me');
                if (res.data.success && res.data.data) {
                    setAdminPermissions(res.data.data.permissions || {});
                    setIsSuperAdmin(res.data.data.isSuperAdmin === true || res.data.data.role?.name === 'SUPER_ADMIN');
                }
            } catch (error) { console.error(error); }
        };
        fetchAdminData();
        fetchFeatures();
    }, []);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // Group features into categories
    const getCategoryFeatures = (cat: FeatureCategory) => {
        return cat.keys
            .map(key => features.find(f => f.key === key))
            .filter(Boolean) as Feature[];
    };

    // Features that don't belong to any category
    const categorizedKeys = categories.flatMap(c => c.keys);
    const uncategorizedFeatures = features.filter(f => !categorizedKeys.includes(f.key));

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Settings className="text-yellow-400" />
                        ควบคุมฟีเจอร์เว็บ
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">เปิด/ปิดฟังก์ชันต่างๆ ในหน้าผู้เล่น</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchFeatures}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm transition-colors"
                    >
                        <RefreshCw size={16} />
                        รีเฟรช
                    </button>
                    <button
                        onClick={initFeatures}
                        disabled={!hasPerm('features')}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-black font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ซิงค์ Features
                    </button>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 transition-all ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {message.text}
                </div>
            )}

            {/* Features by Category */}
            {loading ? (
                <div className="text-center py-10 text-slate-400">กำลังโหลด...</div>
            ) : features.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                    <p>ยังไม่มี features</p>
                    <p className="text-sm mt-2">กดปุ่ม &ldquo;ซิงค์ Features&rdquo; เพื่อสร้าง</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {categories.map(cat => {
                        const catFeatures = getCategoryFeatures(cat);
                        if (catFeatures.length === 0) return null;

                        return (
                            <div key={cat.id} className={`rounded-xl border ${cat.borderColor} ${cat.bgColor} overflow-hidden`}>
                                {/* Category Header */}
                                <div className={`px-5 py-3 border-b ${cat.borderColor} flex items-center gap-3`}>
                                    <span className={cat.color}>{cat.icon}</span>
                                    <h2 className={`font-bold text-base ${cat.color}`}>{cat.label}</h2>
                                    <span className="text-slate-500 text-xs ml-auto">
                                        {catFeatures.filter(f => f.isEnabled).length}/{catFeatures.length} เปิด
                                    </span>
                                </div>

                                {/* Feature Items */}
                                <div className="divide-y divide-slate-700/50">
                                    {catFeatures.map((feature) => (
                                        <div
                                            key={feature.key}
                                            className="px-5 py-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-white text-sm">{feature.name}</h3>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${feature.isEnabled
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'bg-red-500/20 text-red-400'
                                                        }`}>
                                                        {feature.isEnabled ? 'เปิด' : 'ปิด'}
                                                    </span>
                                                </div>
                                                <p className="text-slate-500 text-xs mt-0.5 truncate">{feature.description}</p>
                                            </div>
                                            <button
                                                onClick={() => toggleFeature(feature.key, feature.isEnabled)}
                                                disabled={updating === feature.key || !hasPerm('features')}
                                                className={`ml-4 p-1.5 rounded-lg transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${feature.isEnabled
                                                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                                    }`}
                                            >
                                                {updating === feature.key ? (
                                                    <RefreshCw size={22} className="animate-spin" />
                                                ) : feature.isEnabled ? (
                                                    <ToggleRight size={26} />
                                                ) : (
                                                    <ToggleLeft size={26} />
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Uncategorized Features */}
                    {uncategorizedFeatures.length > 0 && (
                        <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-3">
                                <Settings size={20} className="text-slate-400" />
                                <h2 className="font-bold text-base text-slate-400">อื่นๆ</h2>
                            </div>
                            <div className="divide-y divide-slate-700/50">
                                {uncategorizedFeatures.map((feature) => (
                                    <div
                                        key={feature.key}
                                        className="px-5 py-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-white text-sm">{feature.name}</h3>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${feature.isEnabled
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {feature.isEnabled ? 'เปิด' : 'ปิด'}
                                                </span>
                                            </div>
                                            <p className="text-slate-500 text-xs mt-0.5 truncate">{feature.description}</p>
                                        </div>
                                        <button
                                            onClick={() => toggleFeature(feature.key, feature.isEnabled)}
                                            disabled={updating === feature.key || !hasPerm('features')}
                                            className={`ml-4 p-1.5 rounded-lg transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${feature.isEnabled
                                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                                }`}
                                        >
                                            {updating === feature.key ? (
                                                <RefreshCw size={22} className="animate-spin" />
                                            ) : feature.isEnabled ? (
                                                <ToggleRight size={26} />
                                            ) : (
                                                <ToggleLeft size={26} />
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Info */}
            <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <h4 className="font-bold text-blue-400 mb-2">📌 วิธีใช้งาน</h4>
                <ul className="text-sm text-slate-400 space-y-1">
                    <li>• คลิกปุ่ม toggle เพื่อเปิด/ปิดฟีเจอร์</li>
                    <li>• การเปลี่ยนแปลงจะมีผลทันทีในหน้าผู้เล่น</li>
                    <li>• <span className="text-red-400">โหมดซ่อมบำรุง</span> จะปิดเว็บผู้เล่นทั้งหมด</li>
                    <li>• หมวด <span className="text-yellow-400">การเงิน</span> สามารถเปิด/ปิดช่องทางฝากเงินแต่ละช่องแยกได้</li>
                </ul>
            </div>
        </div>
    );
}

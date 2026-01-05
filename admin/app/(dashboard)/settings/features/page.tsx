"use client";

import { useState, useEffect } from "react";
import { ToggleLeft, ToggleRight, RefreshCw, Settings, AlertCircle, CheckCircle } from "lucide-react";
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

export default function FeaturesPage() {
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
        fetchFeatures();
    }, []);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

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
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm"
                    >
                        <RefreshCw size={16} />
                        รีเฟรช
                    </button>
                    {features.length === 0 && (
                        <button
                            onClick={initFeatures}
                            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-black font-bold text-sm"
                        >
                            สร้าง Features เริ่มต้น
                        </button>
                    )}
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {message.text}
                </div>
            )}

            {/* Features List */}
            {loading ? (
                <div className="text-center py-10 text-slate-400">กำลังโหลด...</div>
            ) : features.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                    <p>ยังไม่มี features</p>
                    <p className="text-sm mt-2">กดปุ่ม &ldquo;สร้าง Features เริ่มต้น&rdquo; เพื่อสร้าง</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {features.map((feature) => (
                        <div
                            key={feature.key}
                            className={`bg-slate-800 rounded-xl p-4 flex items-center justify-between border ${feature.key === 'maintenance'
                                ? 'border-red-500/30'
                                : feature.isEnabled ? 'border-green-500/30' : 'border-slate-700'
                                }`}
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-white">{feature.name}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded ${feature.isEnabled
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        {feature.isEnabled ? 'เปิด' : 'ปิด'}
                                    </span>
                                </div>
                                <p className="text-slate-400 text-sm mt-1">{feature.description}</p>
                                <p className="text-slate-500 text-xs mt-1">Key: {feature.key}</p>
                            </div>
                            <button
                                onClick={() => toggleFeature(feature.key, feature.isEnabled)}
                                disabled={updating === feature.key}
                                className={`p-2 rounded-lg transition-all ${feature.isEnabled
                                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                    }`}
                            >
                                {updating === feature.key ? (
                                    <RefreshCw size={24} className="animate-spin" />
                                ) : feature.isEnabled ? (
                                    <ToggleRight size={28} />
                                ) : (
                                    <ToggleLeft size={28} />
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Info */}
            <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <h4 className="font-bold text-blue-400 mb-2">📌 วิธีใช้งาน</h4>
                <ul className="text-sm text-slate-400 space-y-1">
                    <li>• คลิกปุ่ม toggle เพื่อเปิด/ปิดฟีเจอร์</li>
                    <li>• การเปลี่ยนแปลงจะมีผลทันทีในหน้าผู้เล่น</li>
                    <li>• <span className="text-red-400">โหมดซ่อมบำรุง</span> จะปิดเว็บผู้เล่นทั้งหมด</li>
                </ul>
            </div>
        </div>
    );
}

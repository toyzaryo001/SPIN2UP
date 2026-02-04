"use client";

import { useState } from 'react';
import api from '@/lib/api';
import { Loader2, Download, Gamepad2, CheckCircle2, XCircle, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';

type SyncResult = {
    provider: string;
    success: boolean;
    count?: number;
    new?: number;
    updated?: number;
    error?: string;
};

export default function GameImportPage() {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<SyncResult[] | null>(null);

    const startSync = async () => {
        if (loading) return;
        setLoading(true);
        setResults([]); // Clear previous results

        try {
            toast('🔍 Fetching provider list...', { icon: 'ℹ️' });

            // 1. Get List of Providers to Sync
            const listRes = await api.get('/admin/providers/sync/available');
            if (!listRes.data.success) throw new Error('Failed to get provider list');

            const providers: string[] = listRes.data.data;
            toast.success(`Found ${providers.length} providers. Starting sequential sync...`);

            // 2. Sequential Sync
            for (const provider of providers) {
                // Add placeholder for current sync
                setResults(prev => [
                    ...(prev || []),
                    { provider, success: false, error: 'Syncing...', count: 0, new: 0, updated: 0 }
                ]);

                try {
                    const splitTime = Date.now();
                    const res = await api.post(`/admin/providers/sync/${provider}`);
                    const duration = Date.now() - splitTime;

                    // Update result with success
                    setResults(prev => {
                        const next = [...(prev || [])];
                        const idx = next.findIndex(r => r.provider === provider);
                        if (idx !== -1) {
                            next[idx] = {
                                provider,
                                success: res.data.success,
                                count: res.data.data?.count || 0,
                                new: res.data.data?.new || 0,
                                updated: res.data.data?.updated || 0,
                                error: res.data.success ? undefined : res.data.message
                            };
                        }
                        return next;
                    });

                } catch (err: any) {
                    // Update result with error
                    setResults(prev => {
                        const next = [...(prev || [])];
                        const idx = next.findIndex(r => r.provider === provider);
                        if (idx !== -1) {
                            next[idx] = { provider, success: false, error: err.message || 'Failed' };
                        }
                        return next;
                    });
                }

                // Small delay to prevent UI freezing / rate limits
                await new Promise(r => setTimeout(r, 100));
            }

            toast.success('Smart Sync Completed!');

        } catch (error: any) {
            console.error('Sync error:', error);
            toast.error('Critical error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const getTotalGames = () => {
        if (!results) return 0;
        return results.reduce((acc, curr) => acc + (curr.count || 0), 0);
    };

    const getNewGames = () => {
        if (!results) return 0;
        return results.reduce((acc, curr) => acc + (curr.new || 0), 0);
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur-sm">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">ดึงข้อมูลเกม (Import Games)</h1>
                    <p className="text-slate-400">ดึงข้อมูลรายการเกมจาก Betflix Game Entrance ข้อมูลจะอัปเดตลงในระบบอัตโนมัติ</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Control Panel */}
                <div className="md:col-span-1 p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-sm h-fit">
                    <div className="flex flex-col items-center justify-center space-y-6 py-6">
                        <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shadow-inner relative group">
                            <Download className="w-10 h-10 text-slate-400 group-hover:text-blue-400 transition-colors" />
                            {loading && (
                                <div className="absolute inset-0 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                            )}
                        </div>

                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-medium text-white">Start Synchronization</h3>
                            <p className="text-sm text-slate-400 px-4">
                                ระบบจะทำการดึงไฟล์รายชื่อเกมจาก Server หลัก และอัปเดตลงฐานข้อมูล
                            </p>
                        </div>

                        <button
                            onClick={startSync}
                            disabled={loading}
                            className={`flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold w-full h-12 rounded-lg transition-all shadow-lg hover:shadow-blue-600/20 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    กำลังดึงข้อมูล...
                                </>
                            ) : (
                                <>
                                    <RefreshCcw className="mr-2 h-5 w-5" />
                                    Smart Sync (ดึงทีละค่าย)
                                </>
                            )}
                        </button>

                        <button
                            onClick={async () => {
                                if (!confirm('คุณต้องการลบเกมทั้งหมดใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;
                                if (loading) return;
                                setLoading(true);
                                try {
                                    const res = await api.post('/admin/providers/sync/clear');
                                    if (res.data.success) {
                                        toast.success('ล้างข้อมูลเกมทั้งหมดเรียบร้อย');
                                        setResults(null);
                                    } else {
                                        toast.error(res.data.message);
                                    }
                                } catch (error) {
                                    toast.error('เกิดข้อผิดพลาดในการล้างข้อมูล');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                            className={`flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-semibold w-full h-12 rounded-lg transition-all shadow-lg hover:shadow-red-600/20 ${loading ? 'opacity-70 cursor-not-allowed hidden' : ''}`}
                        >
                            <span className="flex items-center">
                                <span className="mr-2">🗑️</span> ล้างข้อมูลเกม
                            </span>
                        </button>
                    </div>
                </div>

                {/* Status/Result Area */}
                <div className="md:col-span-2 space-y-4">
                    {/* Summary Cards */}
                    {results && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
                                <div className="text-slate-400 text-sm mb-1">Total Games Processed</div>
                                <div className="text-3xl font-bold text-white">{getTotalGames()}</div>
                            </div>
                            <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
                                <div className="text-slate-400 text-sm mb-1">New Games Added</div>
                                <div className="text-3xl font-bold text-green-400">+{getNewGames()}</div>
                            </div>
                        </div>
                    )}

                    {/* Default State */}
                    {!results && !loading && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center text-center h-64 border-dashed">
                            <Gamepad2 className="w-16 h-16 text-slate-700 mb-4" />
                            <h3 className="text-xl font-medium text-slate-500">พร้อมทำงาน</h3>
                            <p className="text-slate-600 mt-2 max-w-sm">กดปุ่ม "เริ่มดึงข้อมูล" เพื่อเริ่มต้นกระบวนการ ข้อมูลจะแสดงผลที่นี่หลังจากทำงานเสร็จสิ้น</p>
                        </div>
                    )}

                    {/* Result List */}
                    {results && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="p-4 border-b border-slate-800 bg-slate-800/20">
                                <h3 className="font-medium text-white">Synchronization Details</h3>
                            </div>
                            <div className="max-h-[500px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700">
                                <div className="space-y-1">
                                    {results.map((res, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 hover:bg-slate-800/30 rounded-lg transition-colors border border-transparent hover:border-slate-800/50">
                                            <div className="flex items-center gap-3">
                                                {res.success ? (
                                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                ) : (
                                                    <XCircle className="w-5 h-5 text-red-500" />
                                                )}
                                                <div>
                                                    <div className="font-medium text-slate-200">
                                                        {res.provider.toUpperCase()}
                                                    </div>
                                                    {res.error && (
                                                        <div className="text-xs text-red-400">{res.error}</div>
                                                    )}
                                                </div>
                                            </div>
                                            {res.success && (
                                                <div className="flex gap-4 text-sm">
                                                    <span className="text-slate-400">Total: <span className="text-white font-medium">{res.count}</span></span>
                                                    <span className="text-slate-400">New: <span className="text-green-400 font-medium">+{res.new}</span></span>
                                                    <span className="text-slate-400">Upd: <span className="text-blue-400 font-medium">{res.updated}</span></span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

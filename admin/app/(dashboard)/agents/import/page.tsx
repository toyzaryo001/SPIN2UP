"use client";

import { useState } from 'react';
import api from '@/lib/api';
import { Loader2, Download, Gamepad2, CheckCircle2, XCircle, RefreshCcw, Server } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'betflix' | 'nexus'>('betflix');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<SyncResult[] | null>(null);

    const startBetflixSync = async () => {
        if (loading) return;
        setLoading(true);
        setResults([]); // Clear previous results

        try {
            toast('🔍 Fetching Betflix provider list...', { icon: 'ℹ️' });

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
                    const res = await api.post(`/admin/providers/sync/${provider}`);

                    // Update result with success
                    setResults(prev => {
                        const next = [...(prev || [])];
                        const idx = next.findIndex(r => r.provider === provider && r.error === 'Syncing...');
                        // Find the specific placeholder we just added (or last one)
                        // Actually, matching by provider name might collide if multiple same names, but usually unique.
                        // Better to findLastIndex
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
                    setResults(prev => {
                        const next = [...(prev || [])];
                        const idx = next.findIndex(r => r.provider === provider && r.error === 'Syncing...');
                        if (idx !== -1) {
                            next[idx] = { provider, success: false, error: err.message || 'Failed' };
                        }
                        return next;
                    });
                }

                // Small delay
                await new Promise(r => setTimeout(r, 100));
            }

            toast.success('Betflix Sync Completed!');

        } catch (error: any) {
            console.error('Sync error:', error);
            toast.error('Critical error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const startNexusSync = async () => {
        if (loading) return;
        setLoading(true);
        setResults([]);

        try {
            toast('🟣 Connecting to Nexus API...', { icon: '🔗' });

            // Nexus Sync is handled by backend in one go (fetching all providers) or we can make it return streaming results?
            // Currently backend /sync/nexus/all returns the array of results at once.
            // So we wait...

            toast.loading('Syncing games from Nexus... This may take a minute...', { id: 'nexus-sync' });

            const res = await api.post('/admin/providers/sync/nexus/all');

            toast.dismiss('nexus-sync');

            if (res.data.success) {
                setResults(res.data.data); // Array of results
                toast.success('Nexus Sync Completed!');
            } else {
                toast.error(res.data.message);
            }

        } catch (error: any) {
            console.error('Nexus Sync error:', error);
            toast.error('Nexus Sync Failed: ' + error.message);
            toast.dismiss('nexus-sync');
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
                    <p className="text-slate-400">ดึงข้อมูลรายการเกมจาก Server หลัก และอัปเดตลงฐานข้อมูล</p>
                </div>
            </div>

            {/* TABS */}
            <div className="flex gap-4 border-b border-slate-700 pb-1">
                <button
                    onClick={() => !loading && setActiveTab('betflix')}
                    className={`px-6 py-3 rounded-t-lg font-bold transition-all flex items-center gap-2 ${activeTab === 'betflix'
                            ? 'bg-slate-800 text-green-400 border-t border-x border-slate-700'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                >
                    <Gamepad2 size={18} /> Betflix Import
                </button>
                <button
                    onClick={() => !loading && setActiveTab('nexus')}
                    className={`px-6 py-3 rounded-t-lg font-bold transition-all flex items-center gap-2 ${activeTab === 'nexus'
                            ? 'bg-slate-800 text-purple-400 border-t border-x border-slate-700'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                >
                    <Server size={18} /> Nexus Import (Direct API)
                </button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Control Panel */}
                <div className="md:col-span-1 p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-sm h-fit">

                    {activeTab === 'betflix' ? (
                        <div className="flex flex-col items-center justify-center space-y-6 py-6 animate-in fade-in">
                            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center border border-green-900/50 shadow-inner relative group">
                                <Download className="w-10 h-10 text-green-600 group-hover:text-green-400 transition-colors" />
                                {loading && <div className="absolute inset-0 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>}
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-medium text-white">Betflix Source</h3>
                                <p className="text-sm text-slate-400 px-4">
                                    ดึงไฟล์รายชื่อเกมจาก Game Entrance URL (Text Files)
                                </p>
                            </div>
                            <button
                                onClick={startBetflixSync}
                                disabled={loading}
                                className={`flex items-center justify-center bg-green-700 hover:bg-green-600 text-white font-semibold w-full h-12 rounded-lg transition-all shadow-lg hover:shadow-green-900/20 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {loading ? (
                                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> กำลังดึงข้อมูล...</>
                                ) : (
                                    <><RefreshCcw className="mr-2 h-5 w-5" /> Start Betflix Sync</>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center space-y-6 py-6 animate-in fade-in">
                            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center border border-purple-900/50 shadow-inner relative group">
                                <Server className="w-10 h-10 text-purple-600 group-hover:text-purple-400 transition-colors" />
                                {loading && <div className="absolute inset-0 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>}
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-medium text-white">Nexus Source</h3>
                                <p className="text-sm text-slate-400 px-4">
                                    ดึงเกมจาก Nexus API โดยตรง (Auto-Assign Agent: Nexus)
                                </p>
                            </div>
                            <button
                                onClick={startNexusSync}
                                disabled={loading}
                                className={`flex items-center justify-center bg-purple-700 hover:bg-purple-600 text-white font-semibold w-full h-12 rounded-lg transition-all shadow-lg hover:shadow-purple-900/20 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {loading ? (
                                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Connecting Nexus...</>
                                ) : (
                                    <><RefreshCcw className="mr-2 h-5 w-5" /> Start Nexus Sync</>
                                )}
                            </button>
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-slate-800">
                        <button
                            onClick={async () => {
                                if (!confirm('⚠️ ล้างข้อมูลเกมทั้งหมด? ต้องดึงใหม่หมดนะ')) return;
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
                            className={`flex items-center justify-center text-red-500 hover:text-red-400 hover:bg-red-950/30 font-semibold w-full h-10 rounded-lg transition-all text-sm ${loading ? 'hidden' : ''}`}
                        >
                            <span className="flex items-center">
                                <span className="mr-2">🗑️</span> ล้างข้อมูลเกม (Clear All)
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
                            <p className="text-slate-600 mt-2 max-w-sm">เลือก Source ฝั่งซ้าย แล้วกดปุ่ม Start Sync ได้เลยครับ</p>
                        </div>
                    )}

                    {/* Result List */}
                    {results && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="p-4 border-b border-slate-800 bg-slate-800/20 flex justify-between items-center">
                                <h3 className="font-medium text-white">Synchronization Details {activeTab === 'nexus' ? '(Nexus)' : '(Betflix)'}</h3>
                                {loading && <span className="text-xs text-blue-400 animate-pulse">Running...</span>}
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

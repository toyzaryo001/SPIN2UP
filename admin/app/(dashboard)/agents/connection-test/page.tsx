"use client";

import { useState } from 'react';
import api from '@/lib/api';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Wifi, ShieldCheck, Server, Globe } from 'lucide-react';

type TestResult = {
    server: { success: boolean; message: string; latency: number };
    auth: { success: boolean; message: string; latency: number };
    config: { apiUrl: string; prefix: string };
};

export default function ConnectionTestPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<TestResult | null>(null);

    const testConnection = async () => {
        setLoading(true);
        setResult(null);
        try {
            const res = await api.get('/admin/agents/connection-test');
            if (res.data.success) {
                setResult(res.data.data);
            } else {
                // Handle unexpected structure
                setResult({
                    server: { success: false, message: 'Invalid Response', latency: 0 },
                    auth: { success: false, message: 'Invalid Response', latency: 0 },
                    config: { apiUrl: 'Unknown', prefix: 'Unknown' }
                });
            }
        } catch (error: any) {
            setResult({
                server: { success: false, message: 'Request Failed', latency: 0 },
                auth: { success: false, message: 'Skipped', latency: 0 },
                config: { apiUrl: 'Unknown', prefix: 'Unknown' }
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur-sm">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">ทดสอบการเชื่อมต่อ (Connection Test)</h1>
                    <p className="text-slate-400">ตรวจสอบสถานะ Server และสิทธิ์การเข้าถึง (Authorization)</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Control Card */}
                <div className="md:col-span-1 p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-sm h-full">
                    <div className="flex flex-col items-center justify-center space-y-6 py-8 h-full">
                        <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shadow-inner">
                            <Wifi className="w-10 h-10 text-slate-400" />
                        </div>

                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-medium text-white">Start Diagnostics</h3>
                            <p className="text-sm text-slate-400">
                                ระบบจะทำการตรวจสอบ:
                            </p>
                            <ul className="text-sm text-slate-500 text-left list-disc list-inside space-y-1">
                                <li>การเชื่อมต่อ Server API</li>
                                <li>ความถูกต้องของ API Key</li>
                                <li>การยืนยันตัวตน IP Address</li>
                            </ul>
                        </div>

                        <button
                            onClick={testConnection}
                            disabled={loading}
                            className={`flex items-center justify-center bg-yellow-500 hover:bg-yellow-600 text-black font-semibold w-full h-12 rounded-lg transition-all shadow-lg hover:shadow-yellow-500/20 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    กำลังตรวจสอบ...
                                </>
                            ) : (
                                'เริ่มการทดสอบ'
                            )}
                        </button>
                    </div>
                </div>

                {/* Results Area */}
                <div className="md:col-span-2 grid gap-4">

                    {/* 1. Server Status */}
                    <div className={`p-5 rounded-xl border transition-all duration-300 bg-slate-900 ${!result ? 'border-slate-800' :
                        result.server.success ? 'border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                        }`}>
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${!result ? 'bg-slate-800 text-slate-500' :
                                    result.server.success ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                                    }`}>
                                    <Server className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-white">Server Reachability</h3>
                                    <p className="text-sm text-slate-400">
                                        {result ? result.config.apiUrl : 'Waiting for test...'}
                                    </p>
                                </div>
                            </div>
                            {result && (
                                <div className="text-right">
                                    <div className={`text-lg font-bold ${result.server.success ? 'text-green-500' : 'text-red-500'}`}>
                                        {result.server.success ? 'Online' : 'Offline'}
                                    </div>
                                    <div className="text-xs text-slate-500">{result.server.latency} ms</div>
                                </div>
                            )}
                        </div>
                        {result && !result.server.success && (
                            <div className="mt-4 p-3 bg-red-950/50 border border-red-900/50 rounded text-sm text-red-200">
                                Error: {result.server.message}
                            </div>
                        )}
                    </div>

                    {/* 2. Auth Status */}
                    <div className={`p-5 rounded-xl border transition-all duration-300 bg-slate-900 ${!result ? 'border-slate-800' :
                        result.auth.success ? 'border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.1)]' :
                            result.auth.message.includes('Skipped') ? 'border-slate-800' : 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                        }`}>
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${!result ? 'bg-slate-800 text-slate-500' :
                                    result.auth.success ? 'bg-green-500/20 text-green-500' :
                                        result.auth.message.includes('Skipped') ? 'bg-slate-800 text-slate-500' : 'bg-red-500/20 text-red-500'
                                    }`}>
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-white">Authorization & Rights</h3>
                                    <p className="text-sm text-slate-400">
                                        Checks API Key, Secret, and IP Whitelist
                                    </p>
                                </div>
                            </div>
                            {result && (
                                <div className="text-right">
                                    <div className={`text-lg font-bold ${result.auth.success ? 'text-green-500' :
                                        result.auth.message.includes('Skipped') ? 'text-slate-500' : 'text-red-500'
                                        }`}>
                                        {result.auth.success ? 'Authorized' :
                                            result.auth.message.includes('Skipped') ? 'Skipped' : 'Failed'}
                                    </div>
                                    <div className="text-xs text-slate-500">{result.auth.latency} ms</div>
                                </div>
                            )}
                        </div>
                        {result && !result.auth.success && !result.auth.message.includes('Skipped') && (
                            <div className="mt-4 p-3 bg-red-900/20 border border-red-900/30 rounded text-sm text-red-300">
                                {result.auth.message}
                            </div>
                        )}
                    </div>

                    {/* Config Summary (Optional) */}
                    {result && (
                        <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-500 border-t border-slate-800 mt-2">
                            <span>Testing with Prefix: <span className="text-slate-300">{result.config.prefix}</span></span>
                            <span>Timestamp: {new Date().toLocaleTimeString()}</span>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

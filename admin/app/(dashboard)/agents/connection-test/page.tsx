"use client";

import { useState } from 'react';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Wifi } from 'lucide-react';

export default function ConnectionTestPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; latency: number } | null>(null);

    const testConnection = async () => {
        setLoading(true);
        setResult(null);
        try {
            const res = await api.get('/admin/agents/connection-test');
            if (res.data.success) {
                setResult(res.data.data);
            } else {
                setResult({
                    success: false,
                    message: res.data.message || 'Unknown Error',
                    latency: 0
                });
            }
        } catch (error: any) {
            setResult({
                success: false,
                message: error.response?.data?.message || error.message || 'Connection Failed',
                latency: 0
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur-sm">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">ทดสอบการเชื่อมต่อ (Connection Test)</h1>
                    <p className="text-slate-400">ตรวจสอบสถานะการเชื่อมต่อกับระบบ Betflix API</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Control Card */}
                <Card className="p-6 bg-slate-900 border-slate-800">
                    <div className="flex flex-col items-center justify-center space-y-6 py-8">
                        <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                            <Wifi className="w-10 h-10 text-slate-400" />
                        </div>

                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-medium text-white">Betflix API Connection</h3>
                            <p className="text-sm text-slate-400 max-w-xs">
                                กดปุ่มด้านล่างเพื่อส่งคำขอทดสอบไปยัง Betflix Server และวัดเวลาตอบสนอง
                            </p>
                        </div>

                        <Button
                            size="lg"
                            onClick={testConnection}
                            disabled={loading}
                            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold min-w-[200px]"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    กำลังทดสอบ...
                                </>
                            ) : (
                                'เริ่มการทดสอบ'
                            )}
                        </Button>
                    </div>
                </Card>

                {/* Result Card */}
                <Card className="p-6 bg-slate-900 border-slate-800 flex flex-col justify-center">
                    {!result && !loading && (
                        <div className="text-center text-slate-500 py-12">
                            <div className="mb-4 flex justify-center">
                                <AlertCircle className="w-12 h-12 opacity-20" />
                            </div>
                            <p>ยังไม่มีผลการทดสอบ</p>
                            <p className="text-xs mt-1">กดปุ่มเริ่มการทดสอบเพื่อดูผลลัพธ์</p>
                        </div>
                    )}

                    {loading && (
                        <div className="text-center py-12 space-y-4">
                            <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mx-auto" />
                            <p className="text-slate-400">กำลังเชื่อมต่อ...</p>
                        </div>
                    )}

                    {result && !loading && (
                        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                            <div className="flex flex-col items-center gap-4">
                                {result.success ? (
                                    <div className="w-20 h-20 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                                        <CheckCircle2 className="w-10 h-10" />
                                    </div>
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                                        <XCircle className="w-10 h-10" />
                                    </div>
                                )}

                                <div className="text-center">
                                    <h2 className={`text-2xl font-bold ${result.success ? 'text-green-500' : 'text-red-500'}`}>
                                        {result.success ? 'เชื่อมต่อสำเร็จ' : 'เชื่อมต่อล้มเหลว'}
                                    </h2>
                                    <p className="text-slate-400 mt-1">{result.message}</p>
                                </div>
                            </div>

                            <div className="bg-slate-800/50 rounded-lg p-4 space-y-2 border border-slate-700">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">สถานะ</span>
                                    <span className={result.success ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
                                        {result.success ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">เวลาตอบสนอง (Latency)</span>
                                    <span className="text-white font-mono">{result.latency} ms</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">API Provider</span>
                                    <span className="text-yellow-500">Betflix</span>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

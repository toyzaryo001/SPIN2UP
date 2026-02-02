"use client";

import { useState } from 'react';
import api from '@/lib/api';
import { Loader2, Server, ShieldCheck, UserPlus, Wallet, Gamepad2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

type TestItem = {
    success: boolean;
    message: string;
    latency: number;
    data?: any;
};

type TestResults = {
    server: TestItem;
    auth: TestItem;
    register: TestItem;
    balance: TestItem;
    game: TestItem;
    config: { apiUrl: string; prefix: string };
};

const initialResult: TestItem = { success: false, message: 'รอทดสอบ...', latency: 0 };

export default function ConnectionTestPage() {
    const [loading, setLoading] = useState<string | null>(null);
    const [results, setResults] = useState<TestResults>({
        server: initialResult,
        auth: initialResult,
        register: initialResult,
        balance: initialResult,
        game: initialResult,
        config: { apiUrl: '', prefix: '' }
    });
    const [testPhone, setTestPhone] = useState('0999999999');
    const [testUsername, setTestUsername] = useState('');

    // Test Connection (Server + Auth)
    const testConnection = async () => {
        setLoading('connection');
        try {
            const res = await api.get('/admin/agents/connection-test');
            if (res.data.success) {
                setResults(prev => ({
                    ...prev,
                    server: res.data.data.server,
                    auth: res.data.data.auth,
                    config: res.data.data.config
                }));
            }
        } catch (error: any) {
            setResults(prev => ({
                ...prev,
                server: { success: false, message: error.message, latency: 0 },
                auth: { success: false, message: 'Skipped', latency: 0 }
            }));
        }
        setLoading(null);
    };

    // Test Register
    const testRegister = async () => {
        if (!testPhone) return;
        setLoading('register');
        try {
            const res = await api.post('/admin/agents/test-register', { phone: testPhone });
            setResults(prev => ({
                ...prev,
                register: {
                    success: res.data.success,
                    message: res.data.data?.message || res.data.message,
                    latency: res.data.latency || 0,
                    data: res.data.data
                }
            }));
            if (res.data.data?.username) {
                setTestUsername(res.data.data.username);
            }
        } catch (error: any) {
            setResults(prev => ({
                ...prev,
                register: { success: false, message: error.message, latency: 0 }
            }));
        }
        setLoading(null);
    };

    // Test Balance
    const testBalance = async () => {
        if (!testUsername) return;
        setLoading('balance');
        try {
            const res = await api.post('/admin/agents/test-balance', { username: testUsername });
            setResults(prev => ({
                ...prev,
                balance: {
                    success: res.data.success,
                    message: res.data.success ? `ยอดเงิน: ${res.data.data.balance}` : res.data.message,
                    latency: res.data.latency || 0,
                    data: res.data.data
                }
            }));
        } catch (error: any) {
            setResults(prev => ({
                ...prev,
                balance: { success: false, message: error.message, latency: 0 }
            }));
        }
        setLoading(null);
    };

    // Test Game Launch
    const testGame = async () => {
        if (!testUsername) return;
        setLoading('game');
        try {
            const res = await api.post('/admin/agents/test-game', { username: testUsername, provider: 'pg' });
            setResults(prev => ({
                ...prev,
                game: {
                    success: res.data.success,
                    message: res.data.success ? 'สร้าง URL สำเร็จ' : res.data.message,
                    latency: res.data.latency || 0,
                    data: res.data.data
                }
            }));
        } catch (error: any) {
            setResults(prev => ({
                ...prev,
                game: { success: false, message: error.message, latency: 0 }
            }));
        }
        setLoading(null);
    };

    // Run All Tests
    const runAllTests = async () => {
        await testConnection();
        await testRegister();
        await testBalance();
        await testGame();
    };

    const TestCard = ({
        title,
        icon: Icon,
        result,
        testKey,
        onTest,
        children
    }: {
        title: string;
        icon: any;
        result: TestItem;
        testKey: string;
        onTest: () => void;
        children?: React.ReactNode;
    }) => {
        const isLoading = loading === testKey;
        const hasResult = result.message !== 'รอทดสอบ...';

        return (
            <div className={`p-5 rounded-xl border transition-all duration-300 bg-slate-900 ${!hasResult ? 'border-slate-800' :
                    result.success ? 'border-green-500/50' : 'border-red-500/50'
                }`}>
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${!hasResult ? 'bg-slate-800 text-slate-500' :
                                result.success ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                            }`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-medium text-white">{title}</h3>
                            <p className="text-xs text-slate-500">{result.latency}ms</p>
                        </div>
                    </div>
                    <button
                        onClick={onTest}
                        disabled={isLoading}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${isLoading ? 'bg-slate-700 text-slate-400' : 'bg-yellow-500 hover:bg-yellow-600 text-black'
                            }`}
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ทดสอบ'}
                    </button>
                </div>

                {children}

                <div className={`mt-3 p-3 rounded-lg text-sm ${!hasResult ? 'bg-slate-800/50 text-slate-400' :
                        result.success ? 'bg-green-950/50 text-green-300' : 'bg-red-950/50 text-red-300'
                    }`}>
                    {hasResult && (result.success ? <CheckCircle2 className="w-4 h-4 inline mr-2" /> : <XCircle className="w-4 h-4 inline mr-2" />)}
                    {result.message}
                </div>

                {result.data?.url && (
                    <a
                        href={result.data.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300"
                    >
                        <ExternalLink className="w-3 h-3" /> เปิดลิงก์เกม
                    </a>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">ทดสอบ API Betflix</h1>
                    <p className="text-slate-400">ตรวจสอบการเชื่อมต่อ สมัคร เช็คยอด และเข้าเกม</p>
                </div>
                <button
                    onClick={runAllTests}
                    disabled={!!loading}
                    className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-semibold rounded-lg transition-all shadow-lg"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ทดสอบทั้งหมด'}
                </button>
            </div>

            {/* Config Info */}
            {results.config.apiUrl && (
                <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg flex items-center justify-between text-sm">
                    <span className="text-slate-400">API Endpoint: <span className="text-white">{results.config.apiUrl}</span></span>
                    <span className="text-slate-400">Prefix: <span className="text-yellow-400">{results.config.prefix}</span></span>
                </div>
            )}

            {/* Test Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                {/* 1. Server Status */}
                <TestCard
                    title="เชื่อมต่อ Server"
                    icon={Server}
                    result={results.server}
                    testKey="connection"
                    onTest={testConnection}
                />

                {/* 2. Auth Status */}
                <TestCard
                    title="ตรวจสอบสิทธิ์"
                    icon={ShieldCheck}
                    result={results.auth}
                    testKey="connection"
                    onTest={testConnection}
                />

                {/* 3. Register Test */}
                <TestCard
                    title="สมัครสมาชิก"
                    icon={UserPlus}
                    result={results.register}
                    testKey="register"
                    onTest={testRegister}
                >
                    <input
                        type="text"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="เบอร์โทรทดสอบ"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                    />
                </TestCard>

                {/* 4. Balance Test */}
                <TestCard
                    title="เช็คยอดเงิน"
                    icon={Wallet}
                    result={results.balance}
                    testKey="balance"
                    onTest={testBalance}
                >
                    <input
                        type="text"
                        value={testUsername}
                        onChange={(e) => setTestUsername(e.target.value)}
                        placeholder="Username (จากการสมัคร)"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                    />
                </TestCard>

                {/* 5. Game Launch Test */}
                <TestCard
                    title="เข้าเกม (PG Slot)"
                    icon={Gamepad2}
                    result={results.game}
                    testKey="game"
                    onTest={testGame}
                >
                    <p className="text-xs text-slate-500">ใช้ Username: {testUsername || '-'}</p>
                </TestCard>

            </div>
        </div>
    );
}

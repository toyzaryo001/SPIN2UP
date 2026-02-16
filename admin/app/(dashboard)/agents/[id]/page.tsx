"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { Save, ArrowLeft, Settings, Database, Gamepad2, Activity, Trash2, AlertTriangle, Eye, EyeOff, Search, RefreshCw, LayoutGrid, Library } from "lucide-react";
import toast from "react-hot-toast";

interface Agent {
    id: number;
    name: string;
    code: string;
    isMain: boolean;
    upline?: string;
    apiKey?: string;
    apiSecret?: string;
    xApiKey?: string;
    xApiCat?: string;
    gameEntrance?: string;
    callbackUrl?: string;
    rtp: number;
    minBet: number;
    maxBet: number;
    isActive: boolean;
}

export default function AgentDetailPage() {
    const { id } = useParams();
    const router = useRouter();

    const [agent, setAgent] = useState<Agent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'general' | 'connection' | 'games' | 'test'>('general');
    const [isSaving, setIsSaving] = useState(false);

    // Form Stats
    const [formData, setFormData] = useState<Partial<Agent>>({});
    const [showToken, setShowToken] = useState(false);
    const [responseModal, setResponseModal] = useState<{ title: string; data: any } | null>(null);

    // Test Room Data State
    const [providers, setProviders] = useState<any[]>([]);
    const [gamesList, setGamesList] = useState<any[]>([]);

    // Game Library State
    const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [gameSearchTerm, setGameSearchTerm] = useState('');

    useEffect(() => {
        if (id) fetchAgent();
    }, [id]);

    const fetchAgent = async () => {
        try {
            const res = await api.get(`/admin/settings/agent/${id}`);
            if (res.data.success) {
                setAgent(res.data.data);
                setFormData(res.data.data);
            }
        } catch (error) {
            console.error("Fetch agent error:", error);
            toast.error("ไม่สามารถโหลดข้อมูล Agent ได้");
            router.push('/agents');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.put(`/admin/settings/agent/${id}`, formData);
            toast.success("บันทึกการตั้งค่าแล้ว");
            fetchAgent(); // Refresh
        } catch (error: any) {
            console.error("Save error:", error);
            toast.error(error.response?.data?.message || "บันทึกไม่สำเร็จ");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="p-12 text-center text-slate-400">กำลังโหลดข้อมูล...</div>;
    }

    if (!agent) return null;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => router.push('/agents')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        {agent.name}
                        <span className="text-sm px-2 py-1 bg-slate-100 text-slate-500 rounded font-mono border border-slate-200">
                            {agent.code}
                        </span>
                        {agent.isMain && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Main</span>}
                    </h1>
                    <p className="text-slate-500 text-sm">จัดการการตั้งค่าและการเชื่อมต่อสำหรับ Agent นี้</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
                    >
                        <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Settings size={16} /> ตั้งค่าทั่วไป
                </button>
                <button
                    onClick={() => setActiveTab('connection')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'connection' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Database size={16} /> การเชื่อมต่อ (API)
                </button>
                <button
                    onClick={() => setActiveTab('test')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'test' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Activity size={16} /> ห้องทดสอบ (Test Room)
                </button>
                <button
                    onClick={() => setActiveTab('games')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'games' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Library size={16} /> คลังเกม (Game Library)
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">

                {/* 1. General Settings */}
                {activeTab === 'general' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อที่แสดง (Display Name)</label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Agent Code (System ID)</label>
                                <input
                                    type="text"
                                    value={formData.code || ''}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 font-mono"
                                    readOnly // Code usually shouldn't change easily to prevent sync issues
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-4">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                <Activity size={18} /> การตั้งค่าเกม (Game Config)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">RTP (%)</label>
                                    <input
                                        type="number"
                                        min="1" max="100"
                                        value={formData.rtp ? formData.rtp * 100 : 95} // Convert 0.95 -> 95 for display
                                        onChange={(e) => setFormData({ ...formData, rtp: parseFloat(e.target.value) / 100 })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">อัตราการจ่ายเงินคืนผู้เล่น</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">เดิมพันขั้นต่ำ (Min Bet)</label>
                                    <input
                                        type="number"
                                        value={formData.minBet || 0}
                                        onChange={(e) => setFormData({ ...formData, minBet: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">เดิมพันสูงสุด (Max Bet)</label>
                                    <input
                                        type="number"
                                        value={formData.maxBet || 0}
                                        onChange={(e) => setFormData({ ...formData, maxBet: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive || false}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                                />
                                <span className="text-sm font-medium text-slate-700">เปิดใช้งาน Agent นี้</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer ml-6">
                                <input
                                    type="checkbox"
                                    checked={formData.isMain || false}
                                    onChange={(e) => setFormData({ ...formData, isMain: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-300 text-yellow-500 focus:ring-yellow-500"
                                />
                                <div>
                                    <span className="text-sm font-medium text-slate-700 block">ตั้งเป็น Main Agent</span>
                                    <span className="text-xs text-slate-400">ใช้เป็น Default สำหรับเกมที่ไม่ระบุค่าย</span>
                                </div>
                            </label>
                        </div>
                    </div>
                )}

                {/* 2. Connection Settings */}
                {activeTab === 'connection' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">API Endpoint</label>
                            <input
                                type="text"
                                value={formData.apiKey || ''}
                                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono text-sm bg-slate-50"
                                placeholder="https://api..."
                            />
                        </div>

                        {agent.code === 'NEXUS' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Agent Code (Upline)</label>
                                    <input
                                        type="text"
                                        value={formData.upline || ''}
                                        onChange={(e) => setFormData({ ...formData, upline: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono"
                                        placeholder="เช่น 9avertp"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">ใช้สำหรับฟิลด์ agent_code</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Agent Token (Secret)</label>
                                    <div className="relative">
                                        <input
                                            type={showToken ? "text" : "password"}
                                            value={formData.apiSecret || ''}
                                            onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono pr-10"
                                            placeholder="Token..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowToken(!showToken)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">ใช้สำหรับฟิลด์ agent_token</p>
                                </div>
                            </div>
                        ) : (
                            // BETFLIX or Others
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Upline / Prefix</label>
                                        <input
                                            type="text"
                                            value={formData.upline || ''}
                                            onChange={(e) => setFormData({ ...formData, upline: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">X-API-KEY</label>
                                        <input
                                            type="text"
                                            value={formData.xApiKey || ''}
                                            onChange={(e) => setFormData({ ...formData, xApiKey: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">X-API-CAT</label>
                                        <input
                                            type="text"
                                            value={formData.xApiCat || ''}
                                            onChange={(e) => setFormData({ ...formData, xApiCat: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Game Entrance URL</label>
                                        <input
                                            type="text"
                                            value={formData.gameEntrance || ''}
                                            onChange={(e) => setFormData({ ...formData, gameEntrance: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Callback URL (Webhook)</label>
                            <input
                                type="text"
                                value={formData.callbackUrl || ''}
                                onChange={(e) => setFormData({ ...formData, callbackUrl: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900"
                                placeholder="https://your-domain.com/api/callback..."
                            />
                        </div>
                    </div>
                )}
                {/* 3. Test Connection (The Test Room) */}
                {activeTab === 'test' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                <Activity size={18} /> ห้องทดสอบระบบ (Test Room)
                            </h3>
                            <p className="text-sm text-slate-500 mb-4">
                                ใช้สำหรับทดสอบการเชื่อมต่อกับ Agent API จริง โดยตรง
                            </p>

                            {/* NEW: Connection Status & Credit Card */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex-1 w-full">
                                    <h4 className="text-sm font-semibold text-slate-500 uppercase mb-2">สถานะการเชื่อมต่อ (Connection)</h4>
                                    <div className="flex items-center gap-3">
                                        <div id="status-indicator" className="w-4 h-4 rounded-full bg-slate-300"></div>
                                        <span id="status-text" className="font-bold text-lg text-slate-700">รอตรวจสอบ...</span>
                                        <span id="status-latency" className="text-xs text-slate-400 font-mono ml-2"></span>
                                    </div>
                                </div>

                                <div className="flex-1 w-full border-t md:border-t-0 md:border-l border-slate-100 md:pl-6 pt-4 md:pt-0">
                                    <h4 className="text-sm font-semibold text-slate-500 uppercase mb-2">เครดิต Agent (Credit)</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-bold text-slate-800">฿</span>
                                        <span id="agent-credit" className="text-3xl font-bold text-slate-900 tracking-tight">--</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">ยอดเงินคงเหลือในกระดาน Agent</p>
                                </div>

                                <div>
                                    <button
                                        onClick={async () => {
                                            const indicator = document.getElementById('status-indicator');
                                            const text = document.getElementById('status-text');
                                            const latencyEl = document.getElementById('status-latency');
                                            const creditEl = document.getElementById('agent-credit');

                                            if (indicator) indicator.className = 'w-4 h-4 rounded-full bg-yellow-400 animate-pulse';
                                            if (text) text.innerText = 'กำลังตรวจสอบ...';

                                            try {
                                                // 1. Check Connection
                                                const resConn = await api.get(`/admin/agents/connection-test?agentId=${agent.id}`);
                                                const isOnline = resConn.data.success && resConn.data.data;
                                                const latency = resConn.data.latency || 0;

                                                if (indicator) indicator.className = isOnline ? 'w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'w-4 h-4 rounded-full bg-red-500';
                                                if (text) {
                                                    text.innerText = isOnline ? 'ONLINE (เชื่อมต่อสำเร็จ)' : 'OFFLINE (เชื่อมต่อไม่ได้)';
                                                    text.className = isOnline ? 'font-bold text-lg text-emerald-600' : 'font-bold text-lg text-red-600';
                                                }
                                                if (latencyEl) latencyEl.innerText = `${latency}ms`;

                                                // 2. Check Credit
                                                const resBal = await api.get(`/admin/agents/balance?agentId=${agent.id}`);
                                                if (creditEl && resBal.data.success) {
                                                    creditEl.innerText = resBal.data.data.balance.toLocaleString('th-TH', { minimumFractionDigits: 2 });
                                                }

                                                toast.success('อัปเดตสถานะเรียบร้อย');

                                            } catch (e: any) {
                                                console.error(e);
                                                if (indicator) indicator.className = 'w-4 h-4 rounded-full bg-red-500';
                                                if (text) text.innerText = 'Network Error';
                                                toast.error('ตรวจสอบล้มเหลว');
                                            }
                                        }}
                                        className="bg-slate-800 text-white px-6 py-3 rounded-lg hover:bg-slate-900 shadow-sm flex items-center gap-2 font-medium transition-all active:scale-95"
                                    >
                                        <Activity size={18} /> ตรวจสอบสถานะ & เครดิต
                                    </button>

                                    <button
                                        onClick={async () => {
                                            try {
                                                const res = await api.get(`/admin/agents/debug-connection?agentId=${agent.id}`);
                                                setResponseModal({
                                                    title: 'Debug API Response',
                                                    data: res.data.data
                                                });
                                            } catch (e: any) {
                                                toast.error('Debug Failed');
                                            }
                                        }}
                                        className="mt-2 w-full text-xs text-slate-400 hover:text-slate-600 underline"
                                    >
                                        ดู Raw Response (Debug)
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Test 1: Register/Check User */}
                            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                <h4 className="font-bold text-slate-700 mb-4 border-b pb-2">1. ทดสอบสร้าง User (Register)</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase">เบอร์โทรศัพท์ (Phone)</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                                                placeholder="0812345678"
                                                id="test-phone"
                                                defaultValue="0909999999"
                                            />
                                            <button
                                                onClick={async () => {
                                                    const phone = (document.getElementById('test-phone') as HTMLInputElement).value;
                                                    try {
                                                        const toastId = toast.loading('กำลังทดสอบ...');
                                                        const res = await api.post('/admin/agents/test-register', { phone, agentId: agent.id });
                                                        toast.dismiss(toastId);

                                                        if (res.data.success) {
                                                            toast.success(`สำเร็จ! (${res.data.latency}ms)`);
                                                            alert(JSON.stringify(res.data.data, null, 2));
                                                        } else {
                                                            toast.error(`ล้มเหลว: ${res.data.message}`);
                                                        }
                                                    } catch (e: any) {
                                                        toast.error(e.message);
                                                    }
                                                }}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                                            >
                                                ทดสอบ
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Test 2: Check Balance */}
                            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                <h4 className="font-bold text-slate-700 mb-4 border-b pb-2">2. ทดสอบเช็คยอดเงิน (Balance)</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase">External Username</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono"
                                                placeholder="Username ที่ได้จากข้อ 1"
                                                id="test-username"
                                            />
                                            <button
                                                onClick={async () => {
                                                    const username = (document.getElementById('test-username') as HTMLInputElement).value;
                                                    try {
                                                        const toastId = toast.loading('กำลังเช็คยอด...');
                                                        const res = await api.post('/admin/agents/test-balance', { username, agentId: agent.id });
                                                        toast.dismiss(toastId);

                                                        if (res.data.success) {
                                                            toast.success(`ยอดเงิน: ${res.data.data.balance} (${res.data.latency}ms)`);
                                                        } else {
                                                            toast.error(`ล้มเหลว: ${res.data.message}`);
                                                        }
                                                    } catch (e: any) {
                                                        toast.error(e.message);
                                                    }
                                                }}
                                                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700"
                                            >
                                                เช็คยอด
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Test 3: Launch Game */}
                        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                            <h4 className="font-bold text-slate-700 mb-4 border-b pb-2">3. ทดสอบเข้าเกม (Launch Game)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Username</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                                        placeholder="Username..."
                                        id="test-game-username"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Provider Code</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                                        placeholder="pg, joker, pp"
                                        id="test-provider"
                                        defaultValue="pg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Game Code</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                                        placeholder="game-code (optional)"
                                        id="test-game-code"
                                        defaultValue=""
                                    />
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={async () => {
                                        const username = (document.getElementById('test-game-username') as HTMLInputElement).value;
                                        const provider = (document.getElementById('test-provider') as HTMLInputElement).value;
                                        const gameCode = (document.getElementById('test-game-code') as HTMLInputElement).value;

                                        try {
                                            const toastId = toast.loading('กำลังขอ URL เกม...');
                                            const res = await api.post('/admin/agents/test-game', {
                                                username,
                                                provider,
                                                gameCode,
                                                agentId: agent.id
                                            });
                                            toast.dismiss(toastId);

                                            if (res.data.success) {
                                                toast.success(`รับ URL สำเร็จ (${res.data.latency}ms)`);
                                                window.open(res.data.data.url, '_blank');
                                            } else {
                                                toast.error(`ล้มเหลว: ${res.data.message}`);
                                            }
                                        } catch (e: any) {
                                            toast.error(e.message);
                                        }
                                    }}
                                    className="bg-purple-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-purple-700 flex items-center gap-2"
                                >
                                    <Gamepad2 size={16} /> ทดสอบเข้าเล่น
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Test 4: Fetch Providers */}
                            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                <h4 className="font-bold text-slate-700 mb-4 border-b pb-2">4. ทดสอบดึงค่ายเกม (Providers)</h4>
                                <div className="space-y-4">
                                    <button
                                        onClick={async () => {
                                            try {
                                                const toastId = toast.loading('กำลังดึงข้อมูลค่ายเกม...');
                                                const res = await api.post('/admin/agents/test-providers', { agentId: agent.id });
                                                toast.dismiss(toastId);

                                                if (res.data.success) {
                                                    toast.success(`พบ ${res.data.data.length} ค่าย (${res.data.latency}ms)`);
                                                    console.log('Providers:', res.data.data);
                                                    alert(`พบ ${res.data.data.length} ค่าย (ดูใน Console สำหรับข้อมูลดิบ)\n\nตัวอย่าง: ${JSON.stringify(res.data.data.slice(0, 3), null, 2)}...`);
                                                } else {
                                                    toast.error(`ล้มเหลว: ${res.data.message}`);
                                                }
                                            } catch (e: any) {
                                                toast.error(e.message);
                                            }
                                        }}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 w-full flex justify-center items-center gap-2"
                                    >
                                        <Database size={16} /> ดึงรายชื่อค่ายเกม
                                    </button>
                                    <p className="text-xs text-slate-400 text-center">ดูผลลัพธ์ละเอียดใน F12 (Console)</p>
                                </div>
                            </div>

                            {/* Test 5: Fetch Games List */}
                            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                <h4 className="font-bold text-slate-700 mb-4 border-b pb-2">5. ทดสอบดึงรายชื่อเกม (Games)</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase">Provider Code</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono"
                                                placeholder="pg, joker"
                                                id="test-list-provider"
                                                defaultValue="pg"
                                            />
                                            <button
                                                onClick={async () => {
                                                    const providerCode = (document.getElementById('test-list-provider') as HTMLInputElement).value;
                                                    try {
                                                        const toastId = toast.loading('กำลังดึงรายชื่อเกม...');
                                                        const res = await api.post('/admin/agents/test-games-list', { providerCode, agentId: agent.id });
                                                        toast.dismiss(toastId);

                                                        if (res.data.success) {
                                                            toast.success(`พบ ${res.data.data.length} เกม (${res.data.latency}ms)`);
                                                            console.log('Games:', res.data.data);
                                                            alert(`พบ ${res.data.data.length} เกม (ดูใน Console สำหรับข้อมูลดิบ)\n\nตัวอย่าง: ${JSON.stringify(res.data.data.slice(0, 3), null, 2)}...`);
                                                        } else {
                                                            toast.error(`ล้มเหลว: ${res.data.message}`);
                                                        }
                                                    } catch (e: any) {
                                                        toast.error(e.message);
                                                    }
                                                }}
                                                className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700"
                                            >
                                                ดึงเกม
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 text-center">ดูผลลัพธ์ละเอียดใน F12 (Console)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Game Library (New) */}
                {activeTab === 'games' && (
                    <div className="animate-in fade-in duration-300 h-[calc(100vh-250px)] flex gap-6">
                        {/* Left Sidebar: Providers */}
                        <div className="w-1/3 min-w-[300px] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                        <Database size={18} className="text-blue-500" /> ค่ายเกม ({providers.length})
                                    </h3>
                                    <button
                                        onClick={async () => {
                                            try {
                                                const toastId = toast.loading('กำลังดึงข้อมูลค่ายเกม...');
                                                const res = await api.post('/admin/agents/test-providers', { agentId: agent.id });
                                                toast.dismiss(toastId);
                                                if (res.data.success) {
                                                    toast.success(`อัปเดต ${res.data.data.length} ค่าย`);
                                                    setProviders(res.data.data);
                                                } else {
                                                    toast.error(res.data.message);
                                                }
                                            } catch (e: any) {
                                                toast.error(e.message);
                                            }
                                        }}
                                        className="p-2 hover:bg-white rounded-lg text-slate-500 hover:text-blue-600 transition-colors"
                                        title="Sync Providers"
                                    >
                                        <RefreshCw size={16} />
                                    </button>
                                </div>
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="ค้นหาค่ายเกม..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {providers.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                                        <Database size={48} className="mb-4 opacity-20" />
                                        <p>ยังไม่มีข้อมูลค่ายเกม</p>
                                        <button
                                            onClick={() => (document.querySelector('button[title="Sync Providers"]') as HTMLElement)?.click()}
                                            className="mt-4 text-blue-500 hover:underline text-sm"
                                        >
                                            กด Sync เพื่อดึงข้อมูล
                                        </button>
                                    </div>
                                ) : (
                                    providers
                                        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map((p, i) => (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    setSelectedProvider(p);
                                                    setGamesList([]); // Clear games when switching provider
                                                }}
                                                className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all ${selectedProvider?.code === p.code
                                                        ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-500/20'
                                                        : 'hover:bg-slate-50 border border-transparent'
                                                    }`}
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${selectedProvider?.code === p.code ? 'bg-blue-500 text-white' : 'bg-white text-slate-400 border border-slate-100'
                                                    }`}>
                                                    {p.code.substring(0, 2)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`font-bold text-sm truncate ${selectedProvider?.code === p.code ? 'text-blue-700' : 'text-slate-700'}`}>
                                                        {p.name}
                                                    </div>
                                                    <div className="text-xs text-slate-400 font-mono truncate">{p.code}</div>
                                                </div>
                                                {p.status === 1 && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                                            </button>
                                        ))
                                )}
                            </div>
                        </div>

                        {/* Right Content: Games */}
                        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            {selectedProvider ? (
                                <>
                                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-slate-900 text-white rounded-lg flex items-center justify-center text-lg font-bold shadow-md">
                                                {selectedProvider.code.substring(0, 2)}
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-slate-800">{selectedProvider.name}</h2>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
                                                        {selectedProvider.code}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        {gamesList.length > 0 ? `${gamesList.length} เกม` : 'รอการดึงข้อมูล...'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    placeholder="ค้นหาเกม..."
                                                    value={gameSearchTerm}
                                                    onChange={(e) => setGameSearchTerm(e.target.value)}
                                                    className="w-48 pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                />
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const toastId = toast.loading(`กำลังดึงเกมของ ${selectedProvider.name}...`);
                                                        const res = await api.post('/admin/agents/test-games-list', {
                                                            providerCode: selectedProvider.code,
                                                            agentId: agent.id
                                                        });
                                                        toast.dismiss(toastId);
                                                        if (res.data.success) {
                                                            toast.success(`พบ ${res.data.data.length} เกม`);
                                                            setGamesList(res.data.data);
                                                        } else {
                                                            toast.error(res.data.message);
                                                        }
                                                    } catch (e: any) {
                                                        toast.error(e.message);
                                                    }
                                                }}
                                                className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 flex items-center gap-2 text-sm font-medium shadow-sm transition-all active:scale-95"
                                            >
                                                <RefreshCw size={16} /> ดึงเกมล่าสุด
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                                        {gamesList.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                                <Gamepad2 size={64} className="mb-4 opacity-10" />
                                                <p className="text-lg font-medium text-slate-500">ยังไม่มีรายการเกม</p>
                                                <p className="text-sm mb-6">กดปุ่ม "ดึงเกมล่าสุด" เพื่อโหลดข้อมูล</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                                {gamesList
                                                    .filter(g =>
                                                        (typeof g.game_name === 'object' ? (g.game_name.en || g.game_name.th) : g.game_name).toLowerCase().includes(gameSearchTerm.toLowerCase()) ||
                                                        g.game_code.toLowerCase().includes(gameSearchTerm.toLowerCase())
                                                    )
                                                    .map((g, i) => (
                                                        <div key={i} className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all overflow-hidden relative cursor-default">
                                                            <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                                                                {g.banner || g.img ? (
                                                                    <img src={g.banner || g.img} alt={g.game_code} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                                        <Gamepad2 size={32} />
                                                                    </div>
                                                                )}
                                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                                                                    <button
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(g.game_code);
                                                                            toast.success('Copy Code: ' + g.game_code);
                                                                        }}
                                                                        className="bg-white text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-50 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200"
                                                                    >
                                                                        Copy Code
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="p-3">
                                                                <h4 className="font-bold text-sm text-slate-700 truncate" title={typeof g.game_name === 'object' ? g.game_name.en : g.game_name}>
                                                                    {typeof g.game_name === 'object' ? g.game_name.en : g.game_name}
                                                                </h4>
                                                                <p className="text-xs text-slate-400 font-mono mt-1 truncate">{g.game_code}</p>
                                                            </div>
                                                            {/* Status Dot */}
                                                            {g.status === 1 && (
                                                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 shadow-sm ring-1 ring-white"></div>
                                                            )}
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12 text-center bg-slate-50/50">
                                    <LayoutGrid size={64} className="mb-6 opacity-10" />
                                    <h3 className="text-xl font-bold text-slate-600 mb-2">เลือกค่ายเกมจากด้านซ้าย</h3>
                                    <p className="max-w-xs mx-auto">เลือกค่ายเกมเพื่อดูรายการเกมทั้งหมด ตรวจสอบสถานะ และดึงข้อมูลล่าสุด</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {responseModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="font-bold text-lg">{responseModal.title}</h3>
                                <button
                                    onClick={() => setResponseModal(null)}
                                    className="p-1 hover:bg-slate-100 rounded-full"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                            </div>
                            <div className="p-4 overflow-auto bg-slate-50 font-mono text-xs">
                                <pre>{JSON.stringify(responseModal.data, null, 2)}</pre>
                            </div>
                            <div className="p-4 border-t border-slate-100 flex justify-end">
                                <button
                                    onClick={() => setResponseModal(null)}
                                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            );
}

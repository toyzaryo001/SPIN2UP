"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Plus, Sliders, X, Save, AlertTriangle, Trash2, Star, Settings } from "lucide-react";
import toast from "react-hot-toast";

interface Agent {
    id: number;
    name: string;
    code: string; // Added code
    isMain: boolean; // Added isMain
    upline?: string;
    apiKey?: string;
    xApiKey?: string; // API Key / Token
    xApiCat?: string; // Secret / Cat
    gameEntrance?: string;
    callbackUrl?: string;
    rtp: number;
    minBet: number;
    maxBet: number;
    isActive: boolean;
}

export default function AgentsPage() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
    const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null);

    const [formData, setFormData] = useState({
        name: "Betflix",
        code: "BETFLIX",
        isMain: false,
        upline: "",
        apiKey: "https://api.bfx.fail",
        xApiKey: "", // Used as Token for Nexus
        xApiCat: "",
        gameEntrance: "",
        callbackUrl: "",
        rtp: "95",
        minBet: "1",
        maxBet: "10000",
        isActive: true
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        try {
            const res = await api.get("/admin/settings/agent");
            if (res.data.success) {
                setAgents(res.data.data);
            }
        } catch (error) {
            console.error("Fetch agents error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const openModal = (agent?: Agent) => {
        if (agent) {
            setEditingAgent(agent);
            setFormData({
                name: agent.name,
                code: agent.code || agent.name.toUpperCase(),
                isMain: agent.isMain || false,
                upline: agent.upline || "",
                apiKey: agent.apiKey || "",
                xApiKey: agent.xApiKey || "",
                xApiCat: agent.xApiCat || "",
                gameEntrance: agent.gameEntrance || "",
                callbackUrl: agent.callbackUrl || "",
                rtp: (agent.rtp * 100).toString(),
                minBet: agent.minBet.toString(),
                maxBet: agent.maxBet.toString(),
                isActive: agent.isActive
            });
        } else {
            setEditingAgent(null);
            setFormData({
                name: "Betflix",
                code: "BETFLIX",
                isMain: false,
                upline: "",
                apiKey: "https://api.bfx.fail",
                xApiKey: "",
                xApiCat: "",
                gameEntrance: "",
                callbackUrl: "",
                rtp: "95",
                minBet: "1",
                maxBet: "10000",
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const openDeleteModal = (agent: Agent) => {
        setDeletingAgent(agent);
        setIsDeleteModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error("กรุณากรอกชื่อ Agent");
            return;
        }
        if (!formData.code.trim()) {
            toast.error("กรุณาระบุ Code (เช่น BETFLIX, NEXUS)");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                ...formData,
                rtp: parseFloat(formData.rtp) / 100,
                minBet: parseFloat(formData.minBet),
                maxBet: parseFloat(formData.maxBet)
            };

            if (editingAgent) {
                await api.put(`/admin/settings/agent/${editingAgent.id}`, payload);
            } else {
                await api.post("/admin/settings/agent", payload);
            }
            setIsModalOpen(false);
            fetchAgents();
            toast.success("บันทึกสำเร็จ");
        } catch (error: any) {
            console.error("Save error:", error);
            toast.error(error.response?.data?.message || "เกิดข้อผิดพลาด");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingAgent) return;
        try {
            await api.delete(`/admin/settings/agent/${deletingAgent.id}`);
            setIsDeleteModalOpen(false);
            fetchAgents();
            toast.success("ลบสำเร็จ");
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("ไม่สามารถลบได้");
        }
    };

    const toggleStatus = async (agent: Agent) => {
        try {
            await api.patch(`/admin/settings/agent/${agent.id}/toggle`);
            fetchAgents();
        } catch (error) {
            console.error("Toggle error:", error);
        }
    };

    // Helper to auto-fill defaults based on Type
    const handleTypeChange = (type: string) => {
        let updates: any = { code: type };
        if (type === 'BETFLIX') {
            updates.name = 'Betflix (Main)';
            updates.apiKey = 'https://api.bfx.fail';
        } else if (type === 'NEXUS') {
            updates.name = 'Nexus';
            updates.apiKey = 'https://api.nexusggr.com';
        }
        setFormData({ ...formData, ...updates });
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">จัดการ Agent (API Connection)</h2>
                <button
                    onClick={() => openModal()}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-800 flex items-center gap-2"
                >
                    <Plus size={18} /> เพิ่ม Agent
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center text-slate-400">กำลังโหลด...</div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Code</th>
                                <th className="px-6 py-4">ชื่อเรียก</th>
                                <th className="px-6 py-4">Endpoint</th>
                                <th className="px-6 py-4 text-center">Main</th>
                                <th className="px-6 py-4 text-center">สถานะ</th>
                                <th className="px-6 py-4 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {agents.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-12 text-slate-400">ไม่พบข้อมูล Agent</td></tr>
                            ) : (
                                agents.map((agent) => (
                                    <tr key={agent.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <span className="font-mono font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">
                                                {agent.code}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{agent.name}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500 truncate max-w-[150px]">{agent.apiKey || "-"}</td>
                                        <td className="px-6 py-4 text-center">
                                            {agent.isMain && (
                                                <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold">
                                                    <Star size={12} fill="currentColor" /> Main
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => toggleStatus(agent)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium ${agent.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}
                                            >
                                                {agent.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <a href={`/agents/${agent.id}`} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg flex items-center gap-1 border border-blue-100 bg-white shadow-sm transition-all hover:shadow-md">
                                                    <Settings size={16} />
                                                    <span className="text-xs font-bold">ตั้งค่า</span>
                                                </a>
                                                <button onClick={() => openDeleteModal(agent)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg border border-transparent hover:border-red-100">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">{editingAgent ? 'แก้ไข Agent' : 'เพิ่ม Agent ใหม่'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">

                            {/* Template Selection */}
                            {!editingAgent && (
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <button
                                        onClick={() => handleTypeChange('BETFLIX')}
                                        className={`p-3 border rounded-lg text-center ${formData.code === 'BETFLIX' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        Betflix
                                    </button>
                                    <button
                                        onClick={() => handleTypeChange('NEXUS')}
                                        className={`p-3 border rounded-lg text-center ${formData.code === 'NEXUS' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        Nexus
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Agent Code (System)</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 font-mono uppercase"
                                        placeholder="EX: BETFLIX"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <input
                                    type="checkbox"
                                    id="isMain"
                                    checked={formData.isMain}
                                    onChange={(e) => setFormData({ ...formData, isMain: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-300 text-blue-500"
                                />
                                <div>
                                    <label htmlFor="isMain" className="text-sm font-bold text-slate-800">ตั้งเป็น Main Agent</label>
                                    <p className="text-xs text-slate-500">ใช้เป็นค่าเริ่มต้นสำหรับเกมที่ไม่ได้ระบุค่าย และใช้ยืนยันยอดเงินหลัก</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">API Endpoint</label>
                                <input
                                    type="text"
                                    value={formData.apiKey}
                                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono text-sm text-slate-900 bg-slate-50"
                                />
                            </div>

                            {/* Dynamic Fields based on Type */}
                            {formData.code === 'BETFLIX' ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Upline (Prefix)</label>
                                            <input
                                                type="text"
                                                value={formData.upline}
                                                onChange={(e) => setFormData({ ...formData, upline: e.target.value })}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">x-api-key</label>
                                            <input
                                                type="text"
                                                value={formData.xApiKey}
                                                onChange={(e) => setFormData({ ...formData, xApiKey: e.target.value })}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">x-api-cat</label>
                                            <input
                                                type="text"
                                                value={formData.xApiCat}
                                                onChange={(e) => setFormData({ ...formData, xApiCat: e.target.value })}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Game Entrance</label>
                                            <input
                                                type="text"
                                                value={formData.gameEntrance}
                                                onChange={(e) => setFormData({ ...formData, gameEntrance: e.target.value })}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : formData.code === 'NEXUS' ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Agent Code (Upline)</label>
                                            <input
                                                type="text"
                                                value={formData.upline}
                                                onChange={(e) => setFormData({ ...formData, upline: e.target.value })}
                                                placeholder="Nexus Agent Code"
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Agent Token (Secret)</label>
                                            <input
                                                type="password"
                                                value={formData.xApiKey} // Reuse xApiKey for Token
                                                onChange={(e) => setFormData({ ...formData, xApiKey: e.target.value })}
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono text-sm"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                                        * Nexus ใช้ช่อง <strong>Agent Code</strong> เป็น 'agent_code' และ <strong>Token</strong> เป็น 'agent_token'
                                    </p>
                                </>
                            ) : (
                                // Generic Fallback
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Key 1 (Upline/Prefix)</label>
                                        <input
                                            type="text"
                                            value={formData.upline}
                                            onChange={(e) => setFormData({ ...formData, upline: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Key 2 (API Key/Token)</label>
                                        <input
                                            type="text"
                                            value={formData.xApiKey}
                                            onChange={(e) => setFormData({ ...formData, xApiKey: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Callback URL (Optional)</label>
                                <input
                                    type="text"
                                    value={formData.callbackUrl}
                                    onChange={(e) => setFormData({ ...formData, callbackUrl: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">RTP (%)</label>
                                    <input type="number" min="1" max="100" value={formData.rtp} onChange={(e) => setFormData({ ...formData, rtp: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Min Bet</label>
                                    <input type="number" value={formData.minBet} onChange={(e) => setFormData({ ...formData, minBet: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Bet</label>
                                    <input type="number" value={formData.maxBet} onChange={(e) => setFormData({ ...formData, maxBet: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900" />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <input type="checkbox" id="agentActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-yellow-500" />
                                <label htmlFor="agentActive" className="text-sm font-medium text-slate-700">เปิดใช้งาน</label>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">ยกเลิก</button>
                            <button onClick={handleSave} disabled={isSaving} className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2">
                                <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteModalOpen && deletingAgent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="text-red-500" size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-2">ยืนยันการลบ</h3>
                            <p className="text-slate-500 mb-6">คุณต้องการลบ Agent <strong>{deletingAgent.name}</strong> ใช่หรือไม่?</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">ยกเลิก</button>
                            <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">ลบ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

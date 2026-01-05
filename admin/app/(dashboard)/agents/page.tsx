"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Plus, Sliders, X, Save, AlertTriangle, Trash2 } from "lucide-react";

interface Agent {
    id: number;
    name: string;
    prefix: string;
    apiKey?: string;
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
        name: "",
        prefix: "",
        apiKey: "",
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
                prefix: agent.prefix,
                apiKey: agent.apiKey || "",
                callbackUrl: agent.callbackUrl || "",
                rtp: (agent.rtp * 100).toString(),
                minBet: agent.minBet.toString(),
                maxBet: agent.maxBet.toString(),
                isActive: agent.isActive
            });
        } else {
            setEditingAgent(null);
            setFormData({ name: "", prefix: "", apiKey: "", callbackUrl: "", rtp: "95", minBet: "1", maxBet: "10000", isActive: true });
        }
        setIsModalOpen(true);
    };

    const openDeleteModal = (agent: Agent) => {
        setDeletingAgent(agent);
        setIsDeleteModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim() || !formData.prefix.trim()) {
            alert("กรุณากรอกชื่อและ Prefix");
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
        } catch (error) {
            console.error("Save error:", error);
            alert("เกิดข้อผิดพลาด");
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
        } catch (error) {
            console.error("Delete error:", error);
            alert("ไม่สามารถลบได้");
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">จัดการ Agent & เกม</h2>
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
                                <th className="px-6 py-4">ชื่อ Agent</th>
                                <th className="px-6 py-4">Prefix</th>
                                <th className="px-6 py-4 text-center">RTP</th>
                                <th className="px-6 py-4 text-center">Min Bet</th>
                                <th className="px-6 py-4 text-center">Max Bet</th>
                                <th className="px-6 py-4 text-center">สถานะ</th>
                                <th className="px-6 py-4 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {agents.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-12 text-slate-400">ไม่พบข้อมูล Agent</td></tr>
                            ) : (
                                agents.map((agent) => (
                                    <tr key={agent.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-bold text-slate-800">{agent.name}</td>
                                        <td className="px-6 py-4 font-mono text-slate-600">{agent.prefix}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-bold text-yellow-600">{(agent.rtp * 100).toFixed(0)}%</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">{agent.minBet}</td>
                                        <td className="px-6 py-4 text-center">{agent.maxBet.toLocaleString()}</td>
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
                                                <button onClick={() => openModal(agent)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg">
                                                    <Sliders size={18} />
                                                </button>
                                                <button onClick={() => openDeleteModal(agent)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ Agent</label>
                                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Prefix</label>
                                    <input type="text" value={formData.prefix} onChange={(e) => setFormData({ ...formData, prefix: e.target.value })} placeholder="SPIN" className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
                                <input type="text" value={formData.apiKey} onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg font-mono text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Callback URL</label>
                                <input type="text" value={formData.callbackUrl} onChange={(e) => setFormData({ ...formData, callbackUrl: e.target.value })} placeholder="https://..." className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">RTP (%)</label>
                                    <input type="number" min="1" max="100" value={formData.rtp} onChange={(e) => setFormData({ ...formData, rtp: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Min Bet</label>
                                    <input type="number" value={formData.minBet} onChange={(e) => setFormData({ ...formData, minBet: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Bet</label>
                                    <input type="number" value={formData.maxBet} onChange={(e) => setFormData({ ...formData, maxBet: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
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

"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Search, Save, Filter, RefreshCw, CheckSquare, Square, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

interface Provider {
    id: number;
    name: string;
    _count?: { games: number };
}

interface Agent {
    id: number;
    name: string;
    code: string;
    isMain: boolean;
}

interface Game {
    id: number;
    name: string;
    slug: string;
    agentId?: number | null;
    isActive: boolean;
    providerId: number;
}

export default function MixBoardPage() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [games, setGames] = useState<Game[]>([]);

    const [selectedProvider, setSelectedProvider] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Selection
    const [selectedGameIds, setSelectedGameIds] = useState<number[]>([]);
    const [targetAgentId, setTargetAgentId] = useState<number | "">("");

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedProvider) {
            fetchGames(selectedProvider);
        } else {
            setGames([]);
        }
    }, [selectedProvider]);

    const fetchInitialData = async () => {
        try {
            const [provRes, agentRes] = await Promise.all([
                api.get("/admin/providers"),
                api.get("/admin/settings/agent")
            ]);

            if (provRes.data.success) setProviders(provRes.data.data);
            if (agentRes.data.success) setAgents(agentRes.data.data);

            // Auto Select First Provider
            if (provRes.data.data.length > 0) {
                setSelectedProvider(provRes.data.data[0].id);
            }

        } catch (error) {
            console.error("Initial fetch error:", error);
            toast.error("โหลดข้อมูลล้มเหลว");
        }
    };

    const fetchGames = async (providerId: number) => {
        setIsLoading(true);
        try {
            const res = await api.get(`/admin/games?providerId=${providerId}`);
            if (res.data.success) {
                setGames(res.data.data);
                setSelectedGameIds([]); // Reset selection
            }
        } catch (error) {
            console.error("Fetch games error:", error);
            toast.error("โหลดเกมล้มเหลว");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSelectGame = (id: number) => {
        if (selectedGameIds.includes(id)) {
            setSelectedGameIds(selectedGameIds.filter(g => g !== id));
        } else {
            setSelectedGameIds([...selectedGameIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedGameIds.length === games.length) {
            setSelectedGameIds([]);
        } else {
            setSelectedGameIds(games.map(g => g.id));
        }
    };

    const handleBulkUpdate = async () => {
        if (selectedGameIds.length === 0) {
            toast.error("กรุณาเลือกเกมอย่างน้อย 1 เกม");
            return;
        }

        setIsSaving(true);
        try {
            await api.patch("/admin/games/bulk-update-agent", {
                gameIds: selectedGameIds,
                agentId: targetAgentId === "" ? null : Number(targetAgentId)
            });

            toast.success(`อัปเดต ${selectedGameIds.length} เกมเรียบร้อย!`);
            fetchGames(selectedProvider!); // Refresh
        } catch (error) {
            console.error("Bulk update error:", error);
            toast.error("เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setIsSaving(false);
        }
    };

    const getAgentName = (agentId?: number | null) => {
        if (!agentId) return "Default (Main)";
        const agent = agents.find(a => a.id === agentId);
        return agent ? `${agent.code} (${agent.name})` : "Unknown";
    };

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newProviderName, setNewProviderName] = useState("");
    const [newProviderSlug, setNewProviderSlug] = useState("");

    // Move Games Selection
    const [targetMoveProviderId, setTargetMoveProviderId] = useState<number | "">("");

    const handleCreateProvider = async () => {
        if (!newProviderName || !newProviderSlug) {
            toast.error("กรุณากรอกข้อมูลให้ครบ");
            return;
        }

        try {
            // Default Category ID = 1 (Slots) - hardcoded for now or fetch
            const res = await api.post("/admin/mix/providers", {
                name: newProviderName,
                slug: newProviderSlug,
                categoryId: 1
            });

            if (res.data.success) {
                toast.success("สร้างค่ายเกมสำเร็จ!");
                setShowCreateModal(false);
                setNewProviderName("");
                setNewProviderSlug("");
                fetchInitialData(); // Refresh list
            }
        } catch (error: any) {
            console.error("Create provider error:", error);
            toast.error(error.response?.data?.message || "สร้างค่ายเกมล้มเหลว");
        }
    };

    const handleMoveGames = async () => {
        if (selectedGameIds.length === 0 || !targetMoveProviderId) {
            toast.error("กรุณาเลือกเกมและค่ายปลายทาง");
            return;
        }

        if (!confirm(`ต้องการย้าย ${selectedGameIds.length} เกม ไปยังค่ายใหม่หรือไม่?`)) return;

        setIsSaving(true);
        try {
            await api.post("/admin/mix/move-games", {
                gameIds: selectedGameIds,
                targetProviderId: targetMoveProviderId
            });

            toast.success(`ย้าย ${selectedGameIds.length} เกมเรียบร้อย!`);
            fetchGames(selectedProvider!); // Refresh current view
            setSelectedGameIds([]); // Clear selection
        } catch (error: any) {
            console.error("Move games error:", error);
            toast.error("ย้ายเกมล้มเหลว");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Mix Game Board</h2>
                    <p className="text-slate-500 text-sm">จัดการค่ายเกมผสม (Mix Providers) และกำหนด Agent</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-700 flex items-center gap-2"
                >
                    + สร้างค่ายเกมใหม่ (Custom)
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left: Provider Selector */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-100 p-4 h-fit sticky top-6 max-h-[calc(100vh-100px)] flex flex-col">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Filter size={18} /> เลือกค่ายเกม
                    </h3>
                    <div className="space-y-1 overflow-y-auto flex-1 pr-1">
                        {providers.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedProvider(p.id)}
                                className={`w-full text-left px-4 py-3 rounded-lg flex justify-between items-center transition-all ${selectedProvider === p.id
                                    ? "bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-500"
                                    : "hover:bg-slate-50 text-slate-600"
                                    }`}
                            >
                                <span className="truncate">{p.name}</span>
                                <span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-500 shrink-0">
                                    {p._count?.games || 0}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Game List & Actions */}
                <div className="lg:col-span-3 space-y-4">

                    {/* Bulk Action Bar */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row flex-wrap items-center gap-4 sticky top-6 z-10">
                        <div className="flex items-center gap-2 border-r pr-4">
                            <input
                                type="checkbox"
                                checked={games.length > 0 && selectedGameIds.length === games.length}
                                onChange={toggleSelectAll}
                                className="w-5 h-5 rounded border-slate-300"
                            />
                            <span className="text-sm font-medium whitespace-nowrap">เลือกทั้งหมด ({games.length})</span>
                        </div>

                        <div className="flex-1 flex flex-wrap items-center gap-4">
                            <span className="text-sm text-slate-500 whitespace-nowrap">เลือก {selectedGameIds.length} รายการ:</span>

                            {/* Action 1: Set Agent */}
                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                                <span className="text-xs text-slate-400 font-bold px-1">AGENT:</span>
                                <select
                                    value={targetAgentId}
                                    onChange={(e) => setTargetAgentId(e.target.value === "" ? "" : Number(e.target.value))}
                                    className="px-2 py-1.5 border-0 bg-transparent text-sm min-w-[120px] focus:ring-0"
                                >
                                    <option value="">-- Change Agent --</option>
                                    {agents.map(a => (
                                        <option key={a.id} value={a.id}>
                                            {a.code}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleBulkUpdate}
                                    disabled={selectedGameIds.length === 0 || isSaving || targetAgentId === ""}
                                    className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                                >
                                    บันทึก
                                </button>
                            </div>

                            {/* Action 2: Move Games */}
                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                                <span className="text-xs text-slate-400 font-bold px-1">MOVE TO:</span>
                                <select
                                    value={targetMoveProviderId}
                                    onChange={(e) => setTargetMoveProviderId(e.target.value === "" ? "" : Number(e.target.value))}
                                    className="px-2 py-1.5 border-0 bg-transparent text-sm max-w-[150px] focus:ring-0"
                                >
                                    <option value="">-- Select Provider --</option>
                                    {providers.filter(p => p.id !== selectedProvider).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleMoveGames}
                                    disabled={selectedGameIds.length === 0 || isSaving || targetMoveProviderId === ""}
                                    className="bg-purple-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-purple-700 disabled:opacity-50"
                                >
                                    ย้าย
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Game Grid */}
                    {isLoading ? (
                        <div className="text-center py-20 text-slate-400">กำลังโหลดข้อมูล...</div>
                    ) : games.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 bg-white rounded-xl">ไม่พบรายการเกมในค่ายนี้</div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium">
                                    <tr>
                                        <th className="px-6 py-4 w-[50px]">#</th>
                                        <th className="px-6 py-4">เกม</th>
                                        <th className="px-6 py-4">รหัสเกม</th>
                                        <th className="px-6 py-4">Agent ปัจจุบัน</th>
                                        <th className="px-6 py-4 w-[50px]">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {games.map((game) => {
                                        const isSelected = selectedGameIds.includes(game.id);
                                        const agent = agents.find(a => a.id === game.agentId);

                                        return (
                                            <tr
                                                key={game.id}
                                                className={`hover:bg-slate-50 cursor-pointer ${isSelected ? 'bg-blue-50/30' : ''}`}
                                                onClick={() => toggleSelectGame(game.id)}
                                            >
                                                <td className="px-6 py-4">
                                                    <div onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleSelectGame(game.id)}
                                                            className="w-5 h-5 rounded border-slate-300"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-800">
                                                    <div className="flex items-center gap-3">
                                                        <img src={game.thumbnail || '/placeholder.png'} className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
                                                        <span>{game.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-slate-500">{game.slug}</td>
                                                <td className="px-6 py-4">
                                                    {game.agentId ? (
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${agent?.code === 'BETFLIX' ? 'bg-yellow-100 text-yellow-800' :
                                                            agent?.code === 'NEXUS' ? 'bg-purple-100 text-purple-800' :
                                                                'bg-slate-100 text-slate-800'
                                                            }`}>
                                                            {agent?.code || 'Unknown'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs italic">Default</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`w-2 h-2 rounded-full ${game.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                </div>
            </div>

            {/* Create Provider Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
                        <h3 className="text-xl font-bold mb-4">สร้างค่ายเกมใหม่ (Custom Provider)</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อค่ายเกม (Display Name)</label>
                                <input
                                    type="text"
                                    className="w-full border-slate-300 rounded-lg px-3 py-2"
                                    placeholder="เช่น PG MIX, SLOT HUB"
                                    value={newProviderName}
                                    onChange={e => setNewProviderName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">รหัสค่าย (Slug)</label>
                                <input
                                    type="text"
                                    className="w-full border-slate-300 rounded-lg px-3 py-2 font-mono text-sm"
                                    placeholder="เช่น pg-mix"
                                    value={newProviderSlug}
                                    onChange={e => setNewProviderSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                />
                                <p className="text-xs text-slate-500 mt-1">ใช้ตัวพิมพ์เล็กและขีดกลางเท่านั้น</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleCreateProvider}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
                            >
                                สร้างค่ายเกม
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

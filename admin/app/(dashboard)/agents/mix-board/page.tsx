"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Search, Save, Filter, ArrowRight, ArrowLeft, RefreshCw, Plus, AlertTriangle, Edit2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface Provider {
    id: number;
    name: string;
    slug: string;
    defaultAgentId?: number | null;
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
    thumbnail?: string;
}

export default function MixBoardPage() {
    // Data
    const [providers, setProviders] = useState<Provider[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);

    // Left Pane (Source)
    const [sourceAgentId, setSourceAgentId] = useState<number | "null" | "all">("all");
    const [sourceProviderId, setSourceProviderId] = useState<number | "all">("all");
    const [sourceGames, setSourceGames] = useState<Game[]>([]);
    const [selectedSourceGameIds, setSelectedSourceGameIds] = useState<number[]>([]);
    const [loadingSource, setLoadingSource] = useState(false);

    // Right Pane (Target)
    const [targetProviderId, setTargetProviderId] = useState<number | null>(null);
    const [targetGames, setTargetGames] = useState<Game[]>([]);
    const [loadingTarget, setLoadingTarget] = useState(false);

    // Create/Edit Modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
    const [newProviderName, setNewProviderName] = useState("");
    const [newProviderSlug, setNewProviderSlug] = useState("");

    useEffect(() => {
        fetchInitialData();
    }, []);

    // Fetch Source Games when Source filters change
    useEffect(() => {
        fetchSourceGames();
    }, [sourceAgentId, sourceProviderId]);

    // Fetch Target Games when Target Provider changes
    useEffect(() => {
        if (targetProviderId) {
            fetchTargetGames(targetProviderId);
        } else {
            setTargetGames([]);
        }
    }, [targetProviderId]);

    const fetchInitialData = async () => {
        try {
            const [provRes, agentRes] = await Promise.all([
                api.get("/admin/providers"),
                api.get("/admin/settings/agent")
            ]);
            if (provRes.data.success) setProviders(provRes.data.data);
            if (agentRes.data.success) setAgents(agentRes.data.data);
        } catch (error) {
            console.error("Initial fetch error:", error);
            toast.error("โหลดข้อมูลล้มเหลว");
        }
    };

    const fetchSourceGames = async () => {
        setLoadingSource(true);
        try {
            let url = `/admin/games?isActive=true`; // Only active games?
            if (sourceAgentId !== "all") url += `&agentId=${sourceAgentId}`;
            if (sourceProviderId !== "all") url += `&providerId=${sourceProviderId}`;

            const res = await api.get(url);
            if (res.data.success) {
                setSourceGames(res.data.data);
                setSelectedSourceGameIds([]);
            }
        } catch (error) {
            console.error("Fetch source games error:", error);
        } finally {
            setLoadingSource(false);
        }
    };

    const fetchTargetGames = async (provId: number) => {
        setLoadingTarget(true);
        try {
            const res = await api.get(`/admin/games?providerId=${provId}`);
            if (res.data.success) {
                setTargetGames(res.data.data);
            }
        } catch (error) {
            console.error("Fetch target games error:", error);
        } finally {
            setLoadingTarget(false);
        }
    };

    const handleCreateProvider = async () => {
        if (!newProviderName || !newProviderSlug) {
            toast.error("กรุณากรอกข้อมูลให้ครบ");
            return;
        }
        try {
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
                fetchInitialData();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "สร้างค่ายเกมล้มเหลว");
        }
    };

    const handleUpdateProvider = async () => {
        if (!editingProvider || !newProviderName || !newProviderSlug) return;
        try {
            const res = await api.put(`/admin/providers/${editingProvider.id}`, {
                name: newProviderName,
                slug: newProviderSlug
            });
            if (res.data.success) {
                toast.success("แก้ไขค่ายเกมสำเร็จ!");
                setShowEditModal(false);
                setEditingProvider(null);
                fetchInitialData();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "แก้ไขล้มเหลว");
        }
    };

    const handleDeleteProvider = async (id: number) => {
        if (!confirm("ยืนยันการลบค่ายเกมนี้? (ต้องไม่มีเกมเหลืออยู่)")) return;
        try {
            await api.delete(`/admin/providers/${id}`);
            toast.success("ลบค่ายเกมสำเร็จ");
            setTargetProviderId(null);
            fetchInitialData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "ลบล้มเหลว");
        }
    };

    // Helper to open edit modal
    const openEditModal = () => {
        const provider = providers.find(p => p.id === targetProviderId);
        if (provider) {
            setEditingProvider(provider);
            setNewProviderName(provider.name);
            setNewProviderSlug(provider.slug);
            setShowEditModal(true);
        }
    };
    if (selectedSourceGameIds.length === 0 || !targetProviderId) {
        toast.error("กรุณาเลือกเกมและค่ายปลายทาง");
        return;
    }

    // DUPLICATE DETECTION
    const targetNames = new Set(targetGames.map(g => g.name.toLowerCase().trim()));
    const gamesToMove = sourceGames.filter(g => selectedSourceGameIds.includes(g.id));

    const duplicates = gamesToMove.filter(g => targetNames.has(g.name.toLowerCase().trim()));
    const uniqueGames = gamesToMove.filter(g => !targetNames.has(g.name.toLowerCase().trim()));

    if (duplicates.length > 0) {
        const confirmMsg = `พบเกมซ้ำชื่อเดียวกัน ${duplicates.length} เกม ในค่ายปลายทาง! (เช่น ${duplicates[0].name})\n\nระบบจะ "ยกเลิก" เกมที่ซ้ำ และย้ายเฉพาะ ${uniqueGames.length} เกมที่ไม่ซ้ำ\nยืนยันหรือไม่?`;

        // Custom confirmation logic or standard confirm
        if (!confirm(confirmMsg)) return;

        if (uniqueGames.length === 0) {
            toast.error("ไม่มีเกมให้ย้าย (ซ้ำทั้งหมด)");
            return;
        }

        await executeMove(uniqueGames.map(g => g.id));
    } else {
        if (!confirm(`ยืนยันการย้าย ${gamesToMove.length} เกม?`)) return;
        await executeMove(selectedSourceGameIds);
    }
};

const executeMove = async (gameIds: number[]) => {
    try {
        await api.post("/admin/mix/move-games", {
            gameIds: gameIds,
            targetProviderId: targetProviderId
        });
        toast.success(`ย้าย ${gameIds.length} เกมเรียบร้อย!`);
        fetchSourceGames();
        fetchTargetGames(targetProviderId!);
        setSelectedSourceGameIds([]);
    } catch (error) {
        console.error(error);
        toast.error("ย้ายเกมล้มเหลว");
    }
};

// Helper to toggle selection
const toggleSourceSelect = (id: number) => {
    if (selectedSourceGameIds.includes(id)) {
        setSelectedSourceGameIds(selectedSourceGameIds.filter(x => x !== id));
    } else {
        setSelectedSourceGameIds([...selectedSourceGameIds, id]);
    }
};

const toggleAllSource = () => {
    if (selectedSourceGameIds.length === sourceGames.length) setSelectedSourceGameIds([]);
    else setSelectedSourceGameIds(sourceGames.map(g => g.id));
};

return (
    <div className="max-w-[1800px] mx-auto p-4 space-y-4 h-[calc(100vh-100px)] flex flex-col">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Mix Board Management</h2>
                <p className="text-slate-500 text-sm">จัดการย้ายเกมข้ามค่าย / สร้างค่ายผสม (Dual Pane)</p>
            </div>
            <button
                onClick={() => setShowCreateModal(true)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-700 flex items-center gap-2"
            >
                <Plus size={16} /> สร้างค่ายใหม่ (Custom)
            </button>
        </div>

        {/* Main Dual Pane Content */}
        <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden">

            {/* LEFT PANE: SOURCE */}
            <div className="col-span-12 md:col-span-5 bg-white rounded-xl shadow border border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-700 font-bold">
                            <ArrowLeft size={18} className="text-blue-500" /> ต้นทาง (Source)
                        </div>
                        {selectedSourceGameIds.length > 0 && (
                            <button
                                onClick={handleMoveGames}
                                disabled={!targetProviderId}
                                className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-400 flex items-center gap-1 transition-all"
                            >
                                <span>ย้าย {selectedSourceGameIds.length} เกม</span>
                                <ArrowRight size={12} />
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <select
                            value={sourceAgentId}
                            onChange={(e) => setSourceAgentId(e.target.value as any)}
                            className="w-full text-sm border-slate-300 rounded-lg"
                        >
                            <option value="all">ทุกกระดาน (Agents)</option>
                            <option value="null">Nexus (Default/Null)</option>
                            {agents.map(a => (
                                <option key={a.id} value={a.id}>{a.code}</option>
                            ))}
                        </select>
                        <select
                            value={sourceProviderId}
                            onChange={(e) => setSourceProviderId(e.target.value as any)}
                            className="w-full text-sm border-slate-300 rounded-lg"
                        >
                            <option value="all">ทุกค่ายเกม</option>
                            {providers
                                .filter(p => {
                                    if (sourceAgentId === "all") return true;
                                    if (sourceAgentId === "null") return p.defaultAgentId === null;
                                    return p.defaultAgentId === Number(sourceAgentId);
                                })
                                .map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                        </select>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>พบ {sourceGames.length} เกม</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={sourceGames.length > 0 && selectedSourceGameIds.length === sourceGames.length}
                                onChange={toggleAllSource}
                                className="rounded border-slate-300"
                            />
                            <label>เลือกทั้งหมด</label>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loadingSource ? (
                        <div className="text-center py-10 text-slate-400">Loading...</div>
                    ) : sourceGames.map(game => {
                        // Check if already in target (visual cue)
                        const inTarget = targetGames.some(t => t.slug === game.slug || t.name === game.name);
                        const isSelected = selectedSourceGameIds.includes(game.id);

                        return (
                            <div
                                key={game.id}
                                onClick={() => !inTarget && toggleSourceSelect(game.id)}
                                className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${inTarget
                                    ? "opacity-50 bg-slate-100 border-slate-200 cursor-not-allowed"
                                    : isSelected
                                        ? "bg-blue-50 border-blue-300 ring-1 ring-blue-300"
                                        : "bg-white border-slate-100 hover:border-blue-200"
                                    }`}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? "bg-blue-500 border-blue-500" : "border-slate-300"}`}>
                                    {isSelected && <ArrowRight size={10} className="text-white" />}
                                </div>
                                <img src={game.thumbnail || '/placeholder.png'} className="w-10 h-10 rounded object-cover bg-slate-200" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm truncate text-slate-700">{game.name}</div>
                                    <div className="text-xs text-slate-400 truncate">{game.slug}</div>
                                </div>
                                {inTarget && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1 rounded flex items-center gap-1"><AlertTriangle size={10} /> มีแล้ว</span>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* MIDDLE: ACTIONS */}
            <div className="col-span-12 md:col-span-2 flex flex-col justify-center items-center gap-4">
                <div className="bg-slate-100 p-4 rounded-full">
                    <ArrowRight size={24} className="text-slate-400" />
                </div>
                <button
                    onClick={handleMoveGames}
                    disabled={selectedSourceGameIds.length === 0 || !targetProviderId}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all flex flex-col items-center min-w-[140px]"
                >
                    {!targetProviderId ? (
                        <span>เลือกปลายทาง</span>
                    ) : selectedSourceGameIds.length === 0 ? (
                        <span>เลือกเกม</span>
                    ) : (
                        <span>ย้าย {selectedSourceGameIds.length} เกม</span>
                    )}
                    {/* <span className="text-xs opacity-80">({selectedSourceGameIds.length} items)</span> */}
                </button>
                <p className="text-center text-xs text-slate-400 px-4">
                    เกมที่ซ้ำชื่อในปลายทาง<br />จะถูกข้ามอัตโนมัติ
                </p>
            </div>

            {/* RIGHT PANE: TARGET */}
            <div className="col-span-12 md:col-span-5 bg-white rounded-xl shadow border border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-emerald-50 rounded-t-xl space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold flex-1">
                            ปลายทาง (Mix Target) <Save size={18} />
                        </div>
                        {targetProviderId && (
                            <div className="flex gap-1">
                                <button onClick={openEditModal} className="p-1 hover:bg-emerald-100 rounded text-emerald-600" title="แก้ไขชื่อ">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDeleteProvider(targetProviderId!)} className="p-1 hover:bg-red-100 rounded text-red-500" title="ลบค่ายนี้">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}
                        <select
                            value={targetProviderId || ""}
                            onChange={(e) => setTargetProviderId(e.target.value ? Number(e.target.value) : null)}
                            className="w-full text-sm border-emerald-300 ring-emerald-200 rounded-lg focus:ring-emerald-500"
                        >
                            <option value="">-- เลือกค่ายปลายทาง --</option>
                            {providers.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p._count?.games || 0})</option>
                            ))}
                        </select>
                        <div className="text-xs text-emerald-600 font-medium text-right">
                            มี {targetGames.length} เกมในค่ายนี้
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50/50">
                        {loadingTarget ? (
                            <div className="text-center py-10 text-slate-400">Loading...</div>
                        ) : targetGames.length === 0 ? (
                            <div className="text-center py-20 text-slate-400 text-sm">ยังไม่มีเกมในค่ายนี้<br />เลือกค่ายแล้วย้ายเกมมาใส่ได้เลย</div>
                        ) : targetGames.map(game => (
                            <div key={game.id} className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 bg-white opacity-80">
                                <img src={game.thumbnail || '/placeholder.png'} className="w-8 h-8 rounded object-cover grayscale opacity-70" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate text-slate-600">{game.name}</div>
                                </div>
                            </div>
                        ))}
                    </div>
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

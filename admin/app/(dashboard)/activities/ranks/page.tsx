"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, Save, Trash2, Trophy } from "lucide-react";
import api from "@/lib/api";

interface RankTier {
    id: string;
    name: string;
    icon: string;
    minDeposit: number;
    benefit: string;
    colorFrom: string;
    colorTo: string;
}

const DEFAULT_RANK_TIERS: RankTier[] = [
    { id: "bronze", name: "Bronze", icon: "🥉", minDeposit: 0, benefit: "Cashback 3%", colorFrom: "#CD7F32", colorTo: "#A0522D" },
    { id: "silver", name: "Silver", icon: "🥈", minDeposit: 5000, benefit: "Cashback 4%", colorFrom: "#C0C0C0", colorTo: "#A8A8A8" },
    { id: "gold", name: "Gold", icon: "🥇", minDeposit: 20000, benefit: "Cashback 5%", colorFrom: "#FFD700", colorTo: "#FFA500" },
    { id: "platinum", name: "Platinum", icon: "💎", minDeposit: 50000, benefit: "Cashback 7%", colorFrom: "#00CED1", colorTo: "#4169E1" },
    { id: "diamond", name: "Diamond", icon: "👑", minDeposit: 100000, benefit: "Cashback 10%", colorFrom: "#9B59B6", colorTo: "#E91E63" },
];

export default function AdminRanksPage() {
    const [tiers, setTiers] = useState<RankTier[]>(DEFAULT_RANK_TIERS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchTiers = async () => {
            try {
                const res = await api.get("/admin/activities/ranks");
                if (res.data.success && Array.isArray(res.data.data)) {
                    setTiers(res.data.data);
                }
            } catch (error) {
                console.error("Fetch rank tiers error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTiers();
    }, []);

    const updateTier = <K extends keyof RankTier>(index: number, key: K, value: RankTier[K]) => {
        setTiers((current) =>
            current.map((tier, tierIndex) => (tierIndex === index ? { ...tier, [key]: value } : tier))
        );
    };

    const addTier = () => {
        setTiers((current) => [
            ...current,
            {
                id: `tier_${Date.now()}`,
                name: `Tier ${current.length + 1}`,
                icon: "🏅",
                minDeposit: current.length > 0 ? Number(current[current.length - 1].minDeposit || 0) + 10000 : 0,
                benefit: "สิทธิประโยชน์ใหม่",
                colorFrom: "#64748B",
                colorTo: "#334155",
            },
        ]);
    };

    const removeTier = (index: number) => {
        setTiers((current) => current.filter((_, tierIndex) => tierIndex !== index));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const normalized = [...tiers].sort((a, b) => Number(a.minDeposit) - Number(b.minDeposit));
            const res = await api.put("/admin/activities/ranks", { tiers: normalized });
            if (res.data.success) {
                setTiers(res.data.data);
                toast.success("บันทึก Rank สำเร็จ");
            }
        } catch (error) {
            console.error("Save rank tiers error:", error);
            toast.error("บันทึก Rank ไม่สำเร็จ");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">จัดการ Rank</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        แก้ไขระดับ VIP/Rank จากหลังบ้าน และให้หน้า player ใช้ tier ชุดเดียวกันทันที
                    </p>
                </div>
                <Link href="/activities" className="text-sm text-blue-500 hover:underline">
                    ← กลับ
                </Link>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                            <Trophy size={20} className="text-yellow-500" />
                            ระดับ Rank ทั้งหมด
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            เรียงลำดับตามยอดฝากสะสมขั้นต่ำ ระบบจะ sort ให้ก่อนบันทึก
                        </p>
                    </div>
                    <button
                        onClick={addTier}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        <Plus size={16} />
                        เพิ่ม Rank
                    </button>
                </div>

                <div className="mt-6 space-y-4">
                    {loading ? (
                        <div className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center text-slate-400">
                            กำลังโหลดข้อมูล Rank...
                        </div>
                    ) : (
                        tiers.map((tier, index) => (
                            <div key={tier.id} className="overflow-hidden rounded-2xl border border-slate-200">
                                <div
                                    className="px-5 py-4 text-white"
                                    style={{ background: `linear-gradient(135deg, ${tier.colorFrom}, ${tier.colorTo})` }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl">{tier.icon}</span>
                                            <div>
                                                <p className="text-xs uppercase tracking-[0.2em] text-white/70">Tier {index + 1}</p>
                                                <p className="text-xl font-black">{tier.name || `Tier ${index + 1}`}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeTier(index)}
                                            disabled={tiers.length <= 1}
                                            className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                                            title="ลบ Rank"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">ชื่อ Rank</label>
                                        <input
                                            value={tier.name}
                                            onChange={(event) => updateTier(index, "name", event.target.value)}
                                            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Icon</label>
                                        <input
                                            value={tier.icon}
                                            onChange={(event) => updateTier(index, "icon", event.target.value)}
                                            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">ยอดฝากสะสมขั้นต่ำ</label>
                                        <input
                                            type="number"
                                            value={tier.minDeposit}
                                            onChange={(event) => updateTier(index, "minDeposit", Number(event.target.value) || 0)}
                                            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                                        />
                                    </div>
                                    <div className="xl:col-span-3">
                                        <label className="mb-1 block text-sm font-medium text-slate-700">สิทธิประโยชน์</label>
                                        <input
                                            value={tier.benefit}
                                            onChange={(event) => updateTier(index, "benefit", event.target.value)}
                                            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">สีเริ่มต้น</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={tier.colorFrom}
                                                onChange={(event) => updateTier(index, "colorFrom", event.target.value)}
                                                className="h-11 w-14 rounded-lg border border-slate-200 bg-white p-1"
                                            />
                                            <input
                                                value={tier.colorFrom}
                                                onChange={(event) => updateTier(index, "colorFrom", event.target.value)}
                                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">สีปลายทาง</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={tier.colorTo}
                                                onChange={(event) => updateTier(index, "colorTo", event.target.value)}
                                                className="h-11 w-14 rounded-lg border border-slate-200 bg-white p-1"
                                            />
                                            <input
                                                value={tier.colorTo}
                                                onChange={(event) => updateTier(index, "colorTo", event.target.value)}
                                                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-5 py-3 font-semibold text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Save size={18} />
                        {saving ? "กำลังบันทึก..." : "บันทึก Rank"}
                    </button>
                </div>
            </div>
        </div>
    );
}

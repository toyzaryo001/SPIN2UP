"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Image as ImageIcon, Loader2, Plus, Save, Trash2, Trophy, Upload, X } from "lucide-react";
import api from "@/lib/api";

interface RankTier {
    id: string;
    name: string;
    logo: string;
    icon: string;
    minDeposit: number;
    rewardAmount: number;
    rewardTurnover: number;
    colorFrom: string;
    colorTo: string;
}

const DEFAULT_RANK_TIERS: RankTier[] = [
    { id: "bronze", name: "Bronze", logo: "", icon: "1", minDeposit: 0, rewardAmount: 0, rewardTurnover: 0, colorFrom: "#CD7F32", colorTo: "#A0522D" },
    { id: "silver", name: "Silver", logo: "", icon: "2", minDeposit: 5000, rewardAmount: 100, rewardTurnover: 500, colorFrom: "#C0C0C0", colorTo: "#A8A8A8" },
    { id: "gold", name: "Gold", logo: "", icon: "3", minDeposit: 20000, rewardAmount: 300, rewardTurnover: 1500, colorFrom: "#FFD700", colorTo: "#FFA500" },
];

export default function AdminRanksPage() {
    const [tiers, setTiers] = useState<RankTier[]>(DEFAULT_RANK_TIERS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

    useEffect(() => {
        const fetchTiers = async () => {
            try {
                const res = await api.get("/admin/activities/ranks");
                if (res.data.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
                    setTiers(res.data.data);
                }
            } catch (error) {
                console.error("Fetch rank tiers error:", error);
                toast.error("โหลดข้อมูล Rank ไม่สำเร็จ");
            } finally {
                setLoading(false);
            }
        };

        fetchTiers();
    }, []);

    const updateTier = <K extends keyof RankTier>(index: number, key: K, value: RankTier[K]) => {
        setTiers((current) => current.map((tier, tierIndex) => (
            tierIndex === index ? { ...tier, [key]: value } : tier
        )));
    };

    const addTier = () => {
        const nextIndex = tiers.length + 1;
        const lastMinDeposit = tiers.length > 0 ? Number(tiers[tiers.length - 1].minDeposit || 0) : 0;

        setTiers((current) => [
            ...current,
            {
                id: `tier_${Date.now()}`,
                name: `Tier ${nextIndex}`,
                logo: "",
                icon: String(nextIndex),
                minDeposit: lastMinDeposit + 10000,
                rewardAmount: 0,
                rewardTurnover: 0,
                colorFrom: "#64748B",
                colorTo: "#334155",
            },
        ]);
    };

    const removeTier = (index: number) => {
        setTiers((current) => current.filter((_, tierIndex) => tierIndex !== index));
    };

    const handleLogoUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast.error("กรุณาเลือกไฟล์รูปภาพ");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("ไฟล์ต้องมีขนาดไม่เกิน 5MB");
            return;
        }

        setUploadingIndex(index);
        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const res = await api.post("/admin/upload", {
                image: base64,
                folder: "ranks",
            });

            if (res.data.success) {
                updateTier(index, "logo", res.data.data.url);
                toast.success("อัปโหลดโลโก้ Rank สำเร็จ");
            } else {
                throw new Error(res.data.message || "Upload failed");
            }
        } catch (error: any) {
            console.error("Upload rank logo error:", error);
            toast.error(error.response?.data?.message || "อัปโหลดโลโก้ Rank ไม่สำเร็จ");
        } finally {
            setUploadingIndex(null);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const normalized = [...tiers]
                .map((tier) => ({
                    ...tier,
                    id: String(tier.id || "").trim(),
                    name: String(tier.name || "").trim(),
                    logo: String(tier.logo || "").trim(),
                    icon: String(tier.icon || "").trim(),
                    minDeposit: Number(tier.minDeposit || 0),
                    rewardAmount: Number(tier.rewardAmount || 0),
                    rewardTurnover: Number(tier.rewardTurnover || 0),
                    colorFrom: String(tier.colorFrom || "#64748B").trim(),
                    colorTo: String(tier.colorTo || "#334155").trim(),
                }))
                .sort((a, b) => a.minDeposit - b.minDeposit);

            const res = await api.put("/admin/activities/ranks", { tiers: normalized });
            if (res.data.success) {
                setTiers(res.data.data);
                toast.success("บันทึก Rank สำเร็จ");
            }
        } catch (error: any) {
            console.error("Save rank tiers error:", error);
            toast.error(error.response?.data?.message || "บันทึก Rank ไม่สำเร็จ");
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
                        กำหนดยอดฝากสะสมปลดล็อก Rank, โบนัสที่ให้กดรับ, เทิร์นของโบนัส และโลโก้ที่หน้า player ใช้งานจริง
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
                            ระบบจะเรียงลำดับตามยอดฝากสะสมขั้นต่ำ และผู้เล่นจะกดรับโบนัสปลดล็อกได้ครั้งเดียวต่อ Rank
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
                            <div key={`${tier.id}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200">
                                <div
                                    className="px-5 py-4 text-white"
                                    style={{ background: `linear-gradient(135deg, ${tier.colorFrom}, ${tier.colorTo})` }}
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10">
                                                {tier.logo ? (
                                                    <img src={tier.logo} alt={tier.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <span className="text-2xl font-black">{tier.icon || index + 1}</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-[0.2em] text-white/70">Tier {index + 1}</p>
                                                <p className="text-xl font-black">{tier.name || `Tier ${index + 1}`}</p>
                                                <p className="mt-1 text-xs text-white/80">
                                                    ฝากสะสมครบ ฿{Number(tier.minDeposit || 0).toLocaleString()} ปลดล็อกรับโบนัส ฿{Number(tier.rewardAmount || 0).toLocaleString()}
                                                    {Number(tier.rewardTurnover || 0) > 0 ? ` ติดเทิร์น ${Number(tier.rewardTurnover || 0).toLocaleString()}` : " ไม่มีเทิร์น"}
                                                </p>
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
                                        <label className="mb-1 block text-sm font-medium text-slate-700">รหัส Rank</label>
                                        <input
                                            value={tier.id}
                                            onChange={(event) => updateTier(index, "id", event.target.value)}
                                            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Icon สำรอง</label>
                                        <input
                                            value={tier.icon}
                                            onChange={(event) => updateTier(index, "icon", event.target.value)}
                                            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                                            placeholder="ใช้เมื่อไม่มีโลโก้"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">ยอดฝากสะสมขั้นต่ำ</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={tier.minDeposit}
                                            onChange={(event) => updateTier(index, "minDeposit", Number(event.target.value) || 0)}
                                            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">เงินรางวัลปลดล็อก</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={tier.rewardAmount}
                                            onChange={(event) => updateTier(index, "rewardAmount", Number(event.target.value) || 0)}
                                            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">ยอดเทิร์นของรางวัล</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={tier.rewardTurnover}
                                            onChange={(event) => updateTier(index, "rewardTurnover", Number(event.target.value) || 0)}
                                            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900"
                                        />
                                    </div>

                                    <div className="xl:col-span-3">
                                        <label className="mb-2 block text-sm font-medium text-slate-700">โลโก้ Rank</label>
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                                                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                                    {tier.logo ? (
                                                        <img src={tier.logo} alt={tier.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1 text-slate-400">
                                                            <ImageIcon size={24} />
                                                            <span className="text-xs">No logo</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-3">
                                                    <input
                                                        value={tier.logo}
                                                        onChange={(event) => updateTier(index, "logo", event.target.value)}
                                                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900"
                                                        placeholder="วาง URL โลโก้ หรือใช้อัปโหลดด้านล่าง"
                                                    />
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${uploadingIndex === index ? "border-yellow-300 bg-yellow-50 text-yellow-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"}`}>
                                                            {uploadingIndex === index ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                                            {uploadingIndex === index ? "กำลังอัปโหลด..." : "อัปโหลดโลโก้"}
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                disabled={uploadingIndex === index}
                                                                onChange={(event) => void handleLogoUpload(index, event)}
                                                            />
                                                        </label>
                                                        {tier.logo ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => updateTier(index, "logo", "")}
                                                                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                                                            >
                                                                <X size={16} />
                                                                ลบโลโก้
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
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
                        disabled={saving || loading || uploadingIndex !== null}
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

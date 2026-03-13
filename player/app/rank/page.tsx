"use client";

import { useEffect, useState } from "react";
import PlayerLayout from "@/components/PlayerLayout";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/Toast";
import { Award, Crown, Gift, Lock, Sparkles } from "lucide-react";

type RankTierStatus = {
    id: string;
    name: string;
    logo?: string;
    icon?: string;
    minDeposit: number;
    rewardAmount: number;
    rewardTurnover: number;
    colorFrom: string;
    colorTo: string;
    unlocked: boolean;
    claimable: boolean;
    claimedAt: string | null;
    alreadyClaimed: boolean;
    remainingDeposit: number;
};

type RankStatus = {
    totalDeposit: number;
    currentTierId: string | null;
    currentTierName: string | null;
    tiers: RankTierStatus[];
};

export default function RankPage() {
    const { user, loading: authLoading } = useAuth(true);
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [claimingTierId, setClaimingTierId] = useState<string | null>(null);
    const [rankStatus, setRankStatus] = useState<RankStatus | null>(null);

    const fetchRankStatus = async () => {
        const res = await api.get("/users/rank-rewards");
        if (res.data.success) {
            setRankStatus(res.data.data);
        }
    };

    useEffect(() => {
        const load = async () => {
            try {
                await fetchRankStatus();
            } catch (error: any) {
                console.error("Fetch rank status error:", error);
                toast.error("โหลด Rank ไม่สำเร็จ", error.response?.data?.message || "กรุณาลองใหม่อีกครั้ง");
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, []);

    if (authLoading || loading) {
        return (
            <PlayerLayout>
                <div className="p-10 text-center text-white/70">กำลังโหลด...</div>
            </PlayerLayout>
        );
    }

    if (!user || !rankStatus) {
        return null;
    }

    const currentTier = rankStatus.tiers.find((tier) => tier.id === rankStatus.currentTierId)
        || rankStatus.tiers.find((tier) => tier.unlocked)
        || rankStatus.tiers[0];
    const nextTier = rankStatus.tiers.find((tier) => !tier.unlocked) || null;
    const currentFloor = currentTier ? Number(currentTier.minDeposit || 0) : 0;
    const targetDeposit = nextTier ? Number(nextTier.minDeposit || 0) : currentFloor;
    const totalDeposit = Number(rankStatus.totalDeposit || 0);
    const progress = nextTier
        ? Math.max(0, Math.min(100, ((totalDeposit - currentFloor) / Math.max(1, targetDeposit - currentFloor)) * 100))
        : 100;
    const claimableCount = rankStatus.tiers.filter((tier) => tier.claimable).length;

    const handleClaim = async (tierId: string) => {
        try {
            setClaimingTierId(tierId);
            const res = await api.post(`/users/rank-rewards/${tierId}/claim`);
            toast.success("รับโบนัส Rank สำเร็จ", res.data?.message || "ระบบเติมโบนัสเข้ากระเป๋าโบนัสให้แล้ว");
            await fetchRankStatus();
        } catch (error: any) {
            console.error("Claim rank reward error:", error);
            toast.error("รับโบนัส Rank ไม่สำเร็จ", error.response?.data?.message || "กรุณาลองใหม่อีกครั้ง");
        } finally {
            setClaimingTierId(null);
        }
    };

    return (
        <PlayerLayout>
            <div className="space-y-5">
                <div className="overflow-hidden rounded-[28px] border border-[#f0c55d]/30 bg-[radial-gradient(circle_at_top_left,_rgba(255,213,79,0.32),_transparent_45%),linear-gradient(135deg,#141b28_0%,#101623_100%)] p-6 shadow-[0_20px_60px_rgba(5,9,18,0.35)]">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#ffd86b]">
                                <Crown size={14} />
                                Rank Club
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white">พิชิต Rank รับโบนัสปลดล็อก</h1>
                                <p className="mt-2 max-w-2xl text-sm text-white/65">
                                    ยิ่งฝากสะสมมาก ยิ่งปลดล็อกรางวัล Rank ได้มากขึ้น โบนัสจะเข้ากระเป๋าโบนัสและติดเทิร์นตามที่แต่ละ Rank กำหนด
                                </p>
                            </div>
                        </div>
                        <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                            <p className="text-xs uppercase tracking-[0.18em] text-white/40">โบนัสรอรับ</p>
                            <p className="mt-1 text-2xl font-black text-[#ffd86b]">{claimableCount}</p>
                            <p className="text-xs text-white/50">Rank</p>
                        </div>
                    </div>
                </div>

                {currentTier ? (
                    <div
                        className="overflow-hidden rounded-[28px] p-[1px] shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
                        style={{ background: `linear-gradient(135deg, ${currentTier.colorFrom}, ${currentTier.colorTo})` }}
                    >
                        <div className="rounded-[27px] bg-[#101622]/90 p-6 backdrop-blur">
                            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-4">
                                    <div
                                        className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-white/10"
                                        style={{ background: `linear-gradient(135deg, ${currentTier.colorFrom}, ${currentTier.colorTo})` }}
                                    >
                                        {currentTier.logo ? (
                                            <img src={currentTier.logo} alt={currentTier.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="text-3xl font-black text-white">{currentTier.icon || "R"}</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Rank ปัจจุบัน</p>
                                        <h2 className="mt-1 text-3xl font-black text-white">{currentTier.name}</h2>
                                        <p className="mt-1 text-sm text-white/65">ยอดฝากสะสมของคุณ ฿{totalDeposit.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                        <p className="text-xs uppercase tracking-[0.18em] text-white/40">รางวัล Rank นี้</p>
                                        <p className="mt-2 text-xl font-black text-[#ffd86b]">฿{Number(currentTier.rewardAmount || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                        <p className="text-xs uppercase tracking-[0.18em] text-white/40">เทิร์นของรางวัล</p>
                                        <p className="mt-2 text-xl font-black text-white">{Number(currentTier.rewardTurnover || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                                <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                                    <p className="text-white/65">
                                        {nextTier
                                            ? <>กำลังไป Rank ถัดไป <span className="font-bold text-white">{nextTier.name}</span></>
                                            : <>คุณอยู่ Rank สูงสุดแล้ว</>}
                                    </p>
                                    <p className="font-bold text-[#ffd86b]">{progress.toFixed(0)}%</p>
                                </div>
                                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                                    <div
                                        className="h-full rounded-full bg-[linear-gradient(90deg,#ffd86b_0%,#ffb347_100%)] transition-all"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                {nextTier ? (
                                    <p className="mt-3 text-center text-sm text-white/55">
                                        ฝากสะสมอีก <span className="font-bold text-white">฿{Math.max(0, nextTier.minDeposit - totalDeposit).toLocaleString()}</span> เพื่อปลดล็อก {nextTier.name}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="rounded-[28px] border border-white/10 bg-[#101622]/85 p-5 shadow-[0_18px_50px_rgba(5,9,18,0.28)]">
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="flex items-center gap-2 text-lg font-black text-white">
                                <Gift size={20} className="text-[#ffd86b]" />
                                รางวัล Rank ทั้งหมด
                            </h3>
                            <p className="mt-1 text-sm text-white/55">ปลดล็อกตามยอดฝากสะสม และกดรับโบนัสได้ครั้งเดียวต่อ Rank</p>
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/60">
                            ฝากสะสมทั้งหมด ฿{totalDeposit.toLocaleString()}
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {rankStatus.tiers.map((tier) => {
                            const isClaiming = claimingTierId === tier.id;
                            const statusLabel = tier.alreadyClaimed
                                ? "รับแล้ว"
                                : tier.claimable
                                    ? "กดรับได้"
                                    : tier.unlocked
                                        ? "ปลดล็อกแล้ว"
                                        : "ยังไม่ปลดล็อก";

                            return (
                                <div
                                    key={tier.id}
                                    className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]"
                                >
                                    <div
                                        className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
                                        style={{ background: `linear-gradient(135deg, ${tier.colorFrom}22, ${tier.colorTo}22)` }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                                                {tier.logo ? (
                                                    <img src={tier.logo} alt={tier.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <span className="text-2xl font-black text-white">{tier.icon || "R"}</span>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className="text-xl font-black text-white">{tier.name}</h4>
                                                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                                                        tier.alreadyClaimed
                                                            ? "bg-emerald-500/15 text-emerald-300"
                                                            : tier.claimable
                                                                ? "bg-yellow-500/15 text-yellow-300"
                                                                : tier.unlocked
                                                                    ? "bg-blue-500/15 text-blue-300"
                                                                    : "bg-white/10 text-white/55"
                                                    }`}>
                                                        {statusLabel}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-sm text-white/60">
                                                    ปลดล็อกเมื่อฝากสะสมครบ ฿{Number(tier.minDeposit || 0).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-3">
                                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                                <p className="text-xs uppercase tracking-[0.14em] text-white/40">โบนัส</p>
                                                <p className="mt-1 text-lg font-black text-[#ffd86b]">฿{Number(tier.rewardAmount || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                                <p className="text-xs uppercase tracking-[0.14em] text-white/40">เทิร์น</p>
                                                <p className="mt-1 text-lg font-black text-white">{Number(tier.rewardTurnover || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                                <p className="text-xs uppercase tracking-[0.14em] text-white/40">สถานะ</p>
                                                <p className="mt-1 text-sm font-bold text-white">
                                                    {tier.unlocked ? "ปลดล็อกแล้ว" : `เหลือ ฿${Number(tier.remainingDeposit || 0).toLocaleString()}`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 md:flex-row md:items-center md:justify-between">
                                        <div className="flex items-center gap-2 text-sm text-white/55">
                                            {tier.alreadyClaimed ? <Sparkles size={16} className="text-emerald-300" /> : <Lock size={16} className="text-white/40" />}
                                            {tier.alreadyClaimed
                                                ? `รับรางวัลแล้วเมื่อ ${new Date(tier.claimedAt as string).toLocaleString("th-TH")}`
                                                : tier.claimable
                                                    ? "กดรับโบนัสเข้ากระเป๋าโบนัสได้ทันที"
                                                    : tier.unlocked
                                                        ? "Rank นี้ปลดล็อกแล้ว แต่ไม่มีโบนัสให้กดรับ"
                                                        : "สะสมยอดฝากให้ถึงก่อนจึงจะกดรับได้"}
                                        </div>

                                        <button
                                            type="button"
                                            disabled={!tier.claimable || isClaiming}
                                            onClick={() => void handleClaim(tier.id)}
                                            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition ${
                                                tier.claimable && !isClaiming
                                                    ? "bg-[linear-gradient(135deg,#ffd86b_0%,#ffb347_100%)] text-[#111827] shadow-[0_14px_30px_rgba(255,184,71,0.28)] hover:translate-y-[-1px]"
                                                    : "cursor-not-allowed bg-white/5 text-white/35"
                                            }`}
                                        >
                                            {isClaiming ? <Award size={16} className="animate-pulse" /> : <Gift size={16} />}
                                            {tier.alreadyClaimed ? "รับแล้ว" : tier.claimable ? "กดรับโบนัส" : "ยังรับไม่ได้"}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </PlayerLayout>
    );
}

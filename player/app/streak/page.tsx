"use client";

import { useEffect, useMemo, useState } from "react";
import PlayerLayout from "@/components/PlayerLayout";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/Toast";
import { CalendarDays, Flame, Gift, ShieldCheck, Sparkles } from "lucide-react";

type StreakLevel = {
    day: number;
    minDeposit: number;
    bonusAmount: number;
    requiresTurnover: boolean;
    turnoverMultiplier: number;
    isActive: boolean;
    claimed: boolean;
    isCurrentTarget: boolean;
};

type StreakStatus = {
    currentStreak: number;
    maxDay: number;
    todayDeposit: number;
    minDeposit: number;
    nextDay: number | null;
    nextDayMinDeposit: number | null;
    levels: StreakLevel[];
};

export default function StreakPage() {
    const { user, loading: authLoading } = useAuth(true);
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<StreakStatus | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get("/users/streak-stats");
                if (res.data.success) {
                    setStatus(res.data.data);
                }
            } catch (error: any) {
                console.error("Fetch streak status error:", error);
                toast.error("โหลดภารกิจฝากต่อเนื่องไม่สำเร็จ", error.response?.data?.message || "กรุณาลองใหม่อีกครั้ง");
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading) {
            void load();
        }
    }, [authLoading, toast]);

    const progressPercent = useMemo(() => {
        if (!status || !status.maxDay) return 0;
        return Math.max(0, Math.min(100, (status.currentStreak / status.maxDay) * 100));
    }, [status]);

    if (authLoading || loading) {
        return (
            <PlayerLayout>
                <div className="p-10 text-center text-white/70">กำลังโหลด...</div>
            </PlayerLayout>
        );
    }

    if (!user || !status) {
        return null;
    }

    return (
        <PlayerLayout>
            <div className="space-y-5">
                <div className="overflow-hidden rounded-[28px] border border-orange-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.28),_transparent_45%),linear-gradient(135deg,#141b28_0%,#101623_100%)] p-6 shadow-[0_20px_60px_rgba(5,9,18,0.35)]">
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-orange-300">
                                <CalendarDays size={14} />
                                Daily Streak
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white">ฝากต่อเนื่อง 30 วัน</h1>
                                <p className="mt-2 max-w-2xl text-sm text-white/65">
                                    ฝากให้ถึงขั้นต่ำของแต่ละวันต่อเนื่องกันเพื่อปลดล็อกโบนัสตั้งแต่วันที่ 1 ถึงวันที่ 30
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                                <p className="text-xs uppercase tracking-[0.16em] text-white/40">สตรีคปัจจุบัน</p>
                                <p className="mt-1 text-3xl font-black text-orange-300">{status.currentStreak}</p>
                                <p className="text-xs text-white/45">จาก {status.maxDay} วัน</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                                <p className="text-xs uppercase tracking-[0.16em] text-white/40">ฝากวันนี้</p>
                                <p className="mt-1 text-3xl font-black text-emerald-300">฿{status.todayDeposit.toLocaleString()}</p>
                                <p className="text-xs text-white/45">
                                    {status.nextDay && status.nextDayMinDeposit
                                        ? `เป้าหมายวันที่ ${status.nextDay} ขั้นต่ำ ฿${status.nextDayMinDeposit.toLocaleString()}`
                                        : "ปลดล็อกครบทุกวันแล้ว"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                            <p className="text-white/65">
                                {status.nextDay
                                    ? <>เหลืออีก <span className="font-bold text-white">{status.maxDay - status.currentStreak}</span> วัน เพื่อเก็บครบ 30 วัน</>
                                    : <>คุณสะสมครบทุกวันของภารกิจนี้แล้ว</>}
                            </p>
                            <p className="font-bold text-orange-300">{progressPercent.toFixed(0)}%</p>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-white/10">
                            <div
                                className="h-full rounded-full bg-[linear-gradient(90deg,#fb923c_0%,#facc15_100%)] transition-all"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-[#101622]/85 p-5 shadow-[0_18px_50px_rgba(5,9,18,0.28)]">
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="flex items-center gap-2 text-lg font-black text-white">
                                <Gift size={20} className="text-orange-300" />
                                โบนัสครบ 30 วัน
                            </h3>
                            <p className="mt-1 text-sm text-white/55">โบนัสของแต่ละวันจะเข้าอัตโนมัติเมื่อฝากวันนั้นสำเร็จและสตรีคยังไม่ขาด</p>
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/60">
                            ปัจจุบัน {status.currentStreak}/{status.maxDay} วัน
                        </div>
                    </div>

                    <div className="grid grid-cols-5 gap-3 md:grid-cols-6">
                        {status.levels.map((level) => {
                            const cardClass = level.claimed
                                ? "border-orange-300/40 bg-[linear-gradient(135deg,rgba(251,146,60,0.22),rgba(250,204,21,0.14))]"
                                : level.isCurrentTarget
                                    ? "border-emerald-300/40 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(45,212,191,0.12))]"
                                    : "border-white/10 bg-white/5";

                            return (
                                <div key={level.day} className={`rounded-2xl border p-3 text-center shadow-sm ${cardClass}`}>
                                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-black text-white">
                                        {level.day}
                                    </div>
                                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                                        วันที่ {level.day}
                                    </p>
                                    <p className="mt-2 text-lg font-black text-orange-200">฿{Number(level.bonusAmount || 0).toLocaleString()}</p>
                                    <p className="mt-1 text-[11px] text-white/45">ฝากขั้นต่ำ ฿{Number(level.minDeposit || 0).toLocaleString()}</p>
                                    <div className="mt-3 text-[11px] font-semibold">
                                        {level.claimed ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-400/15 px-2 py-1 text-orange-200">
                                                <Sparkles size={12} />
                                                รับแล้ว
                                            </span>
                                        ) : level.isCurrentTarget ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-1 text-emerald-200">
                                                <Flame size={12} />
                                                เป้าหมายถัดไป
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-white/55">
                                                รอปลดล็อก
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-[#101622]/85 p-5 shadow-[0_18px_50px_rgba(5,9,18,0.2)]">
                    <h3 className="flex items-center gap-2 text-lg font-black text-white">
                        <ShieldCheck size={18} className="text-sky-300" />
                        กติกาภารกิจ
                    </h3>
                    <ul className="mt-4 space-y-2 text-sm text-white/60">
                        <li>ระบบนับวันที่ฝากถึงขั้นต่ำตามเวลาไทย และจะนับต่อเนื่องจากวันก่อนหน้า</li>
                        <li>ถ้าวันใดฝากไม่ถึงขั้นต่ำ สตรีคจะหยุดและเริ่มนับใหม่เมื่อฝากถึงเงื่อนไขอีกครั้ง</li>
                        <li>โบนัสของวันนั้นจะเข้ากระเป๋าโบนัสอัตโนมัติหลังฝากสำเร็จ โดยไม่จ่ายซ้ำวันเดิม</li>
                        <li>บางวันอาจตั้งให้ติดเทิร์นตามที่แอดมินกำหนดไว้ในกิจกรรมนั้น</li>
                    </ul>
                </div>
            </div>
        </PlayerLayout>
    );
}

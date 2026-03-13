"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift, Link2, Share2, Users } from "lucide-react";
import api from "@/lib/api";

interface ReferralOverview {
    totalReferrals: number;
    totalReferrers: number;
    todayReferrals: number;
    last7DaysReferrals: number;
}

interface ReferrerItem {
    referrerId: number;
    referralCount: number;
    latestReferralAt: string;
    referrer: {
        username?: string;
        fullName?: string;
        phone?: string;
        referrerCode?: string;
    } | null;
}

interface RecentReferralItem {
    id: number;
    username: string;
    fullName: string;
    phone: string;
    createdAt: string;
    referrer: {
        username?: string;
        fullName?: string;
        phone?: string;
        referrerCode?: string;
    } | null;
}

const formatDateTime = (value: string) =>
    new Date(value).toLocaleString("th-TH", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

export default function ReferralAdminPage() {
    const [overview, setOverview] = useState<ReferralOverview>({
        totalReferrals: 0,
        totalReferrers: 0,
        todayReferrals: 0,
        last7DaysReferrals: 0,
    });
    const [topReferrers, setTopReferrers] = useState<ReferrerItem[]>([]);
    const [recentReferrals, setRecentReferrals] = useState<RecentReferralItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get("/admin/activities/referral/overview");
                if (res.data.success && res.data.data) {
                    setOverview(res.data.data.overview);
                    setTopReferrers(res.data.data.topReferrers || []);
                    setRecentReferrals(res.data.data.recentReferrals || []);
                }
            } catch (error) {
                console.error("Fetch referral overview error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">จัดการแนะนำเพื่อน</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        ดูภาพรวมผู้แนะนำ, จำนวนสมาชิกที่สมัครผ่านโค้ดแนะนำ และรายการสมัครล่าสุดจากระบบจริง
                    </p>
                </div>
                <Link href="/activities" className="text-sm text-blue-500 hover:underline">
                    ← กลับ
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                    { label: "สมาชิกที่สมัครผ่านโค้ดแนะนำ", value: overview.totalReferrals, icon: Users, accent: "text-sky-600", bg: "bg-sky-50" },
                    { label: "จำนวนผู้แนะนำที่มีผลงาน", value: overview.totalReferrers, icon: Share2, accent: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "สมัครวันนี้", value: overview.todayReferrals, icon: Gift, accent: "text-amber-600", bg: "bg-amber-50" },
                    { label: "สมัคร 7 วันล่าสุด", value: overview.last7DaysReferrals, icon: Link2, accent: "text-violet-600", bg: "bg-violet-50" },
                ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-slate-500">{item.label}</p>
                                <p className={`mt-3 text-3xl font-black ${item.accent}`}>{item.value.toLocaleString("th-TH")}</p>
                            </div>
                            <div className={`rounded-2xl ${item.bg} p-3`}>
                                <item.icon className={item.accent} size={22} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1.3fr]">
                <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-4">
                        <h3 className="text-lg font-semibold text-slate-800">ผู้แนะนำยอดนิยม</h3>
                        <p className="mt-1 text-sm text-slate-500">เรียงตามจำนวนสมาชิกที่ชวนเข้าระบบได้มากที่สุด</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500">
                                <tr>
                                    <th className="px-6 py-3 text-left">ผู้แนะนำ</th>
                                    <th className="px-4 py-3 text-right">จำนวนคน</th>
                                    <th className="px-6 py-3 text-left">สมัครล่าสุด</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-10 text-center text-slate-400">กำลังโหลด...</td>
                                    </tr>
                                ) : topReferrers.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-10 text-center text-slate-400">ยังไม่มีข้อมูลผู้แนะนำ</td>
                                    </tr>
                                ) : (
                                    topReferrers.map((item) => (
                                        <tr key={item.referrerId} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-slate-800">{item.referrer?.username || "-"}</p>
                                                <p className="text-xs text-slate-500">{item.referrer?.fullName || item.referrer?.phone || "-"}</p>
                                                <p className="text-xs text-slate-400">โค้ด: {item.referrer?.referrerCode || "-"}</p>
                                            </td>
                                            <td className="px-4 py-4 text-right font-bold text-emerald-600">
                                                {item.referralCount.toLocaleString("th-TH")}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">{formatDateTime(item.latestReferralAt)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-4">
                        <h3 className="text-lg font-semibold text-slate-800">สมาชิกที่สมัครผ่านโค้ดล่าสุด</h3>
                        <p className="mt-1 text-sm text-slate-500">ดูว่าใครสมัครจากผู้แนะนำคนไหนและเข้าระบบเมื่อไร</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500">
                                <tr>
                                    <th className="px-6 py-3 text-left">สมาชิกใหม่</th>
                                    <th className="px-6 py-3 text-left">ผู้แนะนำ</th>
                                    <th className="px-6 py-3 text-left">เวลา</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-10 text-center text-slate-400">กำลังโหลด...</td>
                                    </tr>
                                ) : recentReferrals.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-10 text-center text-slate-400">ยังไม่มีรายการสมัครผ่านโค้ดแนะนำ</td>
                                    </tr>
                                ) : (
                                    recentReferrals.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-slate-800">{item.username}</p>
                                                <p className="text-xs text-slate-500">{item.fullName || item.phone}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-slate-700">{item.referrer?.username || "-"}</p>
                                                <p className="text-xs text-slate-500">{item.referrer?.fullName || item.referrer?.phone || "-"}</p>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">{formatDateTime(item.createdAt)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}

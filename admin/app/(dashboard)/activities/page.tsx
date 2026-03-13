"use client";

import Link from "next/link";
import { ArrowRight, Crown, Flame, Gift, Share2, Trophy } from "lucide-react";

const activities = [
    {
        title: "ตั้งค่ายอดเสีย",
        description: "กำหนดเปอร์เซ็นต์และเงื่อนไขการคืนยอดเสีย",
        icon: Gift,
        href: "/activities/cashback",
        gradient: "from-pink-500 to-rose-500",
    },
    {
        title: "ตั้งค่าฝากต่อเนื่อง",
        description: "กำหนดโบนัสฝากต่อเนื่องรายวันได้สูงสุด 30 วัน",
        icon: Flame,
        href: "/activities/streak",
        gradient: "from-orange-500 to-red-500",
    },
    {
        title: "ตั้งค่าคอมมิชชั่น",
        description: "กำหนดค่าคอมจากยอดเทิร์นและดูผู้ที่มียอดกดรับได้",
        icon: Trophy,
        href: "/activities/commission",
        gradient: "from-yellow-500 to-amber-500",
    },
    {
        title: "จัดการแนะนำเพื่อน",
        description: "ดูภาพรวมผู้แนะนำและสมาชิกที่สมัครผ่านโค้ดแนะนำจากข้อมูลจริง",
        icon: Share2,
        href: "/activities/referral",
        gradient: "from-sky-500 to-cyan-500",
    },
    {
        title: "จัดการ Rank",
        description: "ตั้งค่า Rank และรางวัลปลดล็อกจากยอดฝากสะสมให้หน้า player ใช้ข้อมูลชุดเดียวกัน",
        icon: Crown,
        href: "/activities/ranks",
        gradient: "from-violet-500 to-fuchsia-500",
    },
];

export default function ActivitiesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">กิจกรรม</h2>
                <p className="mt-1 text-sm text-slate-500">
                    จัดการการตั้งค่ากิจกรรมและรางวัลสำหรับผู้เล่น
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {activities.map((activity) => (
                    <Link
                        key={activity.href}
                        href={activity.href}
                        className="group rounded-xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:border-yellow-200 hover:shadow-lg"
                    >
                        <div
                            className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${activity.gradient} transition-transform group-hover:scale-110`}
                        >
                            <activity.icon className="text-white" size={28} />
                        </div>
                        <h3 className="mb-2 text-lg font-bold text-slate-800">{activity.title}</h3>
                        <p className="mb-4 text-sm text-slate-500">{activity.description}</p>
                        <div className="flex items-center text-sm font-medium text-yellow-600 group-hover:text-yellow-700">
                            จัดการ
                            <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

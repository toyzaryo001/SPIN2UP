"use client";

import Link from "next/link";
import { Gift, Flame, Trophy, ArrowRight, Share2, Crown } from "lucide-react";

const activities = [
    {
        title: "ตั้งค่ายอดเสีย",
        description: "กำหนดเปอร์เซ็นต์และเงื่อนไขการคืนยอดเสีย",
        icon: Gift,
        href: "/activities/cashback",
        color: "bg-pink-500",
        gradient: "from-pink-500 to-rose-500"
    },
    {
        title: "ตั้งค่าฝากสะสม",
        description: "กำหนดโบนัสสำหรับการฝากต่อเนื่อง 7 วัน",
        icon: Flame,
        href: "/activities/streak",
        color: "bg-orange-500",
        gradient: "from-orange-500 to-red-500"
    },
    {
        title: "ตั้งค่าคอมมิชชั่น",
        description: "กำหนดค่าคอมมิชชั่น 4 ชั้นสำหรับระบบแนะนำเพื่อน",
        icon: Trophy,
        href: "/activities/commission",
        color: "bg-yellow-500",
        gradient: "from-yellow-500 to-amber-500"
    },
    {
        title: "จัดการแนะนำเพื่อน",
        description: "ดูภาพรวมผู้แนะนำและสมาชิกที่สมัครผ่านโค้ดแนะนำจากข้อมูลจริง",
        icon: Share2,
        href: "/activities/referral",
        color: "bg-sky-500",
        gradient: "from-sky-500 to-cyan-500"
    },
    {
        title: "จัดการ Rank",
        description: "ตั้งค่า VIP/Rank tiers เพื่อให้หน้า player ใช้ข้อมูลชุดเดียวกับหลังบ้าน",
        icon: Crown,
        href: "/activities/ranks",
        color: "bg-violet-500",
        gradient: "from-violet-500 to-fuchsia-500"
    },
];

export default function ActivitiesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">กิจกรรม</h2>
                <p className="text-slate-500 text-sm mt-1">
                    จัดการตั้งค่ากิจกรรมต่างๆ สำหรับผู้เล่น
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activities.map((activity) => (
                    <Link
                        key={activity.href}
                        href={activity.href}
                        className="group bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-lg transition-all hover:border-yellow-200"
                    >
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${activity.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                            <activity.icon className="text-white" size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">
                            {activity.title}
                        </h3>
                        <p className="text-slate-500 text-sm mb-4">
                            {activity.description}
                        </p>
                        <div className="flex items-center text-yellow-600 font-medium text-sm group-hover:text-yellow-700">
                            จัดการ <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

"use client";

import { useRouter, usePathname } from "next/navigation";
import { Home, Wallet, Gamepad2, Gift, User } from "lucide-react";

export default function BottomNav({ features }: { features?: any }) {
    const router = useRouter();
    const pathname = usePathname();

    const isHome = pathname === "/";
    const isDeposit = pathname === "/deposit" || pathname === "/withdraw";
    const isGames = pathname === "/games";
    const isActivity = pathname === "/activity" || pathname === "/promotions" || pathname === "/commission" || pathname === "/rank" || pathname === "/streak" || pathname === "/cashback";
    const isProfile = pathname === "/profile";

    // Dynamic Navigation Items
    const items = [
        { key: 'home', label: 'หน้าหลัก', icon: Home, active: isHome, href: '/', visible: true },
        { key: 'deposit', label: 'ฝากถอน', icon: Wallet, active: isDeposit, href: '/deposit', visible: features?.deposit !== false || features?.withdraw !== false },
        { key: 'games', label: 'เล่นเกม', icon: Gamepad2, active: isGames, href: '/games', visible: features?.games !== false, center: true },
        { key: 'activity', label: 'กิจกรรม', icon: Gift, active: isActivity, href: '/activity', visible: features?.promotions !== false || features?.referral !== false || features?.cashback !== false || features?.streak !== false },
        { key: 'profile', label: 'โปรไฟล์', icon: User, active: isProfile, href: '/profile', visible: true },
    ].filter(item => item.visible);

    const gridCols = items.length === 5 ? 'grid-cols-5' :
        items.length === 4 ? 'grid-cols-4' :
            items.length === 3 ? 'grid-cols-3' : 'grid-cols-2';

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f172a]/95 backdrop-blur-md border-t border-slate-800 px-2 py-1 z-50 pb-safe">
            <div className={`grid ${gridCols} gap-1 items-end h-[60px]`}>
                {items.map((item) => {
                    if (item.center) {
                        return (
                            <div key={item.key} className="relative flex justify-center h-full items-center">
                                <button
                                    onClick={() => router.push(item.href)}
                                    className={`absolute -top-5 w-14 h-14 rounded-full border-4 border-[#0b1120] flex flex-col items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.5)] transform active:scale-95 transition-transform hover:scale-105 hover:-translate-y-1 ${item.active ? 'bg-gradient-to-r from-yellow-300 to-yellow-500 text-black' : 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black'}`}
                                >
                                    <item.icon size={24} className={item.active ? '' : 'animate-pulse'} />
                                    <span className="text-[8px] font-black mt-0.5">{item.label}</span>
                                </button>
                            </div>
                        );
                    }
                    return (
                        <button
                            key={item.key}
                            onClick={() => router.push(item.href)}
                            className={`flex flex-col items-center justify-center h-full rounded-lg transition-colors ${item.active ? 'text-yellow-400' : 'text-slate-500 hover:text-white'}`}
                        >
                            <item.icon size={20} className={item.active ? 'fill-current' : ''} />
                            <span className="text-[10px] mt-1 font-medium font-sans">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

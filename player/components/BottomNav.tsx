"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Wallet, Gamepad2, Gift, User, Loader2 } from "lucide-react";

export default function BottomNav() {
    const router = useRouter();
    const pathname = usePathname();
    const [loadingGame, setLoadingGame] = useState(false);

    const isHome = pathname === "/";
    const isDeposit = pathname === "/deposit" || pathname === "/withdraw";
    const isActivity = pathname === "/activity" || pathname === "/promotions" || pathname === "/commission" || pathname === "/rank" || pathname === "/streak" || pathname === "/cashback";
    const isProfile = pathname === "/profile";

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f172a]/95 backdrop-blur-md border-t border-slate-800 px-2 py-1 z-50 pb-safe">
            <div className="grid grid-cols-5 gap-1 items-end h-[60px]">

                {/* 1. Home */}
                <button
                    onClick={() => router.push("/")}
                    className={`flex flex-col items-center justify-center h-full rounded-lg transition-colors ${isHome ? 'text-yellow-400' : 'text-slate-500 hover:text-white'}`}
                >
                    <Home size={20} className={isHome ? 'fill-current' : ''} />
                    <span className="text-[10px] mt-1 font-medium font-sans">หน้าหลัก</span>
                </button>

                {/* 2. Deposit/Withdraw */}
                <button
                    onClick={() => router.push("/deposit")}
                    className={`flex flex-col items-center justify-center h-full rounded-lg transition-colors ${isDeposit ? 'text-yellow-400' : 'text-slate-500 hover:text-white'}`}
                >
                    <Wallet size={20} className={isDeposit ? 'fill-current' : ''} />
                    <span className="text-[10px] mt-1 font-medium font-sans">ฝากถอน</span>
                </button>

                {/* 3. Play Game (Center Prominent) */}
                <div className="relative flex justify-center h-full items-center">
                    <button
                        onClick={() => {
                            setLoadingGame(true);
                            // Simulate loading then redirect to action=play
                            setTimeout(() => {
                                const currentUrl = new URL(window.location.href);
                                currentUrl.searchParams.set('action', 'play');
                                router.push(currentUrl.toString());
                                setLoadingGame(false);
                            }, 300);
                        }}
                        disabled={loadingGame}
                        className="absolute -top-5 w-14 h-14 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 border-4 border-[#0b1120] flex flex-col items-center justify-center text-black shadow-[0_0_15px_rgba(250,204,21,0.5)] transform active:scale-95 transition-transform hover:scale-105 hover:-translate-y-1 disabled:opacity-80 disabled:cursor-not-allowed"
                    >
                        {loadingGame ? (
                            <Loader2 size={24} className="animate-spin text-black" />
                        ) : (
                            <Gamepad2 size={24} className="animate-pulse" />
                        )}
                        <span className="text-[8px] font-black mt-0.5">{loadingGame ? 'รอสักครู่' : 'เล่นเกม'}</span>
                    </button>
                </div>

                {/* 4. Activities */}
                <button
                    onClick={() => router.push("/activity")}
                    className={`flex flex-col items-center justify-center h-full rounded-lg transition-colors ${isActivity ? 'text-yellow-400' : 'text-slate-500 hover:text-white'}`}
                >
                    <Gift size={20} className={isActivity ? 'fill-current' : ''} />
                    <span className="text-[10px] mt-1 font-medium font-sans">กิจกรรม</span>
                </button>

                {/* 5. Profile */}
                <button
                    onClick={() => router.push("/profile")}
                    className={`flex flex-col items-center justify-center h-full rounded-lg transition-colors ${isProfile ? 'text-yellow-400' : 'text-slate-500 hover:text-white'}`}
                >
                    <User size={20} className={isProfile ? 'fill-current' : ''} />
                    <span className="text-[10px] mt-1 font-medium font-sans">โปรไฟล์</span>
                </button>

            </div>
        </div>
    );
}

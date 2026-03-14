"use client";

import { Gamepad2 } from "lucide-react";

interface MobileProviderStripProps {
    items: any[];
    active: string;
    onSelect: (providerName: string) => void;
}

export default function MobileProviderStrip({ items, active, onSelect }: MobileProviderStripProps) {
    return (
        <div className="-mx-4 overflow-x-auto px-4 pb-3">
            <div className="flex min-w-max gap-3">
                {items.length > 0 ? items.map((item: any) => {
                    const name = typeof item === "object" ? item.name : item;
                    const logo = typeof item === "object" ? item.logo : null;
                    const isLobby = typeof item === "object" && item.isLobbyMode;
                    const isActive = active === name;

                    return (
                        <button
                            key={name}
                            type="button"
                            onClick={() => onSelect(name)}
                            aria-label={name}
                            title={name}
                            className={`relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border transition-all duration-200 ${
                                isActive
                                    ? "scale-[1.02] border-blue-300 bg-slate-800 shadow-[0_0_20px_rgba(59,130,246,0.25)] ring-2 ring-blue-400"
                                    : "border-slate-700 bg-slate-800/80 text-slate-300 hover:border-blue-500/50"
                            }`}
                        >
                            {logo ? (
                                <img src={logo} alt={name} className="h-12 w-12 object-contain" />
                            ) : (
                                <Gamepad2 size={28} className={isActive ? "text-blue-200" : "text-slate-500"} />
                            )}
                            {isLobby ? (
                                <span className="absolute right-1.5 top-1.5 rounded-full bg-yellow-400 px-1.5 py-0.5 text-[9px] font-black text-slate-900">
                                    L
                                </span>
                            ) : null}
                        </button>
                    );
                }) : (
                    <div className="py-2 text-sm text-slate-500">ไม่มีค่ายเกม</div>
                )}
            </div>
        </div>
    );
}

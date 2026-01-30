"use client";

import { useRouter, usePathname } from "next/navigation";

const navItems = [
    { label: "หน้าหลัก", path: "/", icon: "🏠" },
    { label: "โปรโมชั่น", path: "/promotions", icon: "🎁" },
    { label: "ฝาก/ถอน", path: "/deposit", icon: "💳" },
    { label: "กิจกรรม", path: "/activity", icon: "🏆" },
    { label: "โปรไฟล์", path: "/profile", icon: "👤" },
];

export default function BottomNav() {
    const router = useRouter();
    const pathname = usePathname();

    return (
        <div className="md:hidden">
            <nav style={{
                position: "fixed", bottom: 0, left: 0, right: 0,
                background: "#161B22", display: "flex", justifyContent: "space-around", alignItems: "center",
                height: "52px", boxShadow: "0 -2px 12px rgba(0,0,0,0.3)", zIndex: 100,
                borderTop: "1px solid rgba(255, 255, 255, 0.1)"
            }}>
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <button
                            key={item.label}
                            onClick={() => router.push(item.path)}
                            style={{
                                display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
                                background: "transparent", border: "none", cursor: "pointer",
                                color: isActive ? "#FFD700" : "#8B949E", padding: "4px 8px"
                            }}
                        >
                            <span style={{ fontSize: "18px" }}>{item.icon}</span>
                            <span style={{ fontSize: "9px", fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}

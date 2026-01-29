"use client";

import { useState } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import ContactDrawer from "@/components/ContactDrawer";

interface PlayerLayoutProps {
    children: React.ReactNode;
}

export default function PlayerLayout({ children }: PlayerLayoutProps) {
    const [showContact, setShowContact] = useState(false);

    return (
        <div style={{
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            background: "linear-gradient(180deg, #0D1117 0%, #161B22 50%, #1A1F26 100%)",
            fontFamily: "'Kanit', sans-serif",
            overflow: "hidden",
            color: "#FFFFFF"
        }}>
            <Header />

            <main style={{
                flex: 1,
                overflowY: "auto",
                scrollbarWidth: "none"
            }} className="w-full">
                <div className="w-full mx-auto pb-20">
                    {children}
                </div>
            </main>

            <BottomNav />

            {/* Global Contact Button */}
            <button
                onClick={() => setShowContact(true)}
                style={{
                    position: "fixed",
                    bottom: "80px",
                    right: "16px",
                    width: "56px",
                    height: "56px",
                    borderRadius: "14px",
                    background: "#21262D",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "2px",
                    zIndex: 90
                }}
            >
                <span style={{ fontSize: "24px" }}>💬</span>
                <span style={{ fontSize: "9px", fontWeight: 600, color: "#8B949E" }}>ติดต่อ</span>
            </button>

            {/* Contact Drawer */}
            <ContactDrawer isOpen={showContact} onClose={() => setShowContact(false)} />
        </div>
    );
}

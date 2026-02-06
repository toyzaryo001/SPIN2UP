"use client";

import { useState, useEffect } from "react";
import { X, ExternalLink } from "lucide-react";

const CHANNEL_ICONS: Record<string, { icon: string; color: string; label: string }> = {
    LINE: { icon: "💬", color: "#06C755", label: "LINE" },
    TELEGRAM: { icon: "✈️", color: "#0088CC", label: "Telegram" },
    FACEBOOK: { icon: "📘", color: "#1877F2", label: "Facebook" },
    INSTAGRAM: { icon: "📷", color: "#E4405F", label: "Instagram" },
    TIKTOK: { icon: "🎵", color: "#000000", label: "TikTok" },
    TWITTER: { icon: "🐦", color: "#1DA1F2", label: "X" },
    WHATSAPP: { icon: "📱", color: "#25D366", label: "WhatsApp" },
    EMAIL: { icon: "📧", color: "#EA4335", label: "Email" },
};

interface ContactChannel {
    id: number;
    type: string;
    name: string;
    url: string;
    icon?: string;
}

interface ContactDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ContactDrawer({ isOpen, onClose }: ContactDrawerProps) {
    const [contacts, setContacts] = useState<ContactChannel[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchContacts();
        }
    }, [isOpen]);

    const fetchContacts = async () => {
        try {
            const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + "/api";
            const res = await fetch(`${API_URL}/public/contacts`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setContacts(data);
            }
        } catch (error) {
            console.error("Fetch contacts error:", error);
        } finally {
            setLoading(false);
        }
    };

    const getChannelInfo = (type: string) => {
        return CHANNEL_ICONS[type] || { icon: "💬", color: "#666", label: type };
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,0.5)",
                    zIndex: 100,
                    transition: "opacity 0.3s",
                }}
            />

            {/* Drawer */}
            <div
                style={{
                    position: "fixed",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "white",
                    borderRadius: "24px 24px 0 0",
                    zIndex: 101,
                    maxHeight: "70vh",
                    animation: "slideUp 0.3s ease-out",
                    boxShadow: "0 -10px 40px rgba(0,0,0,0.15)",
                }}
            >
                {/* Handle */}
                <div style={{ display: "flex", justifyContent: "center", padding: "12px" }}>
                    <div
                        style={{
                            width: "40px",
                            height: "4px",
                            background: "#ddd",
                            borderRadius: "2px",
                        }}
                    />
                </div>

                {/* Header */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0 20px 16px",
                        borderBottom: "1px solid #f0f0f0",
                    }}
                >
                    <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#333" }}>
                        📞 ช่องทางติดต่อ
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: "#f0f0f0",
                            border: "none",
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                        }}
                    >
                        <X size={18} color="#666" />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: "20px", overflowY: "auto", maxHeight: "calc(70vh - 100px)" }}>
                    {loading ? (
                        <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
                            กำลังโหลด...
                        </div>
                    ) : contacts.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
                            <span style={{ fontSize: "48px" }}>📭</span>
                            <p style={{ marginTop: "16px" }}>ยังไม่มีช่องทางติดต่อ</p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {contacts.map((contact) => {
                                const info = getChannelInfo(contact.type);
                                return (
                                    <a
                                        key={contact.id}
                                        href={contact.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "14px",
                                            padding: "16px",
                                            background: "#f8f9fa",
                                            borderRadius: "14px",
                                            textDecoration: "none",
                                            transition: "all 0.2s",
                                            border: "1px solid #eee",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "48px",
                                                height: "48px",
                                                borderRadius: "12px",
                                                background: `${info.color}20`,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "24px",
                                            }}
                                        >
                                            {contact.icon || info.icon}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontWeight: 700, color: "#333", fontSize: "15px" }}>
                                                {contact.name}
                                            </p>
                                            <p
                                                style={{
                                                    fontSize: "12px",
                                                    color: info.color,
                                                    fontWeight: 600,
                                                    marginTop: "2px",
                                                }}
                                            >
                                                {info.label}
                                            </p>
                                        </div>
                                        <ExternalLink size={18} color="#aaa" />
                                    </a>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Animation keyframes */}
                <style jsx>{`
                    @keyframes slideUp {
                        from {
                            transform: translateY(100%);
                        }
                        to {
                            transform: translateY(0);
                        }
                    }
                `}</style>
            </div>
        </>
    );
}

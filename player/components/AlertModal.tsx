"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, XCircle, X } from "lucide-react";

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message: string;
    type?: "success" | "error" | "warning";
}

export default function AlertModal({ isOpen, onClose, title, message, type = "error" }: AlertModalProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
        } else {
            const timer = setTimeout(() => setVisible(false), 300); // Wait for animation
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!visible && !isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case "success": return <CheckCircle size={48} className="text-emerald-500" />;
            case "warning": return <AlertCircle size={48} className="text-amber-500" />;
            case "error": default: return <XCircle size={48} className="text-red-500" />;
        }
    };

    const getTitle = () => {
        if (title) return title;
        switch (type) {
            case "success": return "ทำรายการสำเร็จ";
            case "warning": return "แจ้งเตือน";
            case "error": default: return "เกิดข้อผิดพลาด";
        }
    };

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className={`
                    relative w-full max-w-sm bg-[#1e2329] rounded-2xl p-6 text-center 
                    border border-[#353a40] shadow-[0_8px_30px_rgb(0,0,0,0.5)]
                    transform transition-all duration-300
                    ${isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}
                `}
            >
                <div className="absolute top-4 right-4">
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex justify-center mb-4">
                    <div className="p-3 bg-[#2a2f35] rounded-full shadow-inner">
                        {getIcon()}
                    </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">
                    {getTitle()}
                </h3>

                <p className="text-base text-gray-400 mb-6 leading-relaxed">
                    {message}
                </p>

                <button
                    onClick={onClose}
                    className="w-full py-3 px-4 bg-gradient-to-r from-[#FFD700] to-[#FFC000] 
                             hover:from-[#E6C200] hover:to-[#E6AD00]
                             text-black font-bold rounded-xl shadow-[0_4px_12px_rgba(255,215,0,0.2)]
                             active:scale-[0.98] transition-all"
                >
                    ตกลง
                </button>
            </div>
        </div>
    );
}

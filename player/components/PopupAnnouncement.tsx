'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { API_URL } from '@/lib/api';

interface Announcement {
    id: number;
    type: string;
    title?: string;
    content: string;
    image?: string;
    isActive: boolean;
}

export default function PopupAnnouncement() {
    const [popup, setPopup] = useState<Announcement | null>(null);
    const [isOpen, setIsOpen] = useState(false);


    useEffect(() => {
        const fetchPopups = async () => {
            try {
                const res = await fetch(`${API_URL}/public/announcements`);
                const data = await res.json();

                // Find active popup type announcement
                const popupAnn = data.find((ann: Announcement) =>
                    ann.type === 'POPUP' && ann.isActive
                );

                if (popupAnn) {
                    // Check if user already dismissed this popup in this session
                    const dismissedPopups = sessionStorage.getItem('dismissedPopups');
                    const dismissed = dismissedPopups ? JSON.parse(dismissedPopups) : [];

                    if (!dismissed.includes(popupAnn.id)) {
                        setPopup(popupAnn);
                        setIsOpen(true);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch popups:', error);
            }
        };

        fetchPopups();
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        if (popup) {
            // Save to session storage so it doesn't show again this session
            const dismissedPopups = sessionStorage.getItem('dismissedPopups');
            const dismissed = dismissedPopups ? JSON.parse(dismissedPopups) : [];
            dismissed.push(popup.id);
            sessionStorage.setItem('dismissedPopups', JSON.stringify(dismissed));
        }
    };

    if (!isOpen || !popup) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="relative max-w-md w-full mx-4 animate-in zoom-in-95 duration-300">
                {/* Close button */}
                <button
                    onClick={handleClose}
                    className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                >
                    <X size={18} />
                </button>

                {/* Popup content */}
                <div className="rounded-2xl overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900 border border-white/10 shadow-2xl">
                    {/* Image */}
                    {popup.image && (
                        <div className="w-full">
                            <img
                                src={popup.image}
                                alt={popup.title || 'Popup'}
                                className="w-full h-auto object-cover"
                            />
                        </div>
                    )}

                    {/* Text content */}
                    <div className="p-4">
                        {popup.title && (
                            <h3 className="text-lg font-bold text-yellow-400 mb-2">
                                {popup.title}
                            </h3>
                        )}
                        {popup.content && (
                            <p className="text-slate-300 text-sm">
                                {popup.content}
                            </p>
                        )}
                    </div>

                    {/* Close button at bottom */}
                    <div className="px-4 pb-4">
                        <button
                            onClick={handleClose}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold hover:from-yellow-400 hover:to-yellow-500 transition-all"
                        >
                            ปิด
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

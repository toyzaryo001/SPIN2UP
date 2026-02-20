"use client";

import axios from "axios";
import { API_URL } from "@/lib/api";
import { useToast } from "@/components/Toast";

export function useGameLauncher(onRequireLogin?: () => void) {
    const toast = useToast();

    const handlePlayGame = async (game?: any) => {
        // Check if user is logged in
        const token = localStorage.getItem("token");
        if (!token) {
            if (onRequireLogin) onRequireLogin();
            return;
        }

        if (!game) {
            console.error('No game data provided');
            return;
        }

        const loadingId = toast.loading('กำลังเปิดเกม...', game.name || 'โปรดรอสักครู่');

        try {
            const payload = {
                providerCode: game.providerCode || game.provider?.slug,
                gameCode: game.slug || game.code
            };

            const res = await axios.post(`${API_URL}/games/launch`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.removeToast(loadingId);

            if (res.data.success && res.data.data.url) {
                toast.success('เปิดเกมสำเร็จ!', 'กำลังเปิดหน้าต่างเกม...');
                window.open(res.data.data.url, '_blank');
            } else {
                toast.error('เกิดข้อผิดพลาด', res.data.message || 'ไม่สามารถเปิดเกมได้');
            }
        } catch (err: any) {
            toast.removeToast(loadingId);
            console.error("Launch error:", err);
            const errorMsg = err.response?.data?.message || 'ไม่สามารถเชื่อมต่อระบบเกมได้';
            toast.error('เกิดข้อผิดพลาด', errorMsg);
        }
    };

    return handlePlayGame;
}

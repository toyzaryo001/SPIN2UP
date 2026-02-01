"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Wallet, RefreshCw } from "lucide-react";

export default function Topbar() {
    const [balance, setBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    const fetchBalance = async () => {
        setLoading(true);
        try {
            const res = await api.get("/admin/agents/balance");
            if (res.data.success) {
                setBalance(res.data.data.balance);
            }
        } catch (error) {
            console.error("Fetch agent balance error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchBalance();
        // Auto refresh every 60 seconds
        const interval = setInterval(fetchBalance, 60000);
        return () => clearInterval(interval);
    }, []);

    if (!mounted) return null;

    return (
        <div className="bg-white border-b border-slate-200 px-8 py-3 flex justify-end items-center shadow-sm">
            <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                <div className="flex items-center gap-2 text-slate-600">
                    <Wallet size={18} className="text-yellow-500" />
                    <span className="text-sm font-medium">เครดิต Agent:</span>
                </div>
                {balance !== null ? (
                    <span className="text-lg font-bold text-slate-800 font-mono">
                        {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                ) : (
                    <span className="text-slate-400 text-sm">--.--</span>
                )}
                <button
                    onClick={fetchBalance}
                    disabled={loading}
                    className={`p-1 rounded-full hover:bg-slate-200 transition-colors ${loading ? 'animate-spin' : ''}`}
                >
                    <RefreshCw size={14} className="text-slate-500" />
                </button>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function ThaiDateTimeClock() {
    const [date, setDate] = useState<Date | null>(null);

    useEffect(() => {
        setDate(new Date());
        const timer = setInterval(() => {
            setDate(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    if (!date) return (
        <div className="flex items-center gap-2 text-slate-400 text-sm animate-pulse">
            <Clock size={16} />
            <span>กำลังโหลดเวลา...</span>
        </div>
    );

    // Format Date: "วันจันทร์ที่ 11 กุมภาพันธ์ 2026"
    const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    };
    const dateStr = date.toLocaleDateString('th-TH', dateOptions);

    // Format Time: "07:34:47"
    const timeStr = date.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    return (
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-slate-100 shadow-sm">
            <div className="p-1.5 rounded-full bg-blue-50 text-blue-600">
                <Clock size={18} />
            </div>
            <div className="flex flex-col">
                <span className="text-xs text-slate-500 font-medium leading-tight">{dateStr}</span>
                <span className="text-lg font-bold text-slate-800 leading-tight tracking-wide font-mono">
                    {timeStr}
                </span>
            </div>
        </div>
    );
}

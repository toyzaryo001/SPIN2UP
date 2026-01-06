"use client";

import { useState } from "react";
import { FileText, Calendar, ArrowRight } from "lucide-react";

export default function ReportsPage() {
    const reports = [
        { id: "new-users", title: "รายงานสมัครใหม่", description: "ดูสถิติผู้สมัครสมาชิกใหม่รายวัน" },
        { id: "new-users-deposit", title: "รายงานสมัครใหม่ฝากเงิน", description: "ผู้สมัครใหม่ที่มีการฝากเงินในวันแรก" },
        { id: "deposits", title: "รายงานฝากเงิน", description: "สรุปยอดฝากเงินทั้งหมด" },
        { id: "withdrawals", title: "รายงานถอนเงิน", description: "สรุปยอดถอนเงินทั้งหมด" },
        { id: "bonus", title: "รายงานโบนัส", description: "สรุปยอดโบนัสที่แจกให้ลูกค้า" },
        { id: "profit-loss", title: "รายงานกำไรขาดทุน", description: "สรุปภาพรวมกำไร-ขาดทุนของระบบ" },
        { id: "inactive", title: "รายงานยูสไม่ออนไลน์", description: "รายชื่อลูกค้าที่ไม่ได้เข้าใช้งาน" },
        { id: "win-loss", title: "รายงาน ชนะ-แพ้ รายบุคคล", description: "ตรวจสอบประวัติการเล่นรายบุคคล" },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">รายงานต่างๆ</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report) => (
                    <div
                        key={report.id}
                        className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer group"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <FileText size={24} />
                            </div>
                            <ArrowRight className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">{report.title}</h3>
                        <p className="text-sm text-slate-500">{report.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

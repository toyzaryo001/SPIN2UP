"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { CreditCard, Save, RefreshCw, Search } from "lucide-react";
import toast from "react-hot-toast";

// 21 Thai Banks from thai-banks-logo
const ALL_BANKS = [
    { code: "KBANK", name: "ธนาคารกสิกรไทย", nameEn: "Kasikorn Bank" },
    { code: "SCB", name: "ธนาคารไทยพาณิชย์", nameEn: "Siam Commercial Bank" },
    { code: "KTB", name: "ธนาคารกรุงไทย", nameEn: "Krungthai Bank" },
    { code: "BBL", name: "ธนาคารกรุงเทพ", nameEn: "Bangkok Bank" },
    { code: "BAY", name: "ธนาคารกรุงศรีอยุธยา", nameEn: "Bank of Ayudhya" },
    { code: "TMB", name: "ธนาคารทีเอ็มบีธนชาต", nameEn: "TMBThanachart Bank" },
    { code: "GSB", name: "ธนาคารออมสิน", nameEn: "Government Savings Bank" },
    { code: "GHB", name: "ธนาคารอาคารสงเคราะห์", nameEn: "Government Housing Bank" },
    { code: "BAAC", name: "ธ.ก.ส.", nameEn: "BAAC" },
    { code: "UOB", name: "ธนาคารยูโอบี", nameEn: "UOB Thailand" },
    { code: "CIMB", name: "ธนาคารซีไอเอ็มบี", nameEn: "CIMB Thai" },
    { code: "KKP", name: "ธนาคารเกียรตินาคินภัทร", nameEn: "Kiatnakin Phatra Bank" },
    { code: "TISCO", name: "ธนาคารทิสโก้", nameEn: "Tisco Bank" },
    { code: "LHB", name: "ธนาคารแลนด์ แอนด์ เฮ้าส์", nameEn: "Land and Houses Bank" },
    { code: "TCRB", name: "ธนาคารไทยเครดิต", nameEn: "Thai Credit Bank" },
    { code: "IBANK", name: "ธนาคารอิสลามแห่งประเทศไทย", nameEn: "Islamic Bank of Thailand" },
    { code: "ICBC", name: "ธนาคารไอซีบีซี", nameEn: "ICBC Thailand" },
    { code: "HSBC", name: "ธนาคารเอชเอสบีซี", nameEn: "HSBC Thailand" },
    { code: "CITI", name: "ธนาคารซิตี้แบงก์", nameEn: "Citibank Thailand" },
    { code: "PROMPTPAY", name: "พร้อมเพย์", nameEn: "PromptPay" },
    { code: "TRUEMONEY", name: "ทรูมันนี่", nameEn: "TrueMoney Wallet" },
];

// Map bank codes to local PNG file names (located in /bank-logos/)
const BANK_FILE_MAP: Record<string, string> = {
    "kbank": "KBANK",
    "scb": "SCB",
    "ktb": "KTB",
    "bbl": "BBL",
    "bay": "BAY",
    "tmb": "TTB",
    "gsb": "GSB",
    "ghb": "GHB",
    "baac": "BAAC",
    "uob": "UOB",
    "cimb": "CIMB",
    "kkp": "KKP",
    "tisco": "TISCO",
    "lhb": "LHB",
    "tcrb": "TCRB",
    "ibank": "IBANK",
    "icbc": "ICBC",
    "hsbc": "HSBC",
    "citi": "CITI",
    "promptpay": "PromptPay",
    "truemoney": "TrueMoney",
};

function BankLogo({ code, size = 40 }: { code: string; size?: number }) {
    const normalizedCode = code.toLowerCase().replace(/[^a-z0-9]/g, '');
    const fileName = BANK_FILE_MAP[normalizedCode] || code.toUpperCase();
    const logoUrl = `/bank-logos/${fileName}.png`;

    return (
        <img
            src={logoUrl}
            alt={code}
            width={size}
            height={size}
            className="rounded-lg bg-white p-1 object-contain"
            onError={(e) => {
                // On error, show initials
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent && !parent.querySelector('.bank-fallback')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'bank-fallback rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold';
                    fallback.style.width = `${size}px`;
                    fallback.style.height = `${size}px`;
                    fallback.style.fontSize = `${size * 0.35}px`;
                    fallback.textContent = code.slice(0, 2).toUpperCase();
                    parent.appendChild(fallback);
                }
            }}
        />
    );
}

export default function LogoBankPage() {
    const [enabledBanks, setEnabledBanks] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/settings");
            if (res.data.success && res.data.data?.enabled_banks) {
                setEnabledBanks(JSON.parse(res.data.data.enabled_banks));
            } else {
                // Default: enable top 5 banks
                setEnabledBanks(["KBANK", "SCB", "KTB", "BBL", "TRUEMONEY"]);
            }
        } catch (error) {
            console.error(error);
            setEnabledBanks(["KBANK", "SCB", "KTB", "BBL", "TRUEMONEY"]);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (code: string) => {
        setEnabledBanks(prev =>
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.put("/admin/settings", {
                enabled_banks: JSON.stringify(enabledBanks)
            });
            toast.success("บันทึกสำเร็จ");
        } catch (error) {
            toast.error("เกิดข้อผิดพลาด");
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const filteredBanks = ALL_BANKS.filter(bank =>
        bank.name.includes(search) || bank.code.toLowerCase().includes(search.toLowerCase()) || bank.nameEn.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="p-6 text-center">กำลังโหลด...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <CreditCard className="text-yellow-500" />
                        จัดการธนาคารสำหรับสมัครสมาชิก
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">เลือกธนาคารที่ต้องการให้ผู้เล่นเลือกได้ตอนสมัคร</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                >
                    <Save size={18} />
                    {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="ค้นหาธนาคาร..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredBanks.map(bank => {
                    const isEnabled = enabledBanks.includes(bank.code);
                    return (
                        <div
                            key={bank.code}
                            onClick={() => handleToggle(bank.code)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isEnabled
                                ? "border-green-500 bg-green-50 shadow-md"
                                : "border-slate-200 bg-white hover:border-slate-300"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <BankLogo code={bank.code} size={48} />
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-slate-800 truncate">{bank.code}</div>
                                    <div className="text-xs text-slate-500 truncate">{bank.name}</div>
                                </div>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isEnabled ? "bg-green-500 text-white" : "bg-slate-200"}`}>
                                    {isEnabled && <span className="text-sm">✓</span>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-500">
                <span>เลือกแล้ว: <strong className="text-green-600">{enabledBanks.length}</strong> ธนาคาร</span>
                <button onClick={fetchSettings} className="flex items-center gap-1 hover:text-slate-700">
                    <RefreshCw size={14} /> รีเซ็ต
                </button>
            </div>
        </div>
    );
}

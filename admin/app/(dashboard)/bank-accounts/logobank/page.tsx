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

// Map bank codes to Bank of Thailand SWIFT codes
const BANK_SWIFT_MAP: Record<string, string> = {
    "kbank": "KASITH",
    "scb": "SICOTH",
    "ktb": "KRTHTH",
    "bbl": "BKKBTH",
    "bay": "AYUDTH",
    "tmb": "TMBKTH",
    "gsb": "GLOATH",
    "ghb": "GHBATH",
    "baac": "BAABTH",
    "uob": "UOVBTH",
    "cimb": "UBOBTH",
    "kkp": "IKIATH",
    "tisco": "TFPCTH",
    "lhb": "LAABORH",
    "tcrb": "THCETH",
    "ibank": "TIBTTH",
    "icbc": "ICBKTH",
    "hsbc": "HSBCTH",
    "citi": "CITITH",
    "promptpay": "PROMPTPAY",
    "truemoney": "TRUEMONEY",
};

// Map for direct image URLs (verified working)
const BANK_LOGO_URLS: Record<string, string> = {
    "kbank": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/KASIKORNBANK.svg/200px-KASIKORNBANK.svg.png",
    "scb": "https://upload.wikimedia.org/wikipedia/th/thumb/4/49/SCB_logo.svg/200px-SCB_logo.svg.png",
    "ktb": "https://upload.wikimedia.org/wikipedia/th/thumb/0/0f/Krungthai_Bank_logo.svg/200px-Krungthai_Bank_logo.svg.png",
    "bbl": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Bangkok_Bank_logo.svg/200px-Bangkok_Bank_logo.svg.png",
    "bay": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Bank_of_Ayudhya_logo.svg/200px-Bank_of_Ayudhya_logo.svg.png",
    "tmb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/TTB_Bank_logo.svg/200px-TTB_Bank_logo.svg.png",
    "gsb": "https://upload.wikimedia.org/wikipedia/th/thumb/f/f2/Government_Savings_Bank_logo.svg/200px-Government_Savings_Bank_logo.svg.png",
    "ghb": "https://upload.wikimedia.org/wikipedia/th/thumb/4/4e/GHB_logo.svg/200px-GHB_logo.svg.png",
    "baac": "https://upload.wikimedia.org/wikipedia/th/thumb/3/37/BAAC_logo.svg/200px-BAAC_logo.svg.png",
    "uob": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/United_Overseas_Bank_logo.svg/200px-United_Overseas_Bank_logo.svg.png",
    "cimb": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/CIMB_logo.svg/200px-CIMB_logo.svg.png",
    "kkp": "https://upload.wikimedia.org/wikipedia/th/thumb/8/8a/KKPN_logo.svg/200px-KKPN_logo.svg.png",
    "tisco": "https://upload.wikimedia.org/wikipedia/th/thumb/5/58/TISCO_Bank_logo.svg/200px-TISCO_Bank_logo.svg.png",
    "lhb": "https://upload.wikimedia.org/wikipedia/th/thumb/6/61/LH_Bank_logo.svg/200px-LH_Bank_logo.svg.png",
    "tcrb": "https://upload.wikimedia.org/wikipedia/th/thumb/d/df/Thai_Credit_Bank_logo.svg/200px-Thai_Credit_Bank_logo.svg.png",
    "ibank": "https://upload.wikimedia.org/wikipedia/th/thumb/9/92/IslamicBank_Logo.svg/200px-IslamicBank_Logo.svg.png",
    "icbc": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/ICBC_logo.svg/200px-ICBC_logo.svg.png",
    "hsbc": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/HSBC_logo_%282018%29.svg/200px-HSBC_logo_%282018%29.svg.png",
    "citi": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Citi.svg/200px-Citi.svg.png",
    "promptpay": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/PromptPay-logo.svg/200px-PromptPay-logo.svg.png",
    "truemoney": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/TrueMoney_Wallet_logo.svg/200px-TrueMoney_Wallet_logo.svg.png",
};

function BankLogo({ code, size = 40 }: { code: string; size?: number }) {
    const normalizedCode = code.toLowerCase().replace(/[^a-z0-9]/g, '');
    const logoUrl = BANK_LOGO_URLS[normalizedCode];

    // Fallback: generate initials if no logo found
    if (!logoUrl) {
        return (
            <div
                className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold"
                style={{ width: size, height: size, fontSize: size * 0.35 }}
            >
                {code.slice(0, 2).toUpperCase()}
            </div>
        );
    }

    return (
        <img
            src={logoUrl}
            alt={code}
            width={size}
            height={size}
            className="rounded-lg bg-white p-1 object-contain"
            onError={(e) => {
                // On error, replace with initials
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                    const fallback = document.createElement('div');
                    fallback.className = 'rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold';
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
            const res = await api.get("/admin/settings/key/enabled_banks");
            if (res.data.success && res.data.data?.value) {
                setEnabledBanks(JSON.parse(res.data.data.value));
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
            await api.post("/admin/settings", {
                key: "enabled_banks",
                value: JSON.stringify(enabledBanks)
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

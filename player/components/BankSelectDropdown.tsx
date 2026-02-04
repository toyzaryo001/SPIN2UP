"use client";

import React, { useState, useRef, useEffect } from 'react';
import BankLogo from './BankLogo';

// 21 Thai Banks from thai-banks-logo
const ALL_BANKS = [
    { code: "KBANK", name: "ธนาคารกสิกรไทย" },
    { code: "SCB", name: "ธนาคารไทยพาณิชย์" },
    { code: "KTB", name: "ธนาคารกรุงไทย" },
    { code: "BBL", name: "ธนาคารกรุงเทพ" },
    { code: "BAY", name: "ธนาคารกรุงศรีอยุธยา" },
    { code: "TMB", name: "ธนาคารทีเอ็มบีธนชาต" },
    { code: "GSB", name: "ธนาคารออมสิน" },
    { code: "GHB", name: "ธนาคารอาคารสงเคราะห์" },
    { code: "BAAC", name: "ธ.ก.ส." },
    { code: "UOB", name: "ธนาคารยูโอบี" },
    { code: "CIMB", name: "ธนาคารซีไอเอ็มบี" },
    { code: "KKP", name: "ธนาคารเกียรตินาคินภัทร" },
    { code: "TISCO", name: "ธนาคารทิสโก้" },
    { code: "LHB", name: "ธนาคารแลนด์ แอนด์ เฮ้าส์" },
    { code: "TCRB", name: "ธนาคารไทยเครดิต" },
    { code: "IBANK", name: "ธนาคารอิสลามฯ" },
    { code: "ICBC", name: "ธนาคารไอซีบีซี" },
    { code: "HSBC", name: "ธนาคารเอชเอสบีซี" },
    { code: "CITI", name: "ธนาคารซิตี้แบงก์" },
    { code: "PROMPTPAY", name: "พร้อมเพย์" },
    { code: "TRUEMONEY", name: "ทรูมันนี่" },
];

interface BankSelectDropdownProps {
    value: string;
    onChange: (code: string) => void;
    enabledBanks?: string[]; // Optional: filter to only show these banks
}

export default function BankSelectDropdown({ value, onChange, enabledBanks }: BankSelectDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter banks if enabledBanks is provided
    const banks = enabledBanks
        ? ALL_BANKS.filter(b => enabledBanks.includes(b.code))
        : ALL_BANKS;

    const selectedBank = ALL_BANKS.find(b => b.code === value);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className="relative">
            {/* Selected Value Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-green-500 focus:outline-none flex items-center gap-3"
            >
                {selectedBank ? (
                    <>
                        <BankLogo bankCode={selectedBank.code} width={24} height={24} />
                        <span className="flex-1 text-left truncate">{selectedBank.name}</span>
                    </>
                ) : (
                    <span className="text-slate-400">เลือกธนาคาร</span>
                )}
                <svg
                    className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Options */}
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-[#1e293b] border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {banks.map(bank => (
                        <div
                            key={bank.code}
                            onClick={() => { onChange(bank.code); setIsOpen(false); }}
                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/10 transition-colors ${value === bank.code ? 'bg-green-500/20 text-green-400' : 'text-white'
                                }`}
                        >
                            <BankLogo bankCode={bank.code} width={24} height={24} />
                            <span className="truncate">{bank.name}</span>
                            {value === bank.code && (
                                <span className="ml-auto text-green-400">✓</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

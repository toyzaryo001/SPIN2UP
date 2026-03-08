import React from 'react';

const BANK_FILE_MAP: Record<string, string> = {
    "kbank": "KBANK",
    "kasikorn": "KBANK",
    "scb": "SCB",
    "siam commercial bank": "SCB",
    "ktb": "KTB",
    "krungthai": "KTB",
    "bbl": "BBL",
    "bangkok bank": "BBL",
    "bay": "BAY",
    "krungsri": "BAY",
    "tmb": "TTB",
    "ttb": "TTB",
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

interface BankLogoProps {
    bankCode: string; // "KBANK", "SCB", etc.
    className?: string;
    style?: React.CSSProperties;
    width?: number;
    height?: number;
}

const BankLogo: React.FC<BankLogoProps> = ({ bankCode, className, style, width = 48, height = 48 }) => {
    const normalizedCode = (bankCode || "").toLowerCase().replace(/[^a-z0-9]/g, '');
    const fileName = BANK_FILE_MAP[normalizedCode] || bankCode.toUpperCase();
    const imageUrl = `/bank-logos/${fileName}.png`;

    return (
        <img
            src={imageUrl}
            alt={bankCode}
            className={className}
            style={style}
            width={width}
            height={height}
            onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent && !parent.querySelector('.bank-fallback')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'bank-fallback rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold';
                    fallback.style.width = `${width}px`;
                    fallback.style.height = `${height}px`;
                    fallback.style.fontSize = `${Number(width) * 0.35}px`;
                    fallback.textContent = String(bankCode || "").slice(0, 2).toUpperCase();
                    parent.appendChild(fallback);
                }
            }}
        />
    );
};

export default BankLogo;

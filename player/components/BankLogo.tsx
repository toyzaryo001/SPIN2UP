import React from 'react';

// Map bank codes to local PNG file names (located in /bank-logos/)
const BANK_FILE_MAP: Record<string, string> = {
    "kbank": "KBANK",
    "scb": "SCB",
    "ktb": "KTB",
    "bbl": "BBL",
    "bay": "BAY",
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
    "true": "TrueMoney",
};

// Common aliases map
const BANK_CODE_MAP: Record<string, string> = {
    'kasikorn': 'kbank',
    'siam commercial bank': 'scb',
    'krungthai': 'ktb',
    'bangkok bank': 'bbl',
    'krungsri': 'bay',
    'truewallet': 'truemoney',
};

interface BankLogoProps {
    bankCode: string;
    className?: string;
    style?: React.CSSProperties;
    width?: number;
    height?: number;
}

const BankLogo: React.FC<BankLogoProps> = ({ bankCode, className, style, width = 48, height = 48 }) => {
    // Normalize code
    const normalizedName = (String(bankCode) || "").toLowerCase().replace(/[^a-z0-9]/g, '');

    // Find mapped code or use direct normalized name
    const code = BANK_CODE_MAP[normalizedName] || normalizedName;

    // Get file name from map
    const fileName = BANK_FILE_MAP[code] || bankCode.toUpperCase();
    const logoUrl = `/bank-logos/${fileName}.png`;

    return (
        <img
            src={logoUrl}
            alt={bankCode}
            className={`object-contain ${className || ''}`}
            style={style}
            width={width}
            height={height}
            onError={(e) => {
                // On error, show initials
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent && !parent.querySelector('.bank-fallback')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'bank-fallback rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold';
                    fallback.style.width = `${width}px`;
                    fallback.style.height = `${height}px`;
                    fallback.style.fontSize = `${width * 0.35}px`;
                    fallback.textContent = bankCode.slice(0, 2).toUpperCase();
                    parent.appendChild(fallback);
                }
            }}
        />
    );
};

export default BankLogo;

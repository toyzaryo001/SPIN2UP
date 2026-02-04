import React from 'react';

// Map for direct image URLs from Wikimedia Commons (verified working)
const BANK_LOGO_URLS: Record<string, string> = {
    "kbank": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/KASIKORNBANK.svg/200px-KASIKORNBANK.svg.png",
    "scb": "https://upload.wikimedia.org/wikipedia/th/thumb/4/49/SCB_logo.svg/200px-SCB_logo.svg.png",
    "ktb": "https://upload.wikimedia.org/wikipedia/th/thumb/0/0f/Krungthai_Bank_logo.svg/200px-Krungthai_Bank_logo.svg.png",
    "bbl": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Bangkok_Bank_logo.svg/200px-Bangkok_Bank_logo.svg.png",
    "bay": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Bank_of_Ayudhya_logo.svg/200px-Bank_of_Ayudhya_logo.svg.png",
    "tmb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/TTB_Bank_logo.svg/200px-TTB_Bank_logo.svg.png",
    "ttb": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/TTB_Bank_logo.svg/200px-TTB_Bank_logo.svg.png",
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
    "true": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/TrueMoney_Wallet_logo.svg/200px-TrueMoney_Wallet_logo.svg.png",
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
    const normalizedName = (bankCode || "").toLowerCase().replace(/[^a-z0-9]/g, '');

    // Find mapped code or use direct normalized name
    const code = BANK_CODE_MAP[normalizedName] || normalizedName;

    // Get URL from map
    const logoUrl = BANK_LOGO_URLS[code];

    // If no logo found, show initials
    if (!logoUrl) {
        return (
            <div
                className={`rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold ${className || ''}`}
                style={{ width, height, fontSize: width * 0.35, ...style }}
            >
                {bankCode.slice(0, 2).toUpperCase()}
            </div>
        );
    }

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
                if (parent) {
                    const fallback = document.createElement('div');
                    fallback.className = 'rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold';
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

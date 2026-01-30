import React from 'react';

// Common aliases map to standard codes used by thai-banks-logo
const BANK_CODE_MAP: Record<string, string> = {
    'kbank': 'kbank',
    'kasikorn': 'kbank',
    'scb': 'scb',
    'siam commercial bank': 'scb',
    'ktb': 'ktb',
    'krungthai': 'ktb',
    'bbl': 'bbl',
    'bangkok bank': 'bbl',
    'ttb': 'ttb',
    'tmb': 'ttb',
    'gsb': 'gsb',
    'bay': 'bay',
    'krungsri': 'bay',
    'uob': 'uob',
    'tisco': 'tisco',
    'kkp': 'kkp',
    'cimb': 'cimb',
    'baac': 'baac',
    'ghb': 'ghb',
    'lhb': 'lhb',
};

interface BankLogoProps {
    bankCode: string; // "KBANK", "SCB", etc.
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

    // Use raw.githubusercontent for the image
    const imageUrl = `https://raw.githubusercontent.com/casperstack/thai-banks-logo/master/src/th-banks-logo-medium/${code}.png`;

    return (
        <img
            src={imageUrl}
            alt={bankCode}
            className={className}
            style={style}
            width={width}
            height={height}
            onError={(e) => {
                // Fallback if image fails (e.g. invalid code)
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.parentElement) {
                    // Try to show initials if possible? Or just hide.
                    // For now, we assume the surrounding container might have text/fallback logic
                    // or we render a default icon placeholder logic here
                }
            }}
        />
    );
};

export default BankLogo;

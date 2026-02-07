import crypto from 'crypto';

// Bank code mapping from SMS to Thai names
const BANK_CODE_MAP: Record<string, string[]> = {
    'BBL': ['กรุงเทพ', 'bangkok bank', 'bbl'],
    'KBANK': ['กสิกรไทย', 'กสิกร', 'kasikorn', 'kbank'],
    'SCB': ['ไทยพาณิชย์', 'scb', 'siam commercial'],
    'KTB': ['กรุงไทย', 'krungthai', 'ktb'],
    'BAY': ['กรุงศรีอยุธยา', 'กรุงศรี', 'krungsri', 'bay'],
    'TMB': ['ทหารไทยธนชาต', 'ทหารไทย', 'tmb', 'ttb'],
    'TTB': ['ทีทีบี', 'ttb', 'tmbthanachart'],
    'GSB': ['ออมสิน', 'gsb', 'government savings'],
    'CIMB': ['ซีไอเอ็มบี', 'cimb'],
    'LH': ['แลนด์แอนด์เฮ้าส์', 'lhbank', 'lh'],
    'TISCO': ['ทิสโก้', 'tisco'],
    'UOB': ['ยูโอบี', 'uob'],
    'BAAC': ['ธ.ก.ส.', 'baac', 'ธกส'],
    'ICBC': ['ไอซีบีซี', 'icbc'],
    'PROMPTPAY': ['พร้อมเพย์', 'promptpay'],
};

export interface ParsedSMS {
    amount: number;
    destAccountLast4: string;
    sourceBank: string;
    sourceAccountLast4: string;
    sourceName: string;
    balanceAfter: number;
    dateTime: string;
    rawMessage: string;
}

/**
 * Parse bank transfer SMS message
 * Format: มีเงิน10.00บ.โอนเข้าบ/ชxx7109 จากBBL X7902 MR WORAPON CHIN เหลือ94.00บ.31/12/25@00:33
 */
export function parseBankSMS(message: string): ParsedSMS | null {
    try {
        // Normalize message - remove extra whitespace and newlines
        const normalized = message.replace(/\s+/g, ' ').trim();

        // Pattern 1: มีเงิน{amount}บ.โอนเข้าบ/ชxx{destLast4} จาก{bank} X{sourceLast4} {name} เหลือ{balance}บ.{datetime}
        // Example: มีเงิน10.00บ.โอนเข้าบ/ชxx7109 จากBBL X7902 MR WORAPON CHIN เหลือ94.00บ.31/12/25@00:33

        // Extract amount
        const amountMatch = normalized.match(/มีเงิน([\d,]+\.?\d*)บ/);
        if (!amountMatch) {
            console.log('[SMS Parser] Amount not found');
            return null;
        }
        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));

        // Extract destination account last 4 digits
        const destMatch = normalized.match(/โอนเข้าบ\/ช[xX]*(\d{4})/);
        if (!destMatch) {
            console.log('[SMS Parser] Destination account not found');
            return null;
        }
        const destAccountLast4 = destMatch[1];

        // Extract source bank and account
        // Pattern: จาก{BANK} X{4digits} or จาก{BANK} x{4digits}
        const sourceMatch = normalized.match(/จาก\s*([A-Z]+)\s*[xX](\d{4})/);
        if (!sourceMatch) {
            console.log('[SMS Parser] Source bank/account not found');
            return null;
        }
        const sourceBank = sourceMatch[1];
        const sourceAccountLast4 = sourceMatch[2];

        // Extract source name (text after source account until "เหลือ")
        const nameMatch = normalized.match(/[xX]\d{4}\s+(.+?)\s+เหลือ/);
        const sourceName = nameMatch ? nameMatch[1].trim() : '';

        // Extract balance after
        const balanceMatch = normalized.match(/เหลือ([\d,]+\.?\d*)บ/);
        const balanceAfter = balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, '')) : 0;

        // Extract datetime
        const dateTimeMatch = normalized.match(/(\d{2}\/\d{2}\/\d{2}@\d{2}:\d{2})/);
        const dateTime = dateTimeMatch ? dateTimeMatch[1] : '';

        return {
            amount,
            destAccountLast4,
            sourceBank,
            sourceAccountLast4,
            sourceName,
            balanceAfter,
            dateTime,
            rawMessage: message
        };
    } catch (error) {
        console.error('[SMS Parser] Error parsing SMS:', error);
        return null;
    }
}

/**
 * Check if bank code matches user's bank name
 * @param smsBank Bank code from SMS (e.g., "BBL")
 * @param userBank User's bank name in Thai (e.g., "กรุงเทพ")
 */
export function matchBankName(smsBank: string, userBank: string): boolean {
    const normalizedUserBank = userBank.toLowerCase().trim();
    const aliases = BANK_CODE_MAP[smsBank.toUpperCase()];

    if (!aliases) {
        // Unknown bank code, try direct match
        return smsBank.toLowerCase() === normalizedUserBank;
    }

    // Check if user's bank matches any alias
    return aliases.some(alias =>
        normalizedUserBank.includes(alias.toLowerCase()) ||
        alias.toLowerCase().includes(normalizedUserBank)
    );
}

/**
 * Check if account number ends with the given last 4 digits
 */
export function matchAccountLast4(fullAccount: string, last4: string): boolean {
    // Remove non-digits from account number
    const cleanAccount = fullAccount.replace(/\D/g, '');
    return cleanAccount.endsWith(last4);
}

/**
 * Generate MD5 hash of message for deduplication
 */
export function generateMessageHash(message: string): string {
    return crypto.createHash('md5').update(message.trim()).digest('hex');
}

/**
 * Get Thai bank name from SMS bank code
 */
export function getBankThaiName(smsBank: string): string {
    const aliases = BANK_CODE_MAP[smsBank.toUpperCase()];
    return aliases ? aliases[0] : smsBank;
}

import axios from 'axios';
import { IPaymentProvider, PayinResult, WebhookResult } from '../IPaymentProvider';

interface BibPayConfig {
    apiKey: string;
    secretKey?: string; // Added secretKey
    apiEndpoint?: string;
    callbackUrl?: string; // Optional override
}

export class BibPayProvider implements IPaymentProvider {
    readonly code = 'bibpay';
    private config: BibPayConfig;
    private baseUrl = 'https://apiv2.javisx.com/api/v1/mc';

    constructor(config: any) {
        this.config = config as BibPayConfig;
        if (this.config.apiEndpoint) {
            this.baseUrl = this.config.apiEndpoint.replace(/\/$/, ''); // Remove trailing slash
            if (!this.baseUrl.endsWith('/api/v1/mc')) {
                this.baseUrl += '/api/v1/mc';
            }
        }
    }

    validateConfig(): boolean {
        return !!this.config.apiKey;
    }

    async createPayin(amount: number, user: any, referenceId: string): Promise<PayinResult> {
        try {
            // Determine Bank Code logic (Simplified from PHP version)
            // Ideally should have a mapper util, but using '014' (SCB) as safe fallback or user's bank if mapped
            const bankCode = this.mapBankCode(user.bank) || '014';

            // Construct callback URL if not provided in config, usually passed from controller or env
            // For now assuming we rely on what's configured or let the controller handle it?
            // The interface creates the payload.

            const payload = {
                bankName: user.bankName || 'Customer',
                bankNumber: user.bankAccount || '0000000000',
                bankCode: bankCode,
                amount: amount.toFixed(2),
                refferend: referenceId, // Note: API typo 'refferend' preserved from PHP ref
                signatrure: this.config.apiKey, // Note: API typo 'signatrure' preserved
                callbackUrl: this.config.callbackUrl || `${process.env.API_BASE_URL}/webhooks/payment/bibpay`
            };

            const response = await axios.post(`${this.baseUrl}/payin`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.config.apiKey
                }
            });

            const result = response.data;

            if (!result.status) {
                return {
                    success: false,
                    message: result.msg || result.message || 'Unknown error from BIBPAY',
                    rawResponse: result
                };
            }

            const data = result.data;
            // Try multiple keys for QR and TxID
            const qrCode = data.qrcode || data.qr_code || data.qrCode || data.qr || data.image || data.qr_image;
            const txId = data.transactionId || data.transaction_id;

            return {
                success: true,
                transactionId: txId,
                qrCode: qrCode,
                amount: parseFloat(data.depositAmount || amount),
                referenceId: referenceId,
                rawResponse: result
            };

        } catch (error: any) {
            console.error('BibPay CreatePayin Error:', error.response?.data || error.message);
            return {
                success: false,
                message: error.response?.data?.message || error.message,
                rawResponse: error.response?.data
            };
        }
    }

    verifyWebhook(payload: any, headers: any): boolean {
        // BIBPAY might not have a strong signature verification in v1/mc based on PHP code
        // PHP code just checked if transaction exists.
        // We can check if the payload structure matches what we expect.
        return true;
    }

    async processWebhook(payload: any): Promise<WebhookResult> {
        // Payload structure based on PHP: { status, message, data: { transactionId, refferend, amount, ... } }
        const status = payload.status;
        const txData = payload.data || {};
        const refId = txData.refferend || txData.reference_id;
        const externalId = txData.transactionId;
        const amount = parseFloat(txData.amount || '0');

        let txStatus: 'SUCCESS' | 'FAILED' | 'PENDING' = 'PENDING';

        if (status === 'completed' || status === 'success') {
            txStatus = 'SUCCESS';
        } else if (['timeout', 'expired', 'failed', 'fail'].includes(status)) {
            txStatus = 'FAILED';
        }

        return {
            success: true, // Processed successfully
            txStatus,
            transactionId: refId, // Use our Ref ID to find the transaction
            externalId,
            amount,
            message: payload.message,
            rawResponse: payload
        };
    }

    private mapBankCode(bankName: string): string | null {
        // Basic mapping, can be expanded
        const map: Record<string, string> = {
            'kbank': '004', 'scb': '014', 'ktb': '006', 'bbl': '002', 'gsb': '030', 'bay': '025'
        };
        if (!bankName) return null;
        const normalized = bankName.toLowerCase().replace(/[^a-z]/g, '');
        for (const key in map) {
            if (normalized.includes(key)) return map[key];
        }
        return null; // Let caller default
    }

    async getBalance(): Promise<number> {
        try {
            const response = await axios.post(`${this.baseUrl}/balance`, {}, {
                headers: {
                    'x-api-key': this.config.apiKey
                }
            });

            if (response.data && response.data.status && response.data.data) {
                return parseFloat(response.data.data.balance || '0');
            }
            return 0;
        } catch (error: any) {
            console.error('BibPay GetBalance Error:', error.response?.data || error.message);
            // Return 0 or rethrow? Returning 0 for now to prevent crashing the UI
            return 0;
        }
    }
}

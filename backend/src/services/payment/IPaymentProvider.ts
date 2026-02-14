
export interface PayinResult {
    success: boolean;
    message?: string;
    transactionId?: string; // External ID
    qrCode?: string;
    referenceId?: string;
    amount?: number;
    rawResponse?: any;
}

export interface WebhookResult {
    success: boolean;
    txStatus: 'SUCCESS' | 'FAILED' | 'PENDING';
    transactionId: string; // Our internal ID or External ID (depends on what we send)
    externalId?: string;
    amount?: number;
    message?: string;
    rawResponse?: any;
}

export interface IPaymentProvider {
    /**
     * Unique code for the provider (e.g. 'bibpay', 'gbprime')
     */
    readonly code: string;

    /**
     * Check if the provider is properly configured
     */
    validateConfig(): boolean;

    /**
     * Create a deposit transaction (Payin)
     * @param amount Amount to deposit
     * @param user User object (id, name, bank info)
     * @param referenceId Internal unique reference ID
     */
    createPayin(amount: number, user: any, referenceId: string): Promise<PayinResult>;

    /**
     * Verify the webhook signature
     * @param payload Request body
     * @param headers Request headers
     */
    verifyWebhook(payload: any, headers: any): boolean;

    /**
     * Process the webhook payload and normalize the status
     * @param payload Request body
     */
    processWebhook(payload: any): Promise<WebhookResult>;
    /**
     * Get current balance of the payment gateway account
     */
    getBalance(): Promise<number>;
}

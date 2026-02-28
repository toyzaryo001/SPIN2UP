import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export class PaymentController {

    /**
     * User requests a deposit QR Code
     * POST /api/payment/deposit
     */
    static async createDeposit(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            const { amount, gateway } = req.body;

            if (!userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            const result = await PaymentService.createAutoDeposit(userId, Number(amount), gateway);

            return res.json({ success: true, data: result });
        } catch (error: any) {
            console.error('Create Deposit Error:', error);

            // ⚠️ INTENTIONAL: Returning HTTP 200 on deposit failures
            // Reason: Prevent duplicate/retry attempts from payment gateway
            // - If we return 5xx: Gateway may retry the same request, potentially creating duplicate charges
            // - If we return 4xx: Client may interpret as validation error and not retry
            // - HTTP 200 signals: We processed the request successfully (from gateway perspective)
            //   The actual success/failure is indicated by the 'success' field in JSON body
            //
            // This matches BibPay's webhook pattern: Return 200 for all responses
            // Related commit: 013c567 "fix(payment): surface exact bibpay error msg and return 200 on deposit fail"
            //
            // Clients must check the 'success' boolean, not HTTP status code
            return res.status(200).json({ success: false, message: error.message });
        }
    }

    /**
     * Webhook Handler for ALL providers
     * POST /api/webhooks/payment/:gateway
     */
    static async webhook(req: Request, res: Response) {
        try {
            const { gateway } = req.params;
            const payload = req.body;
            const headers = req.headers;

            // Extract client IP from request (handles X-Forwarded-For for proxies)
            const clientIp = req.headers['x-forwarded-for']
                ? (req.headers['x-forwarded-for'] as string).split(',')[0].trim()
                : req.ip || 'unknown';

            console.log(`[Webhook] Received from [${gateway}] IP: ${clientIp}`);

            // Run in background (don't block response?) or await?
            // Usually payment providers expect 200 OK immediately or after processing.
            // We await to ensure we save it.
            await PaymentService.processWebhook(gateway, payload, headers, clientIp);

            return res.status(200).json({ success: true });
        } catch (error: any) {
            console.error(`Webhook Error [${req.params.gateway}]:`, error);
            // Some providers retry on 500, so returning 500 is good for errors.
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}

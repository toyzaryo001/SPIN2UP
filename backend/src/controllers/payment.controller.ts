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
            return res.status(400).json({ success: false, message: error.message });
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

            // Run in background (don't block response?) or await?
            // Usually payment providers expect 200 OK immediately or after processing.
            // We await to ensure we save it.
            await PaymentService.processWebhook(gateway, payload, headers);

            return res.status(200).json({ success: true });
        } catch (error: any) {
            console.error(`Webhook Error [${req.params.gateway}]:`, error);
            // Some providers retry on 500, so returning 500 is good for errors.
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}

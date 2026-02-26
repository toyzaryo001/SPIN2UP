import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller.js';
import truewalletWebhook from './truewallet-webhook.routes.js';

const router = Router();

// Public Webhook APIs
router.post('/payment/:gateway', PaymentController.webhook);

// TrueWallet Webhook
router.use('/truewallet', truewalletWebhook);

export default router;

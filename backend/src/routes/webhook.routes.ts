import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller.js';

const router = Router();

// Public Webhook APIs
router.post('/payment/:gateway', PaymentController.webhook);

export default router;

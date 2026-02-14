import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// User APIs
router.post('/deposit', authMiddleware, PaymentController.createDeposit);

// Webhook Callback (Public)
router.post('/webhook/:gateway', PaymentController.webhook);
// Support GET for some providers if needed, or stick to POST
router.get('/webhook/:gateway', PaymentController.webhook);

export default router;

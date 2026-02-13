import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// User APIs
router.post('/deposit', authMiddleware, PaymentController.createDeposit);

// Private/Admin APIs (Future)
// router.get('/gateways', ...);

export default router;

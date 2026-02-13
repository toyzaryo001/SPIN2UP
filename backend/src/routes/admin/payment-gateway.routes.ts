import { Router } from 'express';
import { PaymentGatewayController } from '../../controllers/admin/payment-gateway.controller';
import { requirePermission } from '../../middlewares/auth.middleware';

const router = Router();

// Require 'settings.payment' permission
router.get('/', requirePermission('settings', 'payment', 'view'), PaymentGatewayController.getGateways);
router.post('/', requirePermission('settings', 'payment', 'manage'), PaymentGatewayController.createGateway);
router.put('/:id', requirePermission('settings', 'payment', 'manage'), PaymentGatewayController.updateGateway);
router.patch('/:id/toggle', requirePermission('settings', 'payment', 'manage'), PaymentGatewayController.toggleActive);
router.delete('/:id', requirePermission('settings', 'payment', 'manage'), PaymentGatewayController.deleteGateway);

export default router;

import { Router } from 'express';
import { PaymentGatewayController } from '../../controllers/admin/payment-gateway.controller';
import { requirePermission } from '../../middlewares/auth.middleware';

const router = Router();

// Require 'settings.payment' permission
router.get('/', requirePermission('settings', 'payment', 'view'), PaymentGatewayController.getGateways);
router.post('/', requirePermission('settings', 'payment', 'manage'), PaymentGatewayController.createGateway);
router.get('/:id/balance', requirePermission('settings', 'payment', 'view'), PaymentGatewayController.getGatewayBalance);
router.put('/:id', requirePermission('settings', 'payment', 'manage'), PaymentGatewayController.updateGateway);
router.patch('/:id/toggle', requirePermission('settings', 'payment', 'manage'), PaymentGatewayController.toggleActive);
router.delete('/:id', requirePermission('settings', 'payment', 'manage'), PaymentGatewayController.deleteGateway);

// New Provider Features
router.post('/:id/check-status', requirePermission('settings', 'payment', 'view'), PaymentGatewayController.checkStatus);
router.get('/:id/banks', requirePermission('settings', 'payment', 'view'), PaymentGatewayController.getBanks);

export default router;

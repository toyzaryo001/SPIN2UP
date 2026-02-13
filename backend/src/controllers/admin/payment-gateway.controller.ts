import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import prisma from '../../lib/db';

export class PaymentGatewayController {

    /**
     * Get all payment gateways
     * GET /api/admin/payment-gateways
     */
    static async getGateways(req: AuthRequest, res: Response) {
        try {
            const gateways = await prisma.paymentGateway.findMany({
                orderBy: { sortOrder: 'asc' }
            });
            return res.json({ success: true, data: gateways });
        } catch (error: any) {
            console.error('Get Gateways Error:', error);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    }

    /**
     * Update payment gateway config
     * PUT /api/admin/payment-gateways/:id
     */
    static async updateGateway(req: AuthRequest, res: Response) {
        try {
            const id = parseInt(req.params.id);
            const { name, config, isActive } = req.body;

            // Validate JSON config
            let configString = config;
            if (typeof config === 'object') {
                configString = JSON.stringify(config);
            } else {
                // Try parse to check validity
                try {
                    JSON.parse(config);
                } catch (e) {
                    return res.status(400).json({ success: false, message: 'Invalid JSON config' });
                }
            }

            const gateway = await prisma.paymentGateway.update({
                where: { id },
                data: {
                    name,
                    config: configString,
                    isActive: isActive !== undefined ? isActive : undefined
                }
            });

            return res.json({ success: true, data: gateway });
        } catch (error: any) {
            console.error('Update Gateway Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Toggle active status
     * PATCH /api/admin/payment-gateways/:id/toggle
     */
    static async toggleActive(req: AuthRequest, res: Response) {
        try {
            const id = parseInt(req.params.id);
            const gateway = await prisma.paymentGateway.findUnique({ where: { id } });

            if (!gateway) {
                return res.status(404).json({ success: false, message: 'Gateway not found' });
            }

            const updated = await prisma.paymentGateway.update({
                where: { id },
                data: { isActive: !gateway.isActive }
            });

            return res.json({ success: true, data: updated });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}

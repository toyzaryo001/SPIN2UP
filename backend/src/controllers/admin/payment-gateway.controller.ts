import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import prisma from '../../lib/db';
import { PaymentFactory } from '../../services/payment/PaymentFactory';

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

    /**
     * Create new payment gateway
     * POST /api/admin/payment-gateways
     */
    static async createGateway(req: AuthRequest, res: Response) {
        try {
            const { code, name, config } = req.body;

            if (!code || !name) {
                return res.status(400).json({ success: false, message: 'Code and Name are required' });
            }

            // Check if code exists
            const existing = await prisma.paymentGateway.findFirst({ where: { code } });
            if (existing) {
                return res.status(400).json({ success: false, message: 'Gateway with this code already exists' });
            }

            let configString = config;
            if (typeof config === 'object') {
                configString = JSON.stringify(config);
            }

            const gateway = await prisma.paymentGateway.create({
                data: {
                    code,
                    name,
                    config: configString || '{}',
                    isActive: true
                }
            });

            return res.json({ success: true, data: gateway });
        } catch (error: any) {
            console.error('Create Gateway Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Delete payment gateway
     * DELETE /api/admin/payment-gateways/:id
     */
    static async deleteGateway(req: AuthRequest, res: Response) {
        try {
            const id = parseInt(req.params.id);
            await prisma.paymentGateway.delete({ where: { id } });
            return res.json({ success: true, message: 'Deleted successfully' });
        } catch (error: any) {
            console.error('Delete Gateway Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Get gateway balance
     * GET /api/admin/payment-gateways/:id/balance
     */
    static async getGatewayBalance(req: AuthRequest, res: Response) {
        try {
            const id = parseInt(req.params.id);
            const gateway = await prisma.paymentGateway.findUnique({ where: { id } });

            if (!gateway) {
                return res.status(404).json({ success: false, message: 'Gateway not found' });
            }

            const provider = await PaymentFactory.getProvider(gateway.code);
            if (!provider) {
                return res.status(400).json({ success: false, message: 'Provider implementation not found or inactive' });
            }

            const balance = await provider.getBalance();

            return res.json({ success: true, data: { balance } });
        } catch (error: any) {
            console.error('Get Gateway Balance Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Check Transaction Status (Manual Check)
     * POST /api/admin/payment-gateways/:id/check-status
     */
    static async checkStatus(req: AuthRequest, res: Response) {
        try {
            const id = parseInt(req.params.id);
            const { referenceId } = req.body;

            if (!referenceId) return res.status(400).json({ success: false, message: 'Reference ID required' });

            const gateway = await prisma.paymentGateway.findUnique({ where: { id } });
            if (!gateway) return res.status(404).json({ success: false, message: 'Gateway not found' });

            const provider = await PaymentFactory.getProvider(gateway.code);
            if (!provider) return res.status(400).json({ success: false, message: 'Provider not found' });

            if (!provider.checkTransactionStatus) {
                return res.status(400).json({ success: false, message: 'Provider does not support status check' });
            }

            const result = await provider.checkTransactionStatus(referenceId);
            return res.json({ success: true, data: result });

        } catch (error: any) {
            console.error('Check Status Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Get Bank List from Provider
     * GET /api/admin/payment-gateways/:id/banks
     */
    static async getBanks(req: AuthRequest, res: Response) {
        try {
            const id = parseInt(req.params.id);
            const gateway = await prisma.paymentGateway.findUnique({ where: { id } });
            if (!gateway) return res.status(404).json({ success: false, message: 'Gateway not found' });

            const provider = await PaymentFactory.getProvider(gateway.code);
            if (!provider) return res.status(400).json({ success: false, message: 'Provider not found' });

            if (!provider.getBankList) {
                return res.status(400).json({ success: false, message: 'Provider does not support bank list' });
            }

            const result = await provider.getBankList();
            return res.json({ success: true, data: result });
        } catch (error: any) {
            console.error('Get Banks Error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}

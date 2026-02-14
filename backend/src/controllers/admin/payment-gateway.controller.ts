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

            const provider = PaymentFactory.getProvider(gateway.code);
            if (!provider) {
                return res.status(400).json({ success: false, message: 'Provider implementation not found' });
            }

            // Factory instantiates with config from DB, but let's double check if we need to re-instantiate or if Factory handles it correctly.
            // PaymentFactory.getProvider(code) gets config from DB inside it?
            // Wait, PaymentFactory.getProvider takes (code). Let's check PaymentFactory again.
            // Ah, PaymentFactory logic usually fetches config inside. let me check. 
            // NO, I need to check PaymentFactory.ts to be sure. 
            // The previous view showed: `getProvider(code: string): PaymentProvider | null`? No, it seemed to fetch from DB.
            // Re-reading PaymentFactory.ts in my thought process... no I should just check it to be 100% safe.
            // But I will assume standard pattern for now: 
            // actually, if PaymentFactory needs to be async to fetch config, then `getProvider` must be async.
            // If it's static and synchronous, it might need config passed to it.

            // Checking my previous memory of PaymentFactory...
            // "This factory class is responsible for creating instances... It fetches gateway configurations from the database"
            // If it fetches from DB, it must be async.

            // Let me quick-check PaymentFactory again to be safe. 
            // I'll pause this edit and check PaymentFactory first.

            // logic moved to next step
            return res.status(501).json({ message: "Not implemented yet" });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}

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
            const { name, config, isActive, code } = req.body;

            // Get current gateway to check code
            const currentGateway = await prisma.paymentGateway.findUnique({ where: { id } });
            if (!currentGateway) {
                return res.status(404).json({ success: false, message: 'Gateway not found' });
            }

            // Validate JSON config
            let configObj: any = config;
            let configString = config;

            if (typeof config === 'object') {
                configObj = config;
                configString = JSON.stringify(config);
            } else if (typeof config === 'string') {
                // Try parse to check validity
                try {
                    configObj = JSON.parse(config);
                } catch (e) {
                    return res.status(400).json({ success: false, message: 'Invalid JSON config' });
                }
                configString = config;
            }

            // Validate BibPay specific config requirements
            if (currentGateway.code === 'bibpay' || code === 'bibpay') {
                // Ensure ipWhitelist is configured for security
                if (!configObj.ipWhitelist || !Array.isArray(configObj.ipWhitelist) || configObj.ipWhitelist.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'BibPay requires ipWhitelist configuration. Provide array of BibPay IP addresses.',
                        example: { ipWhitelist: ['1.2.3.4', '5.6.7.8'] }
                    });
                }

                // Ensure apiKey is configured
                if (!configObj.apiKey || configObj.apiKey === 'CONFIGURE_ME') {
                    return res.status(400).json({
                        success: false,
                        message: 'BibPay requires apiKey configuration. Contact BibPay to get your API key.',
                        example: { apiKey: 'your_bibpay_api_key' }
                    });
                }

                // Validate IP addresses format (basic validation)
                const invalidIps = configObj.ipWhitelist.filter((ip: any) => {
                    if (typeof ip !== 'string') return true;
                    // Basic IP regex check (IPv4)
                    return !/^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
                });

                if (invalidIps.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid IP addresses: ${invalidIps.join(', ')}. Use format: xxx.xxx.xxx.xxx`,
                    });
                }

                console.log(`[Admin] Configuring BibPay with IPs: ${configObj.ipWhitelist.join(', ')}`);
            }

            const gateway = await prisma.paymentGateway.update({
                where: { id },
                data: {
                    name,
                    config: configString,
                    isActive: isActive !== undefined ? isActive : undefined
                }
            });

            return res.json({
                success: true,
                message: 'Gateway updated successfully',
                data: gateway
            });
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
            let configObj: any = config;

            if (typeof config === 'object') {
                configObj = config;
                configString = JSON.stringify(config);
            } else if (typeof config === 'string') {
                try {
                    configObj = JSON.parse(config);
                    configString = config;
                } catch (e) {
                    return res.status(400).json({ success: false, message: 'Invalid JSON config' });
                }
            }

            // Validate BibPay specific config requirements (same as updateGateway)
            if (code === 'bibpay') {
                const errors = [];

                // Check ipWhitelist
                if (!configObj.ipWhitelist) {
                    errors.push('ipWhitelist is missing');
                } else if (!Array.isArray(configObj.ipWhitelist)) {
                    errors.push('ipWhitelist must be an array, e.g. ["162.220.232.99"]');
                } else if (configObj.ipWhitelist.length === 0) {
                    errors.push('ipWhitelist cannot be empty. Add at least one IP address');
                } else {
                    // Validate IP format
                    const invalidIps = configObj.ipWhitelist.filter((ip: any) => {
                        if (typeof ip !== 'string') return true;
                        return !/^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
                    });
                    if (invalidIps.length > 0) {
                        errors.push(`Invalid IP format: ${invalidIps.join(', ')}. Use xxx.xxx.xxx.xxx`);
                    }
                }

                // Check apiKey
                if (!configObj.apiKey) {
                    errors.push('apiKey is missing. Get it from BibPay');
                } else if (configObj.apiKey === 'CONFIGURE_ME') {
                    errors.push('apiKey cannot be "CONFIGURE_ME". Get real key from BibPay');
                }

                // Return all errors together
                if (errors.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'BibPay configuration validation failed',
                        errors: errors,
                        exampleConfig: {
                            apiKey: 'your_real_api_key_from_bibpay',
                            ipWhitelist: ['162.220.232.99'],
                            canDeposit: true,
                            canWithdraw: true
                        }
                    });
                }

                console.log(`[Admin] Creating BibPay gateway with IPs: ${configObj.ipWhitelist.join(', ')}`);
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

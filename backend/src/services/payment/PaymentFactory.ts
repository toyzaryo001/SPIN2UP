import prisma from '../../lib/db';
import { IPaymentProvider } from './IPaymentProvider';
import { BibPayProvider } from './providers/BibPayProvider';

export class PaymentFactory {
    private static providerCache: Map<string, IPaymentProvider> = new Map();

    /**
     * Get a payment provider instance by its code
     * @param code Provider code (e.g., 'bibpay')
     */
    static async getProvider(code: string): Promise<IPaymentProvider | null> {
        // Fetch config from DB
        const gateway = await prisma.paymentGateway.findUnique({
            where: { code, isActive: true }
        });

        if (!gateway) {
            console.error(`Payment gateway ${code} not found or inactive`);
            return null;
        }

        let config = {};
        try {
            config = JSON.parse(gateway.config);
        } catch (e) {
            console.error(`Invalid config for gateway ${code}`, e);
            return null;
        }

        switch (code.toLowerCase()) {
            case 'bibpay':
                return new BibPayProvider(config);
            // Future providers:
            // case 'gbprime': return new GbPrimeProvider(config);
            // case 'scb': return new ScbProvider(config);
            default:
                console.error(`Provider implementation for ${code} not found`);
                return null;
        }
    }

    /**
     * Get the first active provider (for default auto-deposit)
     */
    static async getDefaultProvider(): Promise<IPaymentProvider | null> {
        const gateway = await prisma.paymentGateway.findFirst({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' }
        });

        if (!gateway) return null;
        return this.getProvider(gateway.code);
    }
}

import prisma from '../lib/db';

export interface CreateAlertInput {
    type: 'CRITICAL' | 'WARNING' | 'INFO';
    title: string;
    message: string;
    userId?: number;
    agentId?: number;
    transactionId?: number;
    actionUrl?: string;
    actionRequired?: boolean;
    metadata?: Record<string, any>;
}

/**
 * AlertService - Manages critical operational alerts
 *
 * Used for tracking critical failures that require immediate admin attention:
 * - Wallet swap refund failures
 * - Balance transfer failures
 * - Payment gateway integration issues
 * - Any critical business logic failures
 */
export class AlertService {
    /**
     * Create a new alert
     */
    static async createAlert(input: CreateAlertInput) {
        try {
            const alert = await prisma.alertLog.create({
                data: {
                    type: input.type,
                    title: input.title,
                    message: input.message,
                    userId: input.userId,
                    agentId: input.agentId,
                    transactionId: input.transactionId,
                    actionUrl: input.actionUrl,
                    actionRequired: input.actionRequired ?? true,
                    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
                    status: 'PENDING_REVIEW',
                    createdAt: new Date()
                }
            });

            // Log creation
            console.log(`[Alert] ${input.type}: ${input.title} (ID: ${alert.id})`);

            return alert;
        } catch (error) {
            console.error('[AlertService] Error creating alert:', error);
            throw error;
        }
    }

    /**
     * Get all unresolved alerts that require action
     */
    static async getRequiredAlerts(limit: number = 50) {
        try {
            const alerts = await prisma.alertLog.findMany({
                where: {
                    actionRequired: true,
                    status: {
                        not: 'RESOLVED' // Find PENDING_REVIEW and ACKNOWLEDGED
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: limit
            });

            return alerts;
        } catch (error) {
            console.error('[AlertService] Error fetching required alerts:', error);
            throw error;
        }
    }

    /**
     * Get alerts by type
     */
    static async getAlertsByType(type: 'CRITICAL' | 'WARNING' | 'INFO', limit: number = 50) {
        try {
            const alerts = await prisma.alertLog.findMany({
                where: { type },
                orderBy: { createdAt: 'desc' },
                take: limit
            });

            return alerts;
        } catch (error) {
            console.error('[AlertService] Error fetching alerts by type:', error);
            throw error;
        }
    }

    /**
     * Get all CRITICAL alerts
     */
    static async getCriticalAlerts(limit: number = 20) {
        return this.getAlertsByType('CRITICAL', limit);
    }

    /**
     * Get alerts for a specific user
     */
    static async getAlertsForUser(userId: number, limit: number = 50) {
        try {
            const alerts = await prisma.alertLog.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit
            });

            return alerts;
        } catch (error) {
            console.error('[AlertService] Error fetching user alerts:', error);
            throw error;
        }
    }

    /**
     * Mark alert as acknowledged (assigned to admin)
     */
    static async acknowledgeAlert(alertId: number, adminId: number) {
        try {
            const alert = await prisma.alertLog.update({
                where: { id: alertId },
                data: {
                    status: 'ACKNOWLEDGED',
                    assignedTo: adminId,
                    updatedAt: new Date()
                }
            });

            console.log(`[Alert] Acknowledged by admin ${adminId}: Alert #${alertId}`);
            return alert;
        } catch (error) {
            console.error('[AlertService] Error acknowledging alert:', error);
            throw error;
        }
    }

    /**
     * Resolve an alert
     */
    static async resolveAlert(alertId: number, resolution?: string) {
        try {
            const alert = await prisma.alertLog.update({
                where: { id: alertId },
                data: {
                    status: 'RESOLVED',
                    resolvedAt: new Date(),
                    metadata: resolution
                        ? JSON.stringify({ resolution, resolvedAt: new Date().toISOString() })
                        : null,
                    updatedAt: new Date()
                }
            });

            console.log(`[Alert] Resolved: Alert #${alertId}`);
            return alert;
        } catch (error) {
            console.error('[AlertService] Error resolving alert:', error);
            throw error;
        }
    }

    /**
     * Get alert statistics
     */
    static async getAlertStats() {
        try {
            const total = await prisma.alertLog.count();
            const critical = await prisma.alertLog.count({
                where: { type: 'CRITICAL' }
            });
            const pending = await prisma.alertLog.count({
                where: { status: { not: 'RESOLVED' } }
            });
            const actionRequired = await prisma.alertLog.count({
                where: {
                    actionRequired: true,
                    status: { not: 'RESOLVED' }
                }
            });

            return {
                total,
                critical,
                pending,
                actionRequired
            };
        } catch (error) {
            console.error('[AlertService] Error fetching alert stats:', error);
            throw error;
        }
    }
}

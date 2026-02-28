import { Router, Request, Response } from 'express';
import { AlertService } from '../../services/alert.service';
import { adminMiddleware } from '../../middlewares/auth.middleware';

const router = Router();

// Apply admin middleware to all routes
router.use(adminMiddleware);

/**
 * GET /api/admin/alerts
 * Get alerts with optional filtering
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { type, status, userId, limit = '50' } = req.query;

        let alerts;

        if (type === 'CRITICAL') {
            alerts = await AlertService.getCriticalAlerts(parseInt(limit as string));
        } else if (userId) {
            alerts = await AlertService.getAlertsForUser(
                parseInt(userId as string),
                parseInt(limit as string)
            );
        } else {
            // Get all required alerts by default
            alerts = await AlertService.getRequiredAlerts(parseInt(limit as string));
        }

        // Parse metadata for each alert
        const parsedAlerts = alerts.map(alert => ({
            ...alert,
            metadata: alert.metadata ? JSON.parse(alert.metadata) : null
        }));

        return res.json({
            success: true,
            data: parsedAlerts,
            count: parsedAlerts.length
        });
    } catch (error: any) {
        console.error('Failed to fetch alerts:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/admin/alerts/stats
 * Get alert statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const stats = await AlertService.getAlertStats();

        return res.json({
            success: true,
            data: stats
        });
    } catch (error: any) {
        console.error('Failed to fetch alert stats:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * PATCH /api/admin/alerts/:id/acknowledge
 * Mark alert as acknowledged by admin
 */
router.patch('/:id/acknowledge', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const adminId = (req as any).user?.userId; // From auth middleware

        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        const alert = await AlertService.acknowledgeAlert(
            parseInt(id),
            adminId
        );

        return res.json({
            success: true,
            data: alert
        });
    } catch (error: any) {
        console.error('Failed to acknowledge alert:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * PATCH /api/admin/alerts/:id/resolve
 * Resolve an alert
 */
router.patch('/:id/resolve', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { resolution } = req.body;

        const alert = await AlertService.resolveAlert(
            parseInt(id),
            resolution
        );

        return res.json({
            success: true,
            data: alert
        });
    } catch (error: any) {
        console.error('Failed to resolve alert:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * GET /api/admin/alerts/:id
 * Get a specific alert by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const alert = await (await import('../../lib/db')).default.alertLog.findUnique({
            where: { id: parseInt(id) }
        });

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found'
            });
        }

        return res.json({
            success: true,
            data: {
                ...alert,
                metadata: alert.metadata ? JSON.parse(alert.metadata) : null
            }
        });
    } catch (error: any) {
        console.error('Failed to fetch alert:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export default router;

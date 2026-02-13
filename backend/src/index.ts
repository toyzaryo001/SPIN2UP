import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './lib/db.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import gameRoutes from './routes/game.routes.js';
import adminRoutes from './routes/admin/index.js';
import staffRoutes from './routes/staff.routes.js';
import publicRoutes from './routes/public.routes.js';
import superAdminRoutes from './routes/super-admin/index.js';
import adminRewardRoutes from './routes/admin/reward.routes.js';
import smsWebhookRoutes from './routes/sms-webhook.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import { initJwtSecret } from './utils/jwt.js';

dotenv.config();

// ... existing code ...

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/admin/rewards', adminRewardRoutes);
app.use('/api/notify', smsWebhookRoutes);
app.use('/api/payment', paymentRoutes); // New Payment API
app.use('/api/webhooks', webhookRoutes); // New Webhook API

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// DB diagnostic check — tests actual PostgreSQL connectivity
app.get('/api/db-check', async (req, res) => {
    try {
        const result = await prisma.$queryRaw`SELECT 1 as ok`;
        const userCount = await prisma.user.count();
        res.json({
            status: 'connected',
            database: 'OK',
            userCount,
            dbUrl: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 30)}...` : 'NOT SET',
            superDbUrl: process.env.SUPER_DATABASE_URL ? `${process.env.SUPER_DATABASE_URL.substring(0, 30)}...` : 'NOT SET',
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'disconnected',
            database: 'ERROR',
            error: error.message,
            code: error.code,
            dbUrl: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 30)}...` : 'NOT SET',
            superDbUrl: process.env.SUPER_DATABASE_URL ? `${process.env.SUPER_DATABASE_URL.substring(0, 30)}...` : 'NOT SET',
            timestamp: new Date().toISOString()
        });
    }
});

// Root Health Check (for Railway/Load Balancers default check)
app.get('/', (req, res) => {
    res.send('OK');
});

// Server info (IP check)
app.get('/api/server-info', (req, res) => {
    res.json({
        serverTime: new Date().toISOString(),
        clientIP: req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress,
        host: req.headers.host,
        environment: process.env.RAILWAY_ENVIRONMENT || 'local'
    });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`Health check available at http://0.0.0.0:${PORT}/api/health`);
});

export default app;

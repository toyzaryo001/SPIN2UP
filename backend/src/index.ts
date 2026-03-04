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
import truewalletWebhookRoutes from './routes/truewallet-webhook.routes.js';
import { initJwtSecret } from './utils/jwt.js';
import { BetLogSyncService } from './services/bet-log-sync.service.js';

dotenv.config();

// Initialize Express
const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// Trust proxy — จำเป็นสำหรับ Railway/reverse proxy (ตาม reference gateway)
app.set('trust proxy', true);


// =============================================
// Webhook routes — ต้องอยู่ก่อน CORS middleware
// เพราะ webhook มาจาก mobile app/server ไม่ใช่ browser
// =============================================
app.use('/api/webhooks/truewallet', (req, res, next) => {
    console.log(`[TrueWallet Webhook Request] ${req.method} ${req.originalUrl} from ${req.ip}`);
    console.log(`[TrueWallet Webhook Request] Headers:`, JSON.stringify(req.headers));
    next();
}, truewalletWebhookRoutes);

// Middleware
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];

app.use(cors({
    origin: (origin, callback) => {
        // อนุญาต request ที่ไม่มี origin (Postman, cURL, mobile app)
        if (!origin) return callback(null, true);

        // อนุญาต origin ที่กำหนดใน environment variables
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            return callback(null, true);
        }

        console.warn(`[CORS Blocked] Origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(500).json({
            status: 'disconnected',
            database: 'ERROR',
            error: error.message,
            code: error.code,
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

// Initialize JWT Secret แล้วค่อย start server
initJwtSecret().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`Health check available at http://0.0.0.0:${PORT}/api/health`);
    });
}).catch(err => {
    console.error('❌ Failed to initialize JWT secret:', err);
    process.exit(1);
});

export default app;

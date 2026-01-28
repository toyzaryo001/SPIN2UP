import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import gameRoutes from './routes/game.routes.js';
import adminRoutes from './routes/admin/index.js';
import staffRoutes from './routes/staff.routes.js';
import publicRoutes from './routes/public.routes.js';
import superAdminRoutes from './routes/super-admin/index.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware - CORS with explicit origins (including LAN IP for mobile testing)
app.use(cors({
    origin: [
        // Development
        'http://localhost:3000',
        'http://localhost:3002',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3002',
        'http://192.168.100.118:3000',
        'http://192.168.100.118:3002',
        // Production - Railway domains
        /\.railway\.app$/,
        /\.vercel\.app$/,
        // Custom Domains - playnex89
        'https://admin.playnex89.com',
        'https://www.playnex89.com',
        'https://playnex89.com',
        // Custom Domains - check24m
        'https://admin.check24m.com',
        'https://www.check24m.com',
        'https://check24m.com',
        // Allow any HTTPS origin (customize for production)
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/super-admin', superAdminRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
});

export default app;

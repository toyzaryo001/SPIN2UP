import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prefixRoutes from './routes/prefix.routes.js';
import authRoutes from './routes/auth.routes.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3003', 10);

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3004',
        /\.railway\.app$/,
        /\.vercel\.app$/,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/prefixes', prefixRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'super-backend', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Super Backend running on port ${PORT}`);
    console.log(`📊 Connected to MASTER_DB`);
});

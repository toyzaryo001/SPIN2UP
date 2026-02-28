"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const prefix_routes_js_1 = __importDefault(require("./routes/prefix.routes.js"));
const auth_routes_js_1 = __importDefault(require("./routes/auth.routes.js"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3003', 10);
// Middleware
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:3000',
        'http://localhost:3004',
        'https://super.check24m.com',
        /\.railway\.app$/,
        /\.vercel\.app$/,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
// API Routes
app.use('/api/auth', auth_routes_js_1.default);
app.use('/api/prefixes', prefix_routes_js_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'super-backend', timestamp: new Date().toISOString() });
});
// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Super Backend running on port ${PORT}`);
    console.log(`📊 Connected to MASTER_DB`);
});

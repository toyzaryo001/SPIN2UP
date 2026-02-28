"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySuperAdmin = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_js_1 = __importDefault(require("../lib/db.js"));
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';
// Middleware to verify Super Admin
const verifySuperAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'ไม่พบ token' });
        }
        const token = authHeader.substring(7);
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (decoded.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ Super Admin' });
        }
        req.superAdmin = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({ success: false, message: 'Token ไม่ถูกต้อง' });
    }
};
exports.verifySuperAdmin = verifySuperAdmin;
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
        }
        const admin = await db_js_1.default.superAdmin.findUnique({
            where: { username }
        });
        if (!admin || !admin.isActive) {
            return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }
        const isValid = await bcryptjs_1.default.compare(password, admin.password);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }
        // Update last login
        await db_js_1.default.superAdmin.update({
            where: { id: admin.id },
            data: { lastLoginAt: new Date() }
        });
        // Log login
        await db_js_1.default.superAdminLog.create({
            data: {
                superAdminId: admin.id,
                action: 'LOGIN',
                ip: req.ip || req.headers['x-forwarded-for']
            }
        });
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({
            userId: admin.id,
            username: admin.username,
            role: 'SUPER_ADMIN'
        }, JWT_SECRET, { expiresIn: '24h' });
        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: admin.id,
                    username: admin.username,
                    fullName: admin.fullName,
                    email: admin.email
                }
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});
// GET /api/auth/me
router.get('/me', exports.verifySuperAdmin, async (req, res) => {
    try {
        const decoded = req.superAdmin;
        const admin = await db_js_1.default.superAdmin.findUnique({
            where: { id: decoded.userId }
        });
        if (!admin) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
        }
        res.json({
            success: true,
            data: {
                id: admin.id,
                username: admin.username,
                fullName: admin.fullName,
                email: admin.email
            }
        });
    }
    catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});
// POST /api/auth/setup - Create first Super Admin (one-time use)
router.post('/setup', async (req, res) => {
    try {
        // Check if any super admin exists
        const existingAdmin = await db_js_1.default.superAdmin.findFirst();
        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: 'Super Admin already exists. Cannot setup again.'
            });
        }
        const { username, password, fullName, email } = req.body;
        if (!username || !password || !fullName) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const admin = await db_js_1.default.superAdmin.create({
            data: {
                username,
                password: hashedPassword,
                fullName,
                email,
                isActive: true
            }
        });
        res.status(201).json({
            success: true,
            message: 'Super Admin created successfully!',
            data: {
                id: admin.id,
                username: admin.username,
                fullName: admin.fullName
            }
        });
    }
    catch (error) {
        console.error('Setup error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});
exports.default = router;

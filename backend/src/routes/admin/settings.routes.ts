import { Router } from 'express';
import prisma from '../../lib/db.js';
import { AuthRequest, requirePermission } from '../../middlewares/auth.middleware.js';

const router = Router();

// GET /api/admin/settings - ดูตั้งค่าทั้งหมด (ต้องมีสิทธิ์ดู)
router.get('/', requirePermission('settings', 'view'), async (req, res) => {
    try {
        const settings = await prisma.setting.findMany();
        const settingsMap: Record<string, string> = {};
        settings.forEach((s: { key: string; value: string }) => {
            settingsMap[s.key] = s.value;
        });

        res.json({ success: true, data: settingsMap });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/admin/settings - อัปเดตตั้งค่า (ต้องมีสิทธิ์แก้ไข)
router.put('/', requirePermission('settings', 'edit'), async (req: AuthRequest, res) => {
    try {
        const settings = req.body; // { key1: value1, key2: value2, ... }

        for (const [key, value] of Object.entries(settings)) {
            await prisma.setting.upsert({
                where: { key },
                update: { value: String(value) },
                create: { key, value: String(value) },
            });
        }

        res.json({ success: true, message: 'บันทึกการตั้งค่าสำเร็จ' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === Bank Accounts ===

// GET /api/admin/settings/banks (ต้องมีสิทธิ์ดู)
router.get('/banks', requirePermission('settings', 'view'), async (req, res) => {
    try {
        const banks = await prisma.bankAccount.findMany({ orderBy: { createdAt: 'desc' } });
        res.json({ success: true, data: banks });
    } catch (error) {
        console.error('Get banks error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/settings/banks (ต้องมีสิทธิ์แก้ไข)
router.post('/banks', requirePermission('settings', 'edit'), async (req, res) => {
    try {
        const { bankName, accountNumber, accountName, type, balance } = req.body;

        const bank = await prisma.bankAccount.create({
            data: {
                bankName,
                accountNumber,
                accountName,
                type: type || 'deposit',
                balance: balance || 0
            },
        });

        res.status(201).json({ success: true, data: bank });
    } catch (error) {
        console.error('Create bank error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/admin/settings/banks/:id (ต้องมีสิทธิ์ settings.banks)
router.put('/banks/:id', requirePermission('settings', 'banks'), async (req, res) => {
    try {
        const { bankName, accountNumber, accountName, type, isActive, balance } = req.body;

        const bank = await prisma.bankAccount.update({
            where: { id: Number(req.params.id) },
            data: { bankName, accountNumber, accountName, type, isActive, balance },
        });

        res.json({ success: true, data: bank });
    } catch (error) {
        console.error('Update bank error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// DELETE /api/admin/settings/banks/:id (ต้องมีสิทธิ์ settings.banks)
router.delete('/banks/:id', requirePermission('settings', 'banks'), async (req, res) => {
    try {
        await prisma.bankAccount.delete({ where: { id: Number(req.params.id) } });
        res.json({ success: true, message: 'ลบสำเร็จ' });
    } catch (error) {
        console.error('Delete bank error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === Agent Config ===

// GET /api/admin/settings/agent (ต้องมีสิทธิ์ settings.agents)
router.get('/agent', requirePermission('settings', 'agents'), async (req, res) => {
    try {
        const configs = await prisma.agentConfig.findMany();
        res.json({ success: true, data: configs });
    } catch (error) {
        console.error('Get agent config error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/settings/agent (ต้องมีสิทธิ์ settings.agents)
router.post('/agent', requirePermission('settings', 'agents'), async (req, res) => {
    try {
        const { name, apiKey, apiSecret, callbackUrl, rtp, minBet, maxBet, upline, xApiKey, xApiCat, gameEntrance } = req.body;

        const config = await prisma.agentConfig.create({
            data: { name, apiKey, apiSecret, callbackUrl, rtp: rtp || 0.96, minBet, maxBet, upline, xApiKey, xApiCat, gameEntrance },
        });

        res.status(201).json({ success: true, data: config });
    } catch (error) {
        console.error('Create agent config error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/admin/settings/agent/:id (ต้องมีสิทธิ์ settings.agents)
router.put('/agent/:id', requirePermission('settings', 'agents'), async (req, res) => {
    try {
        const config = await prisma.agentConfig.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });

        res.json({ success: true, data: config });
    } catch (error) {
        console.error('Update agent config error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === TrueMoney Wallet ===

// GET /api/admin/settings/truemoney (ต้องมีสิทธิ์ settings.truemoney)
router.get('/truemoney', requirePermission('settings', 'truemoney'), async (req, res) => {
    try {
        const wallets = await prisma.trueMoneyWallet.findMany({ orderBy: { createdAt: 'desc' } });
        res.json({ success: true, data: wallets });
    } catch (error) {
        console.error('Get truemoney error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/settings/truemoney (ต้องมีสิทธิ์ settings.truemoney)
router.post('/truemoney', requirePermission('settings', 'truemoney'), async (req, res) => {
    try {
        const { phoneNumber, accountName, isActive } = req.body;

        const wallet = await prisma.trueMoneyWallet.create({
            data: { phoneNumber, accountName, isActive: isActive ?? true },
        });

        res.status(201).json({ success: true, data: wallet });
    } catch (error) {
        console.error('Create truemoney error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/admin/settings/truemoney/:id (ต้องมีสิทธิ์ settings.truemoney)
router.put('/truemoney/:id', requirePermission('settings', 'truemoney'), async (req, res) => {
    try {
        const wallet = await prisma.trueMoneyWallet.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });

        res.json({ success: true, data: wallet });
    } catch (error) {
        console.error('Update truemoney error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// DELETE /api/admin/settings/truemoney/:id (ต้องมีสิทธิ์ settings.truemoney)
router.delete('/truemoney/:id', requirePermission('settings', 'truemoney'), async (req, res) => {
    try {
        await prisma.trueMoneyWallet.delete({ where: { id: Number(req.params.id) } });
        res.json({ success: true, message: 'ลบสำเร็จ' });
    } catch (error) {
        console.error('Delete truemoney error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === Site Features (เปิด/ปิดฟีเจอร์) ===

// GET /api/admin/settings/features (ต้องมีสิทธิ์ดู)
router.get('/features', requirePermission('settings', 'view'), async (req, res) => {
    try {
        const features = await prisma.siteFeature.findMany({ orderBy: { key: 'asc' } });
        res.json({ success: true, data: features });
    } catch (error) {
        console.error('Get features error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/settings/features/init - สร้าง default features (ต้องมีสิทธิ์เปิด/ปิดฟีเจอร์)
router.post('/features/init', requirePermission('settings', 'features'), async (req: AuthRequest, res) => {
    try {
        const defaultFeatures = [
            { key: 'registration', name: 'สมัครสมาชิก', description: 'อนุญาตให้ผู้ใช้สมัครสมาชิกใหม่' },
            { key: 'deposit', name: 'ฝากเงิน', description: 'อนุญาตให้ผู้ใช้ฝากเงิน' },
            { key: 'withdraw', name: 'ถอนเงิน', description: 'อนุญาตให้ผู้ใช้ถอนเงิน' },
            { key: 'promotions', name: 'โปรโมชั่น', description: 'แสดงโปรโมชั่นในหน้าผู้เล่น' },
            { key: 'referral', name: 'แนะนำเพื่อน', description: 'อนุญาตให้ใช้ระบบแนะนำเพื่อน' },
            { key: 'cashback', name: 'ยอดเสีย', description: 'อนุญาตให้รับยอดเสียคืน' },
            { key: 'vip', name: 'VIP/แร้งก์', description: 'แสดงระบบ VIP และแร้งก์' },
            { key: 'streak', name: 'ฝากต่อเนื่อง', description: 'อนุญาตให้ใช้ระบบฝากต่อเนื่อง' },
            { key: 'games', name: 'เกม', description: 'แสดงรายการเกมในหน้าผู้เล่น' },
            { key: 'maintenance', name: 'โหมดซ่อมบำรุง', description: 'ปิดเว็บชั่วคราว (แสดงหน้า maintenance)' },
        ];

        for (const feature of defaultFeatures) {
            await prisma.siteFeature.upsert({
                where: { key: feature.key },
                update: {},
                create: { ...feature, isEnabled: feature.key !== 'maintenance' },
            });
        }

        const features = await prisma.siteFeature.findMany({ orderBy: { key: 'asc' } });
        res.json({ success: true, message: 'สร้าง features เริ่มต้นสำเร็จ', data: features });
    } catch (error) {
        console.error('Init features error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/admin/settings/features/:key - อัปเดต feature (ต้องมีสิทธิ์เปิด/ปิดฟีเจอร์)
router.put('/features/:key', requirePermission('settings', 'features'), async (req: AuthRequest, res) => {
    try {
        const { isEnabled } = req.body;
        const feature = await prisma.siteFeature.update({
            where: { key: req.params.key },
            data: { isEnabled, updatedBy: req.user?.userId },
        });
        res.json({ success: true, data: feature });
    } catch (error) {
        console.error('Update feature error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === Contact Channels ===

// GET /api/admin/settings/contacts - รายการช่องทางติดต่อ
router.get('/contacts', requirePermission('settings', 'view'), async (req, res) => {
    try {
        const contacts = await prisma.contactChannel.findMany({ orderBy: { sortOrder: 'asc' } });
        res.json({ success: true, data: contacts });
    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/settings/contacts - เพิ่มช่องทางติดต่อ
router.post('/contacts', requirePermission('settings', 'edit'), async (req, res) => {
    try {
        const { type, name, url, icon } = req.body;
        const contact = await prisma.contactChannel.create({
            data: { type, name, url, icon },
        });
        res.status(201).json({ success: true, data: contact });
    } catch (error) {
        console.error('Create contact error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/admin/settings/contacts/:id - แก้ไขช่องทางติดต่อ
router.put('/contacts/:id', requirePermission('settings', 'edit'), async (req, res) => {
    try {
        const { type, name, url, icon, isActive, sortOrder } = req.body;
        const contact = await prisma.contactChannel.update({
            where: { id: Number(req.params.id) },
            data: { type, name, url, icon, isActive, sortOrder },
        });
        res.json({ success: true, data: contact });
    } catch (error) {
        console.error('Update contact error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// DELETE /api/admin/settings/contacts/:id - ลบช่องทางติดต่อ
router.delete('/contacts/:id', requirePermission('settings', 'edit'), async (req, res) => {
    try {
        await prisma.contactChannel.delete({ where: { id: Number(req.params.id) } });
        res.json({ success: true, message: 'ลบช่องทางติดต่อสำเร็จ' });
    } catch (error) {
        console.error('Delete contact error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

export default router;

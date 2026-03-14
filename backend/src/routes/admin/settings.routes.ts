import { Router } from 'express';
import prisma from '../../lib/db.js';
import { AuthRequest, requirePermission } from '../../middlewares/auth.middleware.js';
import { clearJwtSecretCache } from '../../utils/jwt.js';

const router = Router();

function maskJwtSecret(secret: string | null | undefined) {
    if (!secret) return null;
    return `${secret.slice(0, 6)}***`;
}

function isMaskedJwtSecret(secret: unknown) {
    return typeof secret === 'string' && secret.includes('***');
}

// GET /api/admin/settings - ดูตั้งค่าทั้งหมด (ต้องมีสิทธิ์ดู)
router.get('/', requirePermission('settings', 'general', 'view'), async (req, res) => {
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
router.put('/', requirePermission('settings', 'general', 'manage'), async (req: AuthRequest, res) => {
    try {
        const settings = req.body; // { key1: value1, key2: value2, ... }

        for (const [key, value] of Object.entries(settings)) {
            await prisma.setting.upsert({
                where: { key },
                update: { value: String(value) },
                create: { key, value: String(value) },
            });
        }

        // Clear JWT cache if jwtSecret was updated
        if (settings.jwtSecret) {
            clearJwtSecretCache();
            console.log('[Settings] JWT secret updated, cache cleared');
        }

        res.json({ success: true, message: 'บันทึกการตั้งค่าสำเร็จ' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === Bank Accounts ===

// GET /api/admin/settings/banks (ต้องมีสิทธิ์ดู)
router.get('/banks', requirePermission('settings', 'banks', 'view'), async (req, res) => {
    try {
        const banks = await prisma.bankAccount.findMany({ orderBy: { createdAt: 'desc' } });
        res.json({ success: true, data: banks });
    } catch (error) {
        console.error('Get banks error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/settings/banks (ต้องมีสิทธิ์แก้ไข)
router.post('/banks', requirePermission('settings', 'banks', 'manage'), async (req, res) => {
    try {
        const { bankName, accountNumber, accountName, type, minDeposit } = req.body;

        const bank = await prisma.bankAccount.create({
            data: {
                bankName,
                accountNumber,
                accountName,
                type: type || 'deposit',
                minDeposit: minDeposit || 0
            },
        });

        res.status(201).json({ success: true, data: bank });
    } catch (error) {
        console.error('Create bank error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/admin/settings/banks/:id (ต้องมีสิทธิ์ settings.banks)
router.put('/banks/:id', requirePermission('settings', 'banks', 'manage'), async (req, res) => {
    try {
        const { bankName, accountNumber, accountName, type, isActive, isShow, minDeposit } = req.body;

        const updateData: any = {
            bankName,
            accountNumber,
            accountName,
            type,
            ...(isActive !== undefined && { isActive }),
            ...(isShow !== undefined && { isShow }),
            ...(minDeposit !== undefined && { minDeposit: Number(minDeposit) })
        };

        const bank = await prisma.bankAccount.update({
            where: { id: Number(req.params.id) },
            data: updateData,
        });

        res.json({ success: true, data: bank });
    } catch (error) {
        console.error('Update bank error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// DELETE /api/admin/settings/banks/:id (ต้องมีสิทธิ์ settings.banks)
router.delete('/banks/:id', requirePermission('settings', 'banks', 'manage'), async (req, res) => {
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
router.get('/agent', requirePermission('agents', 'settings', 'view'), async (req, res) => {
    try {
        const configs = await prisma.agentConfig.findMany();
        res.json({ success: true, data: configs });
    } catch (error) {
        console.error('Get agent config error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/admin/settings/agent/:id (ต้องมีสิทธิ์ settings.agents)
router.get('/agent/:id', requirePermission('agents', 'settings', 'view'), async (req, res) => {
    try {
        const config = await prisma.agentConfig.findUnique({
            where: { id: Number(req.params.id) }
        });
        if (!config) return res.status(404).json({ success: false, message: 'ไม่พบ Agent' });
        res.json({ success: true, data: config });
    } catch (error) {
        console.error('Get agent detail error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/settings/agent (ต้องมีสิทธิ์ settings.agents)
router.post('/agent', requirePermission('agents', 'settings', 'manage'), async (req, res) => {
    try {
        const { name, apiKey, apiSecret, callbackUrl, rtp, minBet, maxBet, upline, xApiKey, xApiCat, gameEntrance, code, isMain, isActive } = req.body;

        // Validation for unique code is handled by DB, but we can check early if needed
        const config = await prisma.$transaction(async (tx) => {
            if (isMain === true) {
                await tx.agentConfig.updateMany({
                    where: { isMain: true },
                    data: { isMain: false },
                });
            }

            return tx.agentConfig.create({
                data: {
                    name,
                    apiKey,
                    apiSecret,
                    callbackUrl,
                    rtp: rtp ? Number(rtp) : 0.96,
                    minBet: minBet ? Number(minBet) : 1,
                    maxBet: maxBet ? Number(maxBet) : 10000,
                    upline,
                    xApiKey,
                    xApiCat,
                    gameEntrance,
                    code: code ? code.toUpperCase() : 'BETFLIX', // Default to BETFLIX if not provided
                    isMain: isMain ?? false,
                    isActive: isActive ?? true
                },
            });
        });

        const { AgentFactory } = await import('../../services/agents/AgentFactory.js');
        AgentFactory.clearCache();

        res.status(201).json({ success: true, data: config });
    } catch (error: any) {
        console.error('Create agent config error:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ success: false, message: 'Agent Code นี้มีอยู่ในระบบแล้ว' });
        }
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/admin/settings/agent/:id (ต้องมีสิทธิ์ settings.agents)
router.put('/agent/:id', requirePermission('agents', 'settings', 'manage'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, apiKey, apiSecret, callbackUrl, rtp, minBet, maxBet, upline, xApiKey, xApiCat, gameEntrance, code, isMain, isActive } = req.body;

        const config = await prisma.$transaction(async (tx) => {
            if (isMain === true) {
                await tx.agentConfig.updateMany({
                    where: {
                        id: { not: Number(id) },
                        isMain: true,
                    },
                    data: { isMain: false },
                });
            }

            return tx.agentConfig.update({
                where: { id: Number(id) },
                data: {
                    name,
                    apiKey,
                    apiSecret,
                    callbackUrl,
                    rtp: rtp ? Number(rtp) : undefined,
                    minBet: minBet ? Number(minBet) : undefined,
                    maxBet: maxBet ? Number(maxBet) : undefined,
                    upline,
                    xApiKey,
                    xApiCat,
                    gameEntrance,
                    code: code ? code.toUpperCase() : undefined,
                    isMain,
                    isActive
                },
            });
        });

        // Clear Agent Factory Cache to apply new settings immediately
        const { AgentFactory } = await import('../../services/agents/AgentFactory.js');
        AgentFactory.clearCache();

        res.json({ success: true, data: config });
    } catch (error: any) {
        console.error('Update agent config error:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ success: false, message: 'Agent Code นี้มีอยู่ในระบบแล้ว' });
        }
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === TrueMoney Wallet ===

// GET /api/admin/settings/truemoney (ต้องมีสิทธิ์ settings.truemoney)
router.get('/truemoney', requirePermission('settings', 'truemoney', 'view'), async (req, res) => {
    try {
        const wallets = await prisma.trueMoneyWallet.findMany({ orderBy: { createdAt: 'desc' } });
        // Mask jwtSecret สำหรับ display (แสดง 6 ตัวแรก + ***)
        const masked = wallets.map(({ jwtSecret, ...wallet }) => ({
            ...wallet,
            jwtSecret: maskJwtSecret(jwtSecret),
            maskedJwtSecret: maskJwtSecret(jwtSecret),
            hasSecret: !!jwtSecret,
            webhookUrl: `https://${req.get('host')}/api/webhooks/truewallet`,
        }));
        res.json({ success: true, data: masked });
    } catch (error) {
        console.error('Get truemoney error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/settings/truemoney (ต้องมีสิทธิ์ settings.truemoney)
router.post('/truemoney', requirePermission('settings', 'truemoney', 'manage'), async (req, res) => {
    try {
        const { phoneNumber, accountName, jwtSecret, isActive, isShow, minDeposit } = req.body;
        const normalizedSecret = typeof jwtSecret === 'string' ? jwtSecret.trim() : '';

        const wallet = await prisma.trueMoneyWallet.create({
            data: {
                phoneNumber,
                accountName,
                jwtSecret: normalizedSecret || null,
                isActive: isActive ?? true,
                isShow: isShow ?? true,
                minDeposit: minDeposit ? Number(minDeposit) : 0
            },
        });
        res.status(201).json({ success: true, data: wallet });
    } catch (error) {
        console.error('Create truemoney error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// PUT /api/admin/settings/truemoney/:id (ต้องมีสิทธิ์ settings.truemoney)
router.put('/truemoney/:id', requirePermission('settings', 'truemoney', 'manage'), async (req, res) => {
    try {
        const { phoneNumber, accountName, jwtSecret, isActive, isShow, minDeposit } = req.body;
        const updateData: any = {};
        if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
        if (accountName !== undefined) updateData.accountName = accountName;
        if (jwtSecret === null) {
            updateData.jwtSecret = null;
        } else if (typeof jwtSecret === 'string') {
            const normalizedSecret = jwtSecret.trim();
            if (normalizedSecret && !isMaskedJwtSecret(normalizedSecret)) {
                updateData.jwtSecret = normalizedSecret;
            } else if (isMaskedJwtSecret(normalizedSecret)) {
                console.warn(`[TrueMoney Settings] Ignored masked jwtSecret update for wallet ${req.params.id}`);
            }
        }
        if (isActive !== undefined) updateData.isActive = isActive;
        if (isShow !== undefined) updateData.isShow = isShow;
        if (minDeposit !== undefined) updateData.minDeposit = minDeposit;

        const wallet = await prisma.trueMoneyWallet.update({
            where: { id: Number(req.params.id) },
            data: updateData,
        });

        res.json({ success: true, data: wallet });
    } catch (error) {
        console.error('Update truemoney error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// DELETE /api/admin/settings/truemoney/:id (ต้องมีสิทธิ์ settings.truemoney)
router.delete('/truemoney/:id', requirePermission('settings', 'truemoney', 'manage'), async (req, res) => {
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
router.get('/features', requirePermission('settings', 'features', 'view'), async (req, res) => {
    try {
        const features = await prisma.siteFeature.findMany({ orderBy: { key: 'asc' } });
        res.json({ success: true, data: features });
    } catch (error) {
        console.error('Get features error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/settings/features/init - สร้าง default features (ต้องมีสิทธิ์เปิด/ปิดฟีเจอร์)
router.post('/features/init', requirePermission('settings', 'features', 'manage'), async (req: AuthRequest, res) => {
    try {
        const defaultFeatures = [
            { key: 'registration', name: 'สมัครสมาชิก', description: 'อนุญาตให้ผู้ใช้สมัครสมาชิกใหม่' },
            { key: 'deposit', name: 'ฝากเงิน', description: 'อนุญาตให้ผู้ใช้ฝากเงิน' },
            { key: 'withdraw', name: 'ถอนเงิน', description: 'อนุญาตให้ผู้ใช้ถอนเงิน' },
            { key: 'auto_deposit', name: 'ระบบฝากออโต้', description: 'สร้าง QR Code ฝากเงินอัตโนมัติ (ปิด = ซ่อน PromptPay)' },
            { key: 'auto_withdraw', name: 'ระบบถอนออโต้', description: 'ถอนเงินผ่าน API อัตโนมัติ (ปิด = ต้องอนุมัติมือ)' },
            { key: 'promotions', name: 'โปรโมชั่น', description: 'แสดงโปรโมชั่นในหน้าผู้เล่น' },
            { key: 'referral', name: 'แนะนำเพื่อน', description: 'อนุญาตให้ใช้ระบบแนะนำเพื่อน' },
            { key: 'cashback', name: 'ยอดเสีย', description: 'อนุญาตให้รับยอดเสียคืน' },
            { key: 'vip', name: 'VIP/แร้งก์', description: 'แสดงระบบ VIP และแร้งก์' },
            { key: 'streak', name: 'ฝากต่อเนื่อง', description: 'อนุญาตให้ใช้ระบบฝากต่อเนื่อง' },
            { key: 'games', name: 'เกม', description: 'แสดงรายการเกมในหน้าผู้เล่น' },
            { key: 'manual_deposit', name: 'ฝากเงินมือ (Manual)', description: 'แสดงเลขบัญชีให้ลูกค้าโอนและแจ้งสลิป (กรณีออโต้ปิด)' },
            { key: 'deposit_bank', name: 'ช่องทาง: ธนาคาร', description: 'แสดงตัวเลือกฝากผ่านบัญชีธนาคาร' },
            { key: 'deposit_truemoney', name: 'ช่องทาง: TrueMoney', description: 'แสดงตัวเลือกฝากผ่าน TrueMoney Wallet' },
            { key: 'deposit_promptpay', name: 'ช่องทาง: PromptPay', description: 'แสดงตัวเลือกฝากผ่าน PromptPay QR Code' },
            { key: 'ranking_board', name: 'ตารางอันดับ', description: 'แสดงตารางผู้เล่นที่ได้รับรางวัลในหน้าหลัก' },
            { key: 'announcement_popup', name: 'ป๊อปอัพประกาศ', description: 'แสดงประกาศเมื่อเข้าเว็บไซต์ครั้งแรก' },
            { key: 'line_notify', name: 'แจ้งเตือน LINE', description: 'ส่งการแจ้งเตือนฝาก-ถอนเข้ากลุ่ม LINE' },
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
router.put('/features/:key', requirePermission('settings', 'features', 'manage'), async (req: AuthRequest, res) => {
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
router.get('/contacts', requirePermission('settings', 'contacts', 'view'), async (req, res) => {
    try {
        const contacts = await prisma.contactChannel.findMany({ orderBy: { sortOrder: 'asc' } });
        res.json({ success: true, data: contacts });
    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// POST /api/admin/settings/contacts - เพิ่มช่องทางติดต่อ
router.post('/contacts', requirePermission('settings', 'contacts', 'manage'), async (req, res) => {
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
router.put('/contacts/:id', requirePermission('settings', 'contacts', 'manage'), async (req, res) => {
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
router.delete('/contacts/:id', requirePermission('settings', 'contacts', 'manage'), async (req, res) => {
    try {
        await prisma.contactChannel.delete({ where: { id: Number(req.params.id) } });
        res.json({ success: true, message: 'ลบช่องทางติดต่อสำเร็จ' });
    } catch (error) {
        console.error('Delete contact error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// === Telegram Test ===

// POST /api/admin/settings/test-telegram
router.post('/test-telegram', requirePermission('settings', 'notify', 'manage'), async (req, res) => {
    try {
        const { TelegramNotifyService } = await import('../../services/telegram-notify.service.js');
        const result = await TelegramNotifyService.sendTest();
        if (result.success) {
            res.json({ success: true, message: 'ส่งข้อความทดสอบสำเร็จ' });
        } else {
            res.status(400).json({ success: false, message: 'ส่งไม่สำเร็จ' });
        }
    } catch (error: any) {
        console.error('Test telegram error:', error);
        res.status(500).json({ success: false, message: error.message || 'เกิดข้อผิดพลาด' });
    }
});

export default router;

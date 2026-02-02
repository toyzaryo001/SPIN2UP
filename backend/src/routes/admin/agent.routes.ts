import { Router } from 'express';
import { BetflixService } from '../../services/betflix.service.js';
import { requirePermission } from '../../middlewares/auth.middleware.js';

const router = Router();

// GET /api/admin/agents/balance - ดูยอดเงิน Agent
router.get('/balance', async (req, res) => {
    try {
        const balance = await BetflixService.getAgentBalance();
        res.json({ success: true, data: { balance } });
    } catch (error) {
        console.error('Get agent balance error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/admin/agents/connection-test - ทดสอบการเชื่อมต่อ
router.get('/connection-test', requirePermission('agents', 'connection_test', 'view'), async (req, res) => {
    try {
        const result = await BetflixService.checkStatus();
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Connection test error:', error);
        res.status(500).json({ success: false, message: 'การทดสอบล้มเหลว' });
    }
});

// POST /api/admin/agents/test-register - ทดสอบสมัครสมาชิก
router.post('/test-register', requirePermission('agents', 'connection_test', 'view'), async (req, res) => {
    const start = Date.now();
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุเบอร์โทรศัพท์' });
        }

        const result = await BetflixService.register(phone);
        const latency = Date.now() - start;

        if (result) {
            res.json({
                success: true,
                data: {
                    username: result.username,
                    message: 'สมัครสำเร็จ หรือ มีอยู่แล้ว'
                },
                latency
            });
        } else {
            res.json({ success: false, message: 'สมัครไม่สำเร็จ', latency });
        }
    } catch (error: any) {
        const latency = Date.now() - start;
        console.error('Test register error:', error);
        res.json({ success: false, message: error.message || 'เกิดข้อผิดพลาด', latency });
    }
});

// POST /api/admin/agents/test-balance - ทดสอบเช็คยอด
router.post('/test-balance', requirePermission('agents', 'connection_test', 'view'), async (req, res) => {
    const start = Date.now();
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุ Username' });
        }

        const balance = await BetflixService.getBalance(username);
        const latency = Date.now() - start;

        res.json({
            success: true,
            data: { balance },
            latency
        });
    } catch (error: any) {
        const latency = Date.now() - start;
        console.error('Test balance error:', error);
        res.json({ success: false, message: error.message || 'เกิดข้อผิดพลาด', latency });
    }
});

// POST /api/admin/agents/test-game - ทดสอบเข้าเกม
router.post('/test-game', requirePermission('agents', 'connection_test', 'view'), async (req, res) => {
    const start = Date.now();
    try {
        const { username, provider } = req.body;
        if (!username) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุ Username' });
        }

        const url = await BetflixService.launchGame(username, provider || 'pg', '', 'thai');
        const latency = Date.now() - start;

        if (url) {
            res.json({
                success: true,
                data: { url },
                latency
            });
        } else {
            res.json({ success: false, message: 'ไม่สามารถสร้าง URL เกมได้', latency });
        }
    } catch (error: any) {
        const latency = Date.now() - start;
        console.error('Test game error:', error);
        res.json({ success: false, message: error.message || 'เกิดข้อผิดพลาด', latency });
    }
});

export default router;

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

export default router;

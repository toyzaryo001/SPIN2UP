import { Router } from 'express';
import { BetflixService } from '../../services/betflix.service.js';
import { requirePermission } from '../../middlewares/auth.middleware.js';

const router = Router();

// GET /api/admin/agents/connection-test - ทดสอบการเชื่อมต่อ
router.get('/connection-test', requirePermission('agents', 'view'), async (req, res) => {
    try {
        const result = await BetflixService.checkStatus();
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Connection test error:', error);
        res.status(500).json({ success: false, message: 'การทดสอบล้มเหลว' });
    }
});

export default router;

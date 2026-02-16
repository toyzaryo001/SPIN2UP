import { Router } from 'express';
import { BetflixService } from '../../services/betflix.service.js';
import { requirePermission } from '../../middlewares/auth.middleware.js';
import prisma from '../../lib/db.js';

const router = Router();

// GET /api/admin/agents/balance - ดูยอดเงิน Agent
router.get('/balance', async (req, res) => {
    try {
        const { agentId } = req.query;
        let balance = 0;

        if (agentId) {
            const { AgentFactory } = await import('../../services/agents/AgentFactory.js');
            const agentService = await AgentFactory.getAgentById(Number(agentId));
            balance = await agentService.getAgentBalance();
        } else {
            // Fallback for legacy calls or default
            balance = await BetflixService.getAgentBalance();
        }

        res.json({ success: true, data: { balance } });
    } catch (error) {
        console.error('Get agent balance error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// GET /api/admin/agents/connection-test - ทดสอบการเชื่อมต่อ
router.get('/connection-test', requirePermission('agents', 'connection_test', 'view'), async (req, res) => {
    const start = Date.now();
    try {
        const { agentId } = req.query;
        let isConnected = false;

        if (agentId) {
            const { AgentFactory } = await import('../../services/agents/AgentFactory.js');
            const agentService = await AgentFactory.getAgentById(Number(agentId));
            // Use getGameProviders as a ping since checkStatus might not be implemented in all perfectly
            // Or if checkStatus is available on interface
            if (typeof agentService.checkStatus === 'function') {
                isConnected = await agentService.checkStatus();
            } else {
                // Fallback ping
                try {
                    await agentService.getGameProviders();
                    isConnected = true;
                } catch (e) { isConnected = false; }
            }
        } else {
            const status = await BetflixService.checkStatus();
            isConnected = status.server.success && status.auth.success;
        }

        const latency = Date.now() - start;
        res.json({ success: true, data: isConnected, latency });
    } catch (error) {
        const latency = Date.now() - start;
        console.error('Connection test error:', error);
        res.json({ success: false, message: 'การทดสอบล้มเหลว', latency });
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
            res.json({ success: false, message: 'ไม่ได้รับ URL เกม', latency });
        }
    } catch (error: any) {
        const latency = Date.now() - start;
        console.error('Test game error:', error);
        res.json({ success: false, message: error.message || 'เกิดข้อผิดพลาด', latency });
    }
});

// POST /api/admin/agents/test-providers - ทดสอบดึงค่ายเกม
router.post('/test-providers', requirePermission('agents', 'connection_test', 'view'), async (req, res) => {
    const start = Date.now();
    try {
        const { agentId } = req.body;

        // Dynamically import AgentFactory to avoid circular dependency issues if any
        const { AgentFactory } = await import('../../services/agents/AgentFactory.js');

        let agentService;
        if (agentId) {
            agentService = await AgentFactory.getAgentById(Number(agentId));
        } else {
            agentService = BetflixService;
        }

        // Safety check if method exists
        if (typeof (agentService as any).getGameProviders !== 'function') {
            return res.json({ success: false, message: 'Agent นี้ยังไม่รองรับการดึงค่ายเกม', latency: 0 });
        }

        const providers = await (agentService as any).getGameProviders();
        const latency = Date.now() - start;

        res.json({
            success: true,
            data: providers,
            latency
        });
    } catch (error: any) {
        const latency = Date.now() - start;
        console.error('Test providers error:', error);
        res.json({ success: false, message: error.message || 'เกิดข้อผิดพลาด', latency });
    }
});

// POST /api/admin/agents/test-games-list - ทดสอบดึงรายชื่อเกม
router.post('/test-games-list', requirePermission('agents', 'connection_test', 'view'), async (req, res) => {
    const start = Date.now();
    try {
        const { agentId, providerCode } = req.body;

        if (!providerCode) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุ Provider Code' });
        }

        const { AgentFactory } = await import('../../services/agents/AgentFactory.js');

        let agentService;
        if (agentId) {
            agentService = await AgentFactory.getAgentById(Number(agentId));
        } else {
            agentService = BetflixService;
        }

        if (typeof (agentService as any).getGames !== 'function') {
            return res.json({ success: false, message: 'Agent นี้ยังไม่รองรับการดึงเกม', latency: 0 });
        }

        const games = await (agentService as any).getGames(providerCode);
        const latency = Date.now() - start;

        res.json({
            success: true,
            data: games,
            latency
        });
    } catch (error: any) {
        const latency = Date.now() - start;
        console.error('Test games list error:', error);
        res.json({ success: false, message: error.message || 'เกิดข้อผิดพลาด', latency });
    }
});

export default router;

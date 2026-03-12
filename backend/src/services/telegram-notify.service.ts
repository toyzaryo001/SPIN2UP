import axios from 'axios';
import prisma from '../lib/db';

export class TelegramNotifyService {
    private static API_URL = 'https://api.telegram.org';

    /**
     * Send a message to a specific Telegram chat
     */
    static async sendMessage(botToken: string, chatId: string, message: string) {
        try {
            const response = await axios.post(
                `${this.API_URL}/bot${botToken}/sendMessage`,
                {
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML'
                }
            );
            return { success: response.data.ok, data: response.data };
        } catch (error: any) {
            console.error('[Telegram] Error sending message:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get settings helper — fetches all telegram-related settings
     */
    private static async getSettings() {
        const keys = [
            'telegramBotToken',
            'telegramChatId',
            'telegramChatIdDeposit',
            'telegramChatIdWithdraw',
            'telegramChatIdRegister',
            'telegramNotifyDeposit',
            'telegramNotifyWithdraw',
            'telegramNotifyRegister',
        ];

        const settings = await prisma.setting.findMany({
            where: { key: { in: keys } }
        });

        const map: Record<string, string> = {};
        settings.forEach(s => { map[s.key] = s.value; });
        return map;
    }

    /**
     * Notify about a new deposit
     */
    static async notifyDeposit(username: string, amount: number, method: string) {
        try {
            const s = await this.getSettings();
            if (s.telegramNotifyDeposit !== 'true') return { success: false, message: 'Telegram deposit notify disabled' };

            const botToken = s.telegramBotToken;
            const chatId = s.telegramChatIdDeposit || s.telegramChatId; // fallback to main
            if (!botToken || !chatId) return { success: false, message: 'Missing bot token or chat ID' };

            const msg = `💰 <b>แจ้งฝากเงินใหม่!</b>
👤 ยูสเซอร์: <code>${username}</code>
💵 จำนวน: <b>${amount.toLocaleString()} บาท</b>
🔌 ช่องทาง: ${method}
🕒 เวลา: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`;

            return this.sendMessage(botToken, chatId, msg);
        } catch (error: any) {
            console.error('[Telegram] notifyDeposit error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Notify about a new withdrawal request
     */
    static async notifyWithdraw(username: string, amount: number) {
        try {
            const s = await this.getSettings();
            if (s.telegramNotifyWithdraw !== 'true') return { success: false, message: 'Telegram withdraw notify disabled' };

            const botToken = s.telegramBotToken;
            const chatId = s.telegramChatIdWithdraw || s.telegramChatId;
            if (!botToken || !chatId) return { success: false, message: 'Missing bot token or chat ID' };

            const msg = `💸 <b>แจ้งถอนเงิน!</b>
👤 ยูสเซอร์: <code>${username}</code>
💵 จำนวน: <b>${amount.toLocaleString()} บาท</b>
🕒 เวลา: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
⚠️ โปรดตรวจสอบและอนุมัติในระบบ`;

            return this.sendMessage(botToken, chatId, msg);
        } catch (error: any) {
            console.error('[Telegram] notifyWithdraw error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Notify about a new registration
     */
    static async notifyRegister(username: string, fullName: string, phone: string, adminName?: string) {
        try {
            const s = await this.getSettings();
            if (s.telegramNotifyRegister !== 'true') return { success: false, message: 'Telegram register notify disabled' };

            const botToken = s.telegramBotToken;
            const chatId = s.telegramChatIdRegister || s.telegramChatId;
            if (!botToken || !chatId) return { success: false, message: 'Missing bot token or chat ID' };

            const msg = `🆕 <b>สมาชิกใหม่!</b>
👤 ยูสเซอร์: <code>${username}</code>
📝 ชื่อ: ${fullName}
📱 เบอร์: ${phone}${adminName ? `\n🧑‍💼 สมัครโดย: <b>${adminName}</b>` : ''}
🕒 เวลา: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`;

            return this.sendMessage(botToken, chatId, msg);
        } catch (error: any) {
            console.error('[Telegram] notifyRegister error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send a test message
     */
    static async sendTest() {
        try {
            const s = await this.getSettings();
            const botToken = s.telegramBotToken;
            const chatId = s.telegramChatId || s.telegramChatIdDeposit || s.telegramChatIdWithdraw || s.telegramChatIdRegister;
            if (!botToken || !chatId) {
                throw new Error('Missing Bot Token or Chat ID');
            }

            const msg = `✅ <b>ทดสอบส่ง Telegram สำเร็จ!</b>
🕒 เวลา: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
📡 ระบบแจ้งเตือนทำงานปกติ`;

            return this.sendMessage(botToken, chatId, msg);
        } catch (error: any) {
            console.error('[Telegram] sendTest error:', error.message);
            throw error;
        }
    }
}

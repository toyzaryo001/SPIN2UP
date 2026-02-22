import axios from 'axios';
import prisma from '../lib/db';

export class LineNotifyService {
    private static API_URL = 'https://notify-api.line.me/api/notify';

    /**
     * Send a notification message to LINE
     * @param message The message to send
     */
    static async notify(message: string) {
        try {
            // 1. Check if LINE Notify feature is enabled
            const feature = await prisma.siteFeature.findUnique({
                where: { key: 'line_notify' }
            });

            if (feature && !feature.isEnabled) {
                return { success: false, message: 'LINE Notify is disabled' };
            }

            // 2. Get LINE Notify Token from settings
            const tokenSetting = await prisma.setting.findUnique({
                where: { key: 'line_notify_token' }
            });

            const token = tokenSetting?.value;
            if (!token) {
                console.warn('[LineNotify] Missing line_notify_token in settings');
                return { success: false, message: 'Missing token' };
            }

            // 3. Send to LINE Notify API
            const response = await axios.post(
                this.API_URL,
                new URLSearchParams({ message }).toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            return { success: response.status === 200, data: response.data };
        } catch (error: any) {
            console.error('[LineNotify] Error sending notification:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Notify about a new deposit
     */
    static async notifyDeposit(username: string, amount: number, method: string) {
        const msg = `
📣 แจ้งฝากเงินใหม่!
👤 ยูสเซอร์: ${username}
💰 จำนวน: ${amount.toLocaleString()} บาท
🔌 ช่องทาง: ${method}
🕒 เวลา: ${new Date().toLocaleString('th-TH')}
`.trim();
        return this.notify(msg);
    }

    /**
     * Notify about a new withdrawal request
     */
    static async notifyWithdraw(username: string, amount: number) {
        const msg = `
💸 แจ้งถอนเงิน!
👤 ยูสเซอร์: ${username}
💰 จำนวน: ${amount.toLocaleString()} บาท
🕒 เวลา: ${new Date().toLocaleString('th-TH')}
⚠️ โปรดตรวจสอบและอนุมัติในระบบ
`.trim();
        return this.notify(msg);
    }
}

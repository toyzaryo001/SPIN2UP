import axios from 'axios';
import prisma from '../lib/db';

export class LineNotifyService {
    private static API_URL = 'https://notify-api.line.me/api/notify';

    static async notify(message: string) {
        try {
            const feature = await prisma.siteFeature.findUnique({
                where: { key: 'line_notify' }
            });

            if (feature && !feature.isEnabled) {
                return { success: false, message: 'LINE Notify is disabled' };
            }

            const tokenSetting = await prisma.setting.findUnique({
                where: { key: 'line_notify_token' }
            });

            const token = tokenSetting?.value;
            if (!token) {
                console.warn('[LineNotify] Missing line_notify_token in settings');
                return { success: false, message: 'Missing token' };
            }

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

    static async notifyManualCredit(username: string, amount: number, fullName?: string | null, note?: string | null) {
        const msg = `
🛠 แจ้งปรับเครดิตโดยแอดมิน
👤 ยูสเซอร์: ${username}
📝 ชื่อ-สกุล: ${fullName || '-'}
➕ ประเภท: เพิ่มเครดิต
💰 จำนวน: ${amount.toLocaleString()} บาท
🧾 หมายเหตุ: ${note || '-'}
🕒 เวลา: ${new Date().toLocaleString('th-TH')}
`.trim();
        return this.notify(msg);
    }

    static async notifyManualDeduct(username: string, amount: number, fullName?: string | null, note?: string | null) {
        const msg = `
🛠 แจ้งปรับเครดิตโดยแอดมิน
👤 ยูสเซอร์: ${username}
📝 ชื่อ-สกุล: ${fullName || '-'}
➖ ประเภท: ลดเครดิต
💰 จำนวน: ${amount.toLocaleString()} บาท
🧾 หมายเหตุ: ${note || '-'}
🕒 เวลา: ${new Date().toLocaleString('th-TH')}
`.trim();
        return this.notify(msg);
    }
}

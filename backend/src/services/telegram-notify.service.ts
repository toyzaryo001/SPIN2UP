import axios from 'axios';
import prisma from '../lib/db';

type WithdrawRejectMode = 'RETURN_TO_GAME' | 'KEEP_IN_WEB_WALLET' | null | undefined;

export class TelegramNotifyService {
    private static API_URL = 'https://api.telegram.org';

    static async sendMessage(botToken: string, chatId: string, message: string) {
        try {
            const response = await axios.post(
                `${this.API_URL}/bot${botToken}/sendMessage`,
                {
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML',
                }
            );

            return { success: response.data.ok, data: response.data };
        } catch (error: any) {
            console.error('[Telegram] Error sending message:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

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
            where: { key: { in: keys } },
        });

        const map: Record<string, string> = {};
        settings.forEach((setting) => {
            map[setting.key] = setting.value;
        });

        return map;
    }

    private static async getWithdrawNotificationConfig() {
        const s = await this.getSettings();
        if (s.telegramNotifyWithdraw !== 'true') {
            return null;
        }

        const botToken = s.telegramBotToken;
        const chatId = s.telegramChatIdWithdraw || s.telegramChatId;
        if (!botToken || !chatId) {
            return null;
        }

        return { botToken, chatId };
    }

    private static resolveRejectModeText(mode: WithdrawRejectMode, refunded?: boolean) {
        if (mode === 'RETURN_TO_GAME') {
            return 'คืนยอดกลับเข้าเกมแล้ว';
        }

        if (mode === 'KEEP_IN_WEB_WALLET') {
            return 'ไม่คืนเข้าเกม / อยู่ในกระเป๋าปกติ';
        }

        return refunded === false ? 'ไม่คืนยอด' : 'คืนยอดแล้ว';
    }

    static async notifyDeposit(username: string, amount: number, method: string, fullName?: string | null) {
        try {
            const s = await this.getSettings();
            if (s.telegramNotifyDeposit !== 'true') {
                return { success: false, message: 'Telegram deposit notify disabled' };
            }

            const botToken = s.telegramBotToken;
            const chatId = s.telegramChatIdDeposit || s.telegramChatId;
            if (!botToken || !chatId) {
                return { success: false, message: 'Missing bot token or chat ID' };
            }

            const displayFullName = fullName || '-';
            const amountText = `<b>${amount.toLocaleString()} บาท</b>`;
            const timeText = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
            const isTrueWallet = method === 'TrueWallet';

            const lines = [
                '💰 <b>แจ้งฝากเงินใหม่!</b>',
                `👤 ยูสเซอร์: <code>${username}</code>`,
                `📝 ชื่อ-สกุล: ${displayFullName}`,
            ];

            if (isTrueWallet) {
                lines.push(`💵 จำนวน: ${amountText}`);
                lines.push(`🔌 ช่องทาง: ${method}`);
            } else {
                lines.push(`🔌 ช่องทาง: ${method}`);
                lines.push(`💵 จำนวน: ${amountText}`);
            }

            lines.push(`🕒 เวลา: ${timeText}`);

            return this.sendMessage(botToken, chatId, lines.join('\n'));
        } catch (error: any) {
            console.error('[Telegram] notifyDeposit error:', error.message);
            return { success: false, error: error.message };
        }
    }

    static async notifyManualCredit(username: string, amount: number, fullName?: string | null, note?: string | null) {
        try {
            const s = await this.getSettings();
            if (s.telegramNotifyDeposit !== 'true') {
                return { success: false, message: 'Telegram deposit notify disabled' };
            }

            const botToken = s.telegramBotToken;
            const chatId = s.telegramChatIdDeposit || s.telegramChatId;
            if (!botToken || !chatId) {
                return { success: false, message: 'Missing bot token or chat ID' };
            }

            const msg = `🛠 <b>แจ้งปรับเครดิตโดยแอดมิน</b>
👤 ยูสเซอร์: <code>${username}</code>
📝 ชื่อ-สกุล: ${fullName || '-'}
➕ ประเภท: เพิ่มเครดิต
💵 จำนวน: <b>${amount.toLocaleString()} บาท</b>
🧾 หมายเหตุ: ${note || '-'}
🕒 เวลา: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`;

            return this.sendMessage(botToken, chatId, msg);
        } catch (error: any) {
            console.error('[Telegram] notifyManualCredit error:', error.message);
            return { success: false, error: error.message };
        }
    }

    static async notifyManualDeduct(username: string, amount: number, fullName?: string | null, note?: string | null) {
        try {
            const s = await this.getSettings();
            if (s.telegramNotifyWithdraw !== 'true') {
                return { success: false, message: 'Telegram withdraw notify disabled' };
            }

            const botToken = s.telegramBotToken;
            const chatId = s.telegramChatIdWithdraw || s.telegramChatId;
            if (!botToken || !chatId) {
                return { success: false, message: 'Missing bot token or chat ID' };
            }

            const msg = `🛠 <b>แจ้งปรับเครดิตโดยแอดมิน</b>
👤 ยูสเซอร์: <code>${username}</code>
📝 ชื่อ-สกุล: ${fullName || '-'}
➖ ประเภท: ลดเครดิต
💵 จำนวน: <b>${amount.toLocaleString()} บาท</b>
🧾 หมายเหตุ: ${note || '-'}
🕒 เวลา: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`;

            return this.sendMessage(botToken, chatId, msg);
        } catch (error: any) {
            console.error('[Telegram] notifyManualDeduct error:', error.message);
            return { success: false, error: error.message };
        }
    }

    static async notifyWithdrawCreated(details: {
        username: string;
        fullName?: string | null;
        amount: number;
        bankName?: string | null;
        bankAccount?: string | null;
        method: string;
        transactionId?: number | null;
        settledAgentCode?: string | null;
        settledExternalUsername?: string | null;
    }) {
        try {
            const config = await this.getWithdrawNotificationConfig();
            if (!config) {
                return { success: false, message: 'Telegram withdraw notify disabled or not configured' };
            }

            const message = `💸 <b>แจ้งรายการถอนใหม่</b>
👤 ยูสเซอร์: <code>${details.username}</code>
📝 ชื่อ-สกุล: ${details.fullName || '-'}
🔌 ช่องทาง: ${details.method}
🏦 ปลายทาง: ${details.bankName || '-'}
💳 เลขบัญชี/วอลเล็ท: ${details.bankAccount || '-'}
💵 จำนวน: <b>${details.amount.toLocaleString()} บาท</b>
🧾 รายการ: ${details.transactionId ? `#${details.transactionId}` : '-'}
📌 สถานะ: รอทำรายการ
🕒 เวลา: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`;

            return this.sendMessage(config.botToken, config.chatId, message);
        } catch (error: any) {
            console.error('[Telegram] notifyWithdrawCreated error:', error.message);
            return { success: false, error: error.message };
        }
    }

    static async notifyWithdrawApproved(details: {
        username: string;
        fullName?: string | null;
        amount: number;
        bankName?: string | null;
        bankAccount?: string | null;
        method: string;
        transactionId?: number | null;
        adminName?: string | null;
        note?: string | null;
    }) {
        try {
            const config = await this.getWithdrawNotificationConfig();
            if (!config) {
                return { success: false, message: 'Telegram withdraw notify disabled or not configured' };
            }

            const msg = `✅ <b>อนุมัติรายการถอนแล้ว</b>
👤 ยูสเซอร์: <code>${details.username}</code>
📝 ชื่อ-สกุล: ${details.fullName || '-'}
🔌 ช่องทาง: ${details.method}
🏦 ปลายทาง: ${details.bankName || '-'}
💳 เลขบัญชี/วอลเล็ท: ${details.bankAccount || '-'}
💵 จำนวน: <b>${details.amount.toLocaleString()} บาท</b>
🧾 รายการ: ${details.transactionId ? `#${details.transactionId}` : '-'}
👨‍💼 ดำเนินการโดย: ${details.adminName || '-'}
📝 หมายเหตุ: ${details.note || '-'}
📌 สถานะ: อนุมัติแล้ว
🕒 เวลา: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`;

            return this.sendMessage(config.botToken, config.chatId, msg);
        } catch (error: any) {
            console.error('[Telegram] notifyWithdrawApproved error:', error.message);
            return { success: false, error: error.message };
        }
    }

    static async notifyWithdrawRejected(details: {
        username: string;
        fullName?: string | null;
        amount: number;
        bankName?: string | null;
        bankAccount?: string | null;
        method: string;
        transactionId?: number | null;
        adminName?: string | null;
        note?: string | null;
        refunded?: boolean;
        rejectMode?: 'RETURN_TO_GAME' | 'KEEP_IN_WEB_WALLET' | null;
    }) {
        try {
            const config = await this.getWithdrawNotificationConfig();
            if (!config) {
                return { success: false, message: 'Telegram withdraw notify disabled or not configured' };
            }

            const refundText = this.resolveRejectModeText(details.rejectMode, details.refunded);
            const message = `❌ <b>ปฏิเสธรายการถอน</b>
👤 ยูสเซอร์: <code>${details.username}</code>
📝 ชื่อ-สกุล: ${details.fullName || '-'}
🔌 ช่องทาง: ${details.method}
🏦 ปลายทาง: ${details.bankName || '-'}
💳 เลขบัญชี/วอลเล็ท: ${details.bankAccount || '-'}
💵 จำนวน: <b>${details.amount.toLocaleString()} บาท</b>
🧾 รายการ: ${details.transactionId ? `#${details.transactionId}` : '-'}
👨‍💼 ดำเนินการโดย: ${details.adminName || '-'}
↩️ การคืนยอด: ${refundText}
📝 เหตุผล: ${details.note || '-'}
📌 สถานะ: ปฏิเสธ
🕒 เวลา: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`;

            return this.sendMessage(config.botToken, config.chatId, message);
        } catch (error: any) {
            console.error('[Telegram] notifyWithdrawRejected error:', error.message);
            return { success: false, error: error.message };
        }
    }

    static async notifyWithdraw(username: string, amount: number) {
        try {
            const s = await this.getSettings();
            if (s.telegramNotifyWithdraw !== 'true') {
                return { success: false, message: 'Telegram withdraw notify disabled' };
            }

            const botToken = s.telegramBotToken;
            const chatId = s.telegramChatIdWithdraw || s.telegramChatId;
            if (!botToken || !chatId) {
                return { success: false, message: 'Missing bot token or chat ID' };
            }

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

    static async notifyRegister(
        username: string,
        fullName: string,
        phone: string,
        bankName?: string | null,
        bankAccount?: string | null,
        adminName?: string
    ) {
        try {
            const s = await this.getSettings();
            if (s.telegramNotifyRegister !== 'true') {
                return { success: false, message: 'Telegram register notify disabled' };
            }

            const botToken = s.telegramBotToken;
            const chatId = s.telegramChatIdRegister || s.telegramChatId;
            if (!botToken || !chatId) {
                return { success: false, message: 'Missing bot token or chat ID' };
            }

            const msg = `🆕 <b>สมาชิกใหม่!</b>
👤 ยูสเซอร์: <code>${username}</code>
📝 ชื่อ: ${fullName}
📱 เบอร์: ${phone}
🏦 ธนาคาร: ${bankName || '-'}
💳 เลขบัญชี: ${bankAccount || '-'}${adminName ? `\n🧑‍💼 สมัครโดย: <b>${adminName}</b>` : ''}
🕒 เวลา: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`;

            return this.sendMessage(botToken, chatId, msg);
        } catch (error: any) {
            console.error('[Telegram] notifyRegister error:', error.message);
            return { success: false, error: error.message };
        }
    }

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

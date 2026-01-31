import { PrismaClient, Prisma } from '@prisma/client';
import axios from 'axios';
import { BetflixService } from './betflix.service';

const prisma = new PrismaClient();

export class BetLogSyncService {

    /**
     * Sync Transaction Logs from Betflix
     * Should be called by a cron job (e.g., every 1-5 minutes)
     */
    static async syncLogs() {
        console.log(`[Sync] Starting Betflix Log Sync at ${new Date().toISOString()}`);

        try {
            // 1. Get Config & API Instance
            const stats = await BetflixService.checkStatus();
            // We use the config from checkStatus/BetflixService cache or DB
            const config = await prisma.agentConfig.findFirst({ where: { isActive: true } });

            if (!config) {
                console.log('[Sync] No active config found.');
                return;
            }

            const api = axios.create({
                baseURL: config.apiKey || 'https://api.betflix.co',
                headers: {
                    'x-api-key': config.xApiKey || '',
                    'x-api-cat': config.xApiCat || '',
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            // 2. Get Last Synced ID from Settings (since we don't have SyncCursor table)
            const cursorSetting = await prisma.setting.findUnique({
                where: { key: 'BETFLIX_LAST_LOG_ID' }
            });

            let lastId = cursorSetting ? parseInt(cursorSetting.value) : 0;
            console.log(`[Sync] Last Synced ID: ${lastId}`);

            // 3. Loop Fetch
            let round = 0;
            const maxRounds = 5;
            let totalImported = 0;

            while (round < maxRounds) {
                round++;
                const params = new URLSearchParams();
                params.append('id', lastId.toString());

                // Endpoint: /v4/get_bet_log
                const res = await api.post('/v4/get_bet_log', params);

                if (res.data.status !== 'success' || !res.data.data || res.data.data.length === 0) {
                    console.log(`[Sync] No new logs (Round ${round})`);
                    break;
                }

                const logs = res.data.data;
                console.log(`[Sync] Fetched ${logs.length} logs.`);

                let batchMaxId = lastId;

                for (const log of logs) {
                    // Log Interface: { id, username, game_code, bet, win, turnover, ... }
                    const logId = parseInt(log.id);
                    if (logId <= lastId) continue;

                    const betflixUser = log.username;
                    const amount = parseFloat(log.bet);
                    const winAmount = parseFloat(log.win);
                    const gameCode = log.game_code || 'Unknown';

                    const user = await prisma.user.findFirst({
                        where: { betflixUsername: betflixUser }
                    });

                    if (user) {
                        try {
                            // Check deduplication via Note (since externalId doesn't exist)
                            // Note format: "Betflix Log #<ID>: <Game>"
                            const logRef = `Betflix Log #${log.id}`;
                            const exists = await prisma.transaction.findFirst({
                                where: {
                                    userId: user.id,
                                    note: { contains: logRef }
                                }
                            });

                            if (!exists) {
                                // We need balance info, but for sync logs we might not want to touch generic balance
                                // unless we are sure. For now, let's just record it for history.
                                // We use current user balance as snapshot.
                                const currentBalance = new Prisma.Decimal(user.balance);

                                await prisma.transaction.create({
                                    data: {
                                        userId: user.id,
                                        amount: new Prisma.Decimal(amount),
                                        type: 'BET',
                                        // Since we don't have 'externalId', we put it in note
                                        note: `${logRef}: ${gameCode} (Win: ${winAmount})`,
                                        status: 'COMPLETED',
                                        // Required fields
                                        balanceBefore: currentBalance,
                                        balanceAfter: currentBalance, // Changing balance here requires Wallet logic, skipping for log-sync only
                                    }
                                });

                                totalImported++;
                            }
                        } catch (err) {
                            console.error(`[Sync] Failed to insert log ${log.id}`, err);
                        }
                    }

                    batchMaxId = Math.max(batchMaxId, logId);
                }

                if (batchMaxId > lastId) {
                    lastId = batchMaxId;
                    // Save Cursor
                    await prisma.setting.upsert({
                        where: { key: 'BETFLIX_LAST_LOG_ID' },
                        update: { value: lastId.toString() },
                        create: { key: 'BETFLIX_LAST_LOG_ID', value: lastId.toString() }
                    });
                } else {
                    break;
                }
            }

            console.log(`[Sync] Finished. Imported: ${totalImported}`);

        } catch (error) {
            console.error('[Sync] Critical Error:', error);
        }
    }
}

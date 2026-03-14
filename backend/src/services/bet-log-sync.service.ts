import { Prisma } from '@prisma/client';
import { BetflixService } from './betflix.service';
import prisma from '../lib/db.js';
import { TurnoverService } from './turnover.service.js';
import { CommissionService } from './commission.service.js';
import { thaiNow } from '../lib/thai-time.js';

export class BetLogSyncService {
    private static getBootstrapCursor() {
        // Betflix docs use a date-shaped cursor such as 23121000.
        // Start from yesterday in Thai time to avoid "0" being rejected.
        return Number(thaiNow().subtract(1, 'day').format('YYMMDD00'));
    }

    /**
     * Sync Transaction Logs from Betflix
     * Should be called by a cron job (e.g., every 1-5 minutes)
     */
    static async syncLogs() {
        console.log(`[Sync] Starting Betflix Log Sync at ${new Date().toISOString()}`);

        try {
            // 1. Validate configuration upfront
            const stats = await BetflixService.checkStatus();
            if (!stats.server.success || !stats.auth.success) {
                console.log('[Sync] Betflix connection not ready, skipping sync.', stats);
                return;
            }

            // 2. Get Last Synced ID from Settings (since we don't have SyncCursor table)
            const cursorSetting = await prisma.setting.findUnique({
                where: { key: 'BETFLIX_LAST_LOG_ID' }
            });

            let lastId = cursorSetting ? parseInt(cursorSetting.value, 10) : 0;
            if (!Number.isFinite(lastId) || lastId < 0) {
                console.warn(`[Sync] Invalid BETFLIX_LAST_LOG_ID "${cursorSetting?.value ?? ''}", resetting to 0`);
                lastId = 0;
            }
            if (lastId === 0) {
                lastId = this.getBootstrapCursor();
                console.log(`[Sync] Bootstrapping BETFLIX_LAST_LOG_ID to ${lastId}`);

                await prisma.setting.upsert({
                    where: { key: 'BETFLIX_LAST_LOG_ID' },
                    update: { value: lastId.toString() },
                    create: { key: 'BETFLIX_LAST_LOG_ID', value: lastId.toString() }
                });
            }
            console.log(`[Sync] Last Synced ID: ${lastId}`);

            // 3. Loop Fetch
            let round = 0;
            const maxRounds = 5;
            let totalImported = 0;

            while (round < maxRounds) {
                round++;

                // Use robust getBetLog from Service
                const logs = await BetflixService.getBetLog(lastId);

                if (!logs || logs.length === 0) {
                    console.log(`[Sync] No new logs (Round ${round})`);
                    break;
                }

                console.log(`[Sync] Fetched ${logs.length} logs.`);

                let batchMaxId = lastId;

                for (const log of logs) {
                    // Log Interface: { id, username, game_code, bet, win, turnover, ... }
                    const logId = parseInt(log.id);
                    if (logId <= lastId) continue;

                    const betflixUser = log.username;
                    const amount = parseFloat(log.bet);
                    const winAmount = parseFloat(log.win);
                    const validBet = parseFloat(log.turnover || log.valid_amount || log.valid_bet || amount.toString() || '0');
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

                                await prisma.$transaction(async (tx) => {
                                    await tx.transaction.create({
                                        data: {
                                            userId: user.id,
                                            amount: new Prisma.Decimal(amount),
                                            type: 'BET',
                                            note: `${logRef}: ${gameCode} (Win: ${winAmount})`,
                                            status: 'COMPLETED',
                                            balanceBefore: currentBalance,
                                            balanceAfter: currentBalance,
                                        }
                                    });

                                    if (validBet > 0) {
                                        await CommissionService.recordTurnover(user.id, validBet, new Date(), tx as any);
                                    }

                                    if (validBet > 0 && user.turnoverLimit && Number(user.turnoverLimit) > 0) {
                                        await TurnoverService.recordProgress(user.id, validBet, tx);
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

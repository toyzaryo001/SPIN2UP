import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import prisma from '../lib/db.js';
import { THAI_UTC_OFFSET, thaiNow, thaiStartOfDay, thaiEndOfDay } from '../lib/thai-time.js';
import { NexusProvider } from './agents/NexusProvider.js';

dayjs.extend(utc);

type SyncUserRecord = {
    id: number;
    phone: string | null;
    externalAccounts?: Array<{ agentId?: number; externalUsername: string }> | false;
};

type NexusAggregateRow = {
    userId: number | null;
    _sum: {
        betAmount: unknown;
        winAmount: unknown;
    };
};

type NexusSyncResult = {
    userId: number;
    externalUsername: string | null;
    fetchedRecords: number;
    persistedRecords: number;
    failed: boolean;
    error?: string;
};

export class NexusLogSyncService {
    private static GAME_TYPES = ['slot', 'casino', 'fishing', 'table', 'arcade'];
    private static agentCache: { id: number; fetchedAt: number } | null = null;

    private static toNumber(value: unknown) {
        return Number(value || 0);
    }

    private static getLookbackDays() {
        const raw = Number(process.env.NEXUS_LOG_SYNC_LOOKBACK_DAYS || 2);
        if (!Number.isFinite(raw) || raw <= 0) {
            return 2;
        }
        return raw;
    }

    private static async getNexusAgentId() {
        if (this.agentCache && Date.now() - this.agentCache.fetchedAt < 60_000) {
            return this.agentCache.id;
        }

        const agent = await prisma.agentConfig.findUnique({
            where: { code: 'NEXUS' },
            select: { id: true },
        });

        if (!agent) {
            return null;
        }

        this.agentCache = {
            id: agent.id,
            fetchedAt: Date.now(),
        };

        return agent.id;
    }

    private static extractLocalNexusUsername(user: SyncUserRecord, nexusAgentId: number | null) {
        if (!Array.isArray(user.externalAccounts) || user.externalAccounts.length === 0) {
            return null;
        }

        if (!nexusAgentId) {
            return user.externalAccounts[0]?.externalUsername || null;
        }

        const matched = user.externalAccounts.find((account) => {
            if (typeof account.agentId === 'number') {
                return account.agentId === nexusAgentId;
            }
            return true;
        });

        return matched?.externalUsername || null;
    }

    static buildApiRangeFromThaiRange(startThai: Date, endThai: Date) {
        return {
            start: dayjs(startThai).utc().format('YYYY-MM-DD HH:mm:ss'),
            end: dayjs(endThai).utc().format('YYYY-MM-DD HH:mm:ss'),
        };
    }

    private static parseRecordTime(record: any) {
        const raw = record?.created_at || record?.updated_at;
        if (!raw) {
            return null;
        }

        const occurredAtUtc = dayjs.utc(raw);
        if (!occurredAtUtc.isValid()) {
            return null;
        }

        const occurredAtThai = occurredAtUtc.utcOffset(THAI_UTC_OFFSET);
        return {
            occurredAtUtc: occurredAtUtc.toDate(),
            occurredAtThai: occurredAtThai.toDate(),
            thaiStatDate: occurredAtThai.startOf('day').toDate(),
        };
    }

    private static toPersistableRecord(args: {
        userId: number;
        externalUsername: string;
        gameType: string;
        record: any;
    }) {
        const parsedTime = this.parseRecordTime(args.record);
        if (!parsedTime) {
            return null;
        }

        const txnId = String(args.record?.txn_id || args.record?.history_id || '').trim();
        const txnType = String(args.record?.txn_type || 'debit_credit').trim();
        if (!txnId) {
            return null;
        }

        let betAmount = 0;
        let winAmount = 0;

        if (txnType === 'debit') {
            betAmount = this.toNumber(args.record?.bet_money ?? args.record?.bet);
        } else if (txnType === 'credit') {
            winAmount = this.toNumber(args.record?.win_money ?? args.record?.win);
        } else {
            betAmount = this.toNumber(args.record?.bet_money ?? args.record?.bet);
            winAmount = this.toNumber(args.record?.win_money ?? args.record?.win);
        }

        return {
            userId: args.userId,
            externalUsername: args.externalUsername,
            providerCode: args.record?.provider_code ? String(args.record.provider_code) : null,
            gameCode: args.record?.game_code ? String(args.record.game_code) : null,
            gameType: args.gameType,
            txnId,
            txnType,
            betAmount,
            winAmount,
            occurredAtUtc: parsedTime.occurredAtUtc,
            occurredAtThai: parsedTime.occurredAtThai,
            thaiStatDate: parsedTime.thaiStatDate,
            rawPayload: JSON.stringify(args.record),
        };
    }

    private static async persistLogs(rows: Array<ReturnType<typeof NexusLogSyncService.toPersistableRecord>>) {
        let persistedRecords = 0;

        for (const row of rows) {
            if (!row) continue;

            await prisma.nexusGameLog.upsert({
                where: {
                    externalUsername_txnId_txnType: {
                        externalUsername: row.externalUsername,
                        txnId: row.txnId,
                        txnType: row.txnType,
                    },
                },
                update: {
                    userId: row.userId,
                    providerCode: row.providerCode,
                    gameCode: row.gameCode,
                    gameType: row.gameType,
                    betAmount: row.betAmount,
                    winAmount: row.winAmount,
                    occurredAtUtc: row.occurredAtUtc,
                    occurredAtThai: row.occurredAtThai,
                    thaiStatDate: row.thaiStatDate,
                    rawPayload: row.rawPayload,
                },
                create: row,
            });

            persistedRecords++;
        }

        return persistedRecords;
    }

    static async syncUserRange(user: SyncUserRecord, startThai: Date, endThai: Date): Promise<NexusSyncResult> {
        const nexusAgentId = await this.getNexusAgentId();
        const localNexusUsername = this.extractLocalNexusUsername(user, nexusAgentId);
        const provider = new NexusProvider();
        const externalUsername = localNexusUsername || await provider.buildFallbackUsername(user.phone);

        if (!externalUsername || !nexusAgentId) {
            return {
                userId: user.id,
                externalUsername: externalUsername || null,
                fetchedRecords: 0,
                persistedRecords: 0,
                failed: false,
            };
        }

        const { start, end } = this.buildApiRangeFromThaiRange(startThai, endThai);
        const rows: Array<ReturnType<typeof NexusLogSyncService.toPersistableRecord>> = [];
        let fetchedRecords = 0;

        try {
            for (const gameType of this.GAME_TYPES) {
                let page = 0;
                let hasMore = true;

                while (hasMore) {
                    const response = await provider.getRawGameLog(externalUsername, gameType, start, end, page, 1000);
                    if (!response || Number(response.status) !== 1) {
                        break;
                    }

                    const records = Object.entries(response)
                        .filter(([key, value]) => key !== 'page' && key !== 'perPage' && key !== 'total_count' && Array.isArray(value))
                        .flatMap(([, value]) => value as any[]);

                    if (records.length === 0) {
                        break;
                    }

                    for (const record of records) {
                        fetchedRecords++;
                        const row = this.toPersistableRecord({
                            userId: user.id,
                            externalUsername,
                            gameType,
                            record,
                        });

                        if (!row) {
                            continue;
                        }

                        if (row.occurredAtThai < startThai || row.occurredAtThai > endThai) {
                            continue;
                        }

                        rows.push(row);
                    }

                    const totalCount = Number(response.total_count || records.length || 0);
                    if ((page + 1) * 1000 >= totalCount || records.length < 1000) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                }
            }

            const persistedRecords = await this.persistLogs(rows);

            if (!localNexusUsername && persistedRecords > 0) {
                await prisma.userExternalAccount.upsert({
                    where: {
                        userId_agentId: {
                            userId: user.id,
                            agentId: nexusAgentId,
                        },
                    },
                    update: {
                        externalUsername,
                    },
                    create: {
                        userId: user.id,
                        agentId: nexusAgentId,
                        externalUsername,
                        externalPassword: '',
                    },
                }).catch(() => null);
            }

            return {
                userId: user.id,
                externalUsername,
                fetchedRecords,
                persistedRecords,
                failed: false,
            };
        } catch (error: any) {
            console.error(`[NexusSync] Failed to sync ${externalUsername} for user ${user.id}:`, error.message || error);
            return {
                userId: user.id,
                externalUsername,
                fetchedRecords,
                persistedRecords: 0,
                failed: true,
                error: error.message || String(error),
            };
        }
    }

    static async syncRangeForUsers(users: SyncUserRecord[], startThai: Date, endThai: Date) {
        const results: NexusSyncResult[] = [];
        const batchSize = 5;

        for (let index = 0; index < users.length; index += batchSize) {
            const batch = users.slice(index, index + batchSize);
            const batchResults = await Promise.all(
                batch.map((user) => this.syncUserRange(user, startThai, endThai))
            );
            results.push(...batchResults);
        }

        return results;
    }

    static async syncRecentWindow() {
        const nexusAgentId = await this.getNexusAgentId();
        if (!nexusAgentId) {
            return { users: 0, persistedRecords: 0, failedUsers: 0 };
        }

        const lookbackDays = this.getLookbackDays();
        const startThai = thaiStartOfDay(
            thaiNow().subtract(lookbackDays - 1, 'day').toDate()
        ).toDate();
        const endThai = thaiEndOfDay(thaiNow().toDate()).toDate();

        const users = await prisma.user.findMany({
            where: {
                status: { not: 'DELETED' },
                OR: [
                    { lastActiveAgentId: nexusAgentId },
                    {
                        externalAccounts: {
                            some: { agentId: nexusAgentId },
                        },
                    },
                ],
            },
            select: {
                id: true,
                phone: true,
                externalAccounts: {
                    where: { agentId: nexusAgentId },
                    select: { agentId: true, externalUsername: true },
                },
            },
        });

        const results = await this.syncRangeForUsers(users, startThai, endThai);
        return {
            users: users.length,
            persistedRecords: results.reduce((sum, result) => sum + result.persistedRecords, 0),
            failedUsers: results.filter((result) => result.failed).length,
        };
    }

    static async getAggregatedStatsForUsers(userIds: number[], startThai: Date, endThai: Date) {
        if (userIds.length === 0) {
            return new Map<number, { turnover: number; winloss: number }>();
        }

        const rows = await prisma.nexusGameLog.groupBy({
            by: ['userId'],
            where: {
                userId: { in: userIds },
                occurredAtThai: {
                    gte: startThai,
                    lte: endThai,
                },
            },
            _sum: {
                betAmount: true,
                winAmount: true,
            },
        });

        const result = new Map<number, { turnover: number; winloss: number }>();
        for (const row of rows as NexusAggregateRow[]) {
            if (typeof row.userId !== 'number') continue;
            const turnover = this.toNumber(row._sum.betAmount);
            const totalWin = this.toNumber(row._sum.winAmount);
            result.set(row.userId, {
                turnover,
                winloss: totalWin - turnover,
            });
        }

        return result;
    }

    static async getUserSummaryFromDb(userId: number, startThai: Date, endThai: Date) {
        const aggregated = await this.getAggregatedStatsForUsers([userId], startThai, endThai);
        return aggregated.get(userId) || { turnover: 0, winloss: 0 };
    }

    static async getUserTurnoverFromDb(userId: number, startThai: Date, endThai: Date) {
        const summary = await this.getUserSummaryFromDb(userId, startThai, endThai);
        return summary.turnover;
    }
}

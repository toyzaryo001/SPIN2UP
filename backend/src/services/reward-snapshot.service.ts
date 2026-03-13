import prisma from '../lib/db';
import { thaiDateKey, thaiNow, thaiStartOfDay, thaiEndOfDay } from '../lib/thai-time';
import { BetflixService } from './betflix.service';
import { NexusProvider } from './agents/NexusProvider';

export type RewardType = 'CASHBACK' | 'COMMISSION';

interface RewardPeriod {
    statDate: Date;
    periodStart: Date;
    periodEnd: Date;
    betflixDate: string;
    nexusStart: string;
    nexusEnd: string;
}

interface UserActivityRow {
    userId: number;
    username: string;
    fullName: string | null;
    turnover: number;
    winloss: number;
}

interface RewardConfig {
    isActive: boolean;
    rate: number;
    minAmount: number;
    maxReward: number;
}

export class RewardSnapshotService {
    static getDefaultStatDate() {
        return thaiNow().subtract(1, 'day').startOf('day');
    }

    static getPeriod(dateInput?: string): RewardPeriod {
        const base = dateInput ? thaiStartOfDay(dateInput) : this.getDefaultStatDate();

        return {
            statDate: base.toDate(),
            periodStart: thaiStartOfDay(base.toDate()).toDate(),
            periodEnd: thaiEndOfDay(base.toDate()).toDate(),
            betflixDate: thaiDateKey(base.toDate()),
            nexusStart: thaiStartOfDay(base.toDate()).format('YYYY-MM-DD HH:mm:ss'),
            nexusEnd: thaiEndOfDay(base.toDate()).format('YYYY-MM-DD HH:mm:ss'),
        };
    }

    static isDefaultStatDate(dateInput?: string) {
        if (!dateInput) return true;
        return thaiStartOfDay(dateInput).isSame(this.getDefaultStatDate());
    }

    private static async getRewardConfig(type: RewardType): Promise<RewardConfig> {
        if (type === 'CASHBACK') {
            const setting = await prisma.cashbackSetting.findFirst();
            return {
                isActive: Boolean(setting?.isActive),
                rate: Number(setting?.rate || 0),
                minAmount: Number(setting?.minLoss || 0),
                maxReward: Number(setting?.maxCashback || 0),
            };
        }

        const setting = await prisma.turnoverSetting.findFirst();
        return {
            isActive: Boolean(setting?.isActive),
            rate: Number(setting?.rate || 0),
            minAmount: Number(setting?.minTurnover || 0),
            maxReward: Number(setting?.maxReward || 0),
        };
    }

    private static calculateReward(type: RewardType, activity: UserActivityRow, config: RewardConfig) {
        const turnover = Number(activity.turnover || 0);
        const netLoss = activity.winloss < 0 ? Math.abs(activity.winloss) : 0;

        if (!config.isActive) {
            return { turnover, netLoss, rewardAmount: 0 };
        }

        if (type === 'CASHBACK') {
            if (netLoss < config.minAmount) {
                return { turnover, netLoss, rewardAmount: 0 };
            }

            let rewardAmount = Math.floor(netLoss * (config.rate / 100));
            if (config.maxReward > 0 && rewardAmount > config.maxReward) {
                rewardAmount = config.maxReward;
            }

            return { turnover, netLoss, rewardAmount };
        }

        if (turnover < config.minAmount) {
            return { turnover, netLoss, rewardAmount: 0 };
        }

        let rewardAmount = Number((turnover * (config.rate / 100)).toFixed(2));
        if (config.maxReward > 0 && rewardAmount > config.maxReward) {
            rewardAmount = config.maxReward;
        }

        return { turnover, netLoss, rewardAmount };
    }

    private static async fetchUserActivities(period: RewardPeriod): Promise<UserActivityRow[]> {
        const betflixUsersPromise = prisma.user.findMany({
            where: {
                betflixUsername: { not: null },
                status: { not: 'DELETED' },
            },
            select: {
                id: true,
                username: true,
                fullName: true,
                betflixUsername: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        const nexusAgent = await prisma.agentConfig.findUnique({ where: { code: 'NEXUS' } });
        const nexusAccountsPromise = nexusAgent
            ? prisma.userExternalAccount.findMany({
                where: { agentId: nexusAgent.id },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            fullName: true,
                            status: true,
                        },
                    },
                },
            }).then(accounts => accounts.filter(account => account.user.status !== 'DELETED'))
            : Promise.resolve([]);

        const [betflixUsers, nexusAccounts] = await Promise.all([betflixUsersPromise, nexusAccountsPromise]);

        const batchSize = 5;
        const betflixResults = new Map<number, { turnover: number; winloss: number }>();

        for (let index = 0; index < betflixUsers.length; index += batchSize) {
            const batch = betflixUsers.slice(index, index + batchSize);
            const batchResults = await Promise.all(
                batch.map(async (user) => {
                    try {
                        const report = await BetflixService.getReportSummary(
                            user.betflixUsername!,
                            period.betflixDate,
                            period.betflixDate
                        );

                        if (!report) return null;

                        return {
                            userId: user.id,
                            turnover: Number(report.valid_amount || report.turnover || 0),
                            winloss: Number(report.winloss || 0),
                        };
                    } catch {
                        return null;
                    }
                })
            );

            for (const result of batchResults) {
                if (result) {
                    betflixResults.set(result.userId, { turnover: result.turnover, winloss: result.winloss });
                }
            }
        }

        const nexusResults = new Map<number, { turnover: number; winloss: number }>();

        if (nexusAgent && nexusAccounts.length > 0) {
            const nexus = new NexusProvider();

            for (let index = 0; index < nexusAccounts.length; index += batchSize) {
                const batch = nexusAccounts.slice(index, index + batchSize);
                const batchResults = await Promise.all(
                    batch.map(async (account) => {
                        try {
                            const log = await nexus.getGameLog(
                                account.externalUsername,
                                period.nexusStart,
                                period.nexusEnd
                            );

                            if (!log || (log.totalBet === 0 && log.totalWin === 0)) {
                                return null;
                            }

                            return {
                                userId: account.userId,
                                turnover: log.totalBet,
                                winloss: log.totalWin - log.totalBet,
                            };
                        } catch {
                            return null;
                        }
                    })
                );

                for (const result of batchResults) {
                    if (result) {
                        nexusResults.set(result.userId, { turnover: result.turnover, winloss: result.winloss });
                    }
                }
            }
        }

        const users = new Map<number, UserActivityRow>();

        for (const user of betflixUsers) {
            users.set(user.id, {
                userId: user.id,
                username: user.username || '',
                fullName: user.fullName,
                turnover: 0,
                winloss: 0,
            });
        }

        for (const account of nexusAccounts) {
            if (!users.has(account.userId)) {
                users.set(account.userId, {
                    userId: account.userId,
                    username: account.user.username || '',
                    fullName: account.user.fullName,
                    turnover: 0,
                    winloss: 0,
                });
            }
        }

        for (const [userId, result] of betflixResults.entries()) {
            const current = users.get(userId);
            if (!current) continue;
            current.turnover += result.turnover;
            current.winloss += result.winloss;
        }

        for (const [userId, result] of nexusResults.entries()) {
            const current = users.get(userId);
            if (!current) continue;
            current.turnover += result.turnover;
            current.winloss += result.winloss;
        }

        return [...users.values()].filter(user => user.turnover > 0 || user.winloss !== 0);
    }

    static async syncDailySnapshots(type: RewardType, dateInput?: string) {
        const period = this.getPeriod(dateInput);
        const config = await this.getRewardConfig(type);
        const activities = await this.fetchUserActivities(period);
        const claims = await prisma.rewardClaim.findMany({
            where: {
                type,
                periodStart: {
                    gte: period.periodStart,
                    lte: period.periodEnd,
                },
            },
            select: {
                userId: true,
                amount: true,
                claimedAt: true,
            },
        });

        const claimMap = new Map(claims.map(claim => [claim.userId, claim]));
        const snapshots = activities
            .map(activity => {
                const calculation = this.calculateReward(type, activity, config);
                const claim = claimMap.get(activity.userId);
                const rewardAmount = claim ? Number(claim.amount) : calculation.rewardAmount;

                if (rewardAmount <= 0) return null;

                return {
                    userId: activity.userId,
                    type,
                    statDate: period.statDate,
                    periodStart: period.periodStart,
                    periodEnd: period.periodEnd,
                    turnover: calculation.turnover,
                    netLoss: calculation.netLoss,
                    rewardAmount,
                    isClaimed: Boolean(claim),
                    claimedAt: claim?.claimedAt ?? null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
            })
            .filter((snapshot): snapshot is NonNullable<typeof snapshot> => Boolean(snapshot));

        const eligibleUserCount = snapshots.length;
        const claimedUserCount = snapshots.filter(snapshot => snapshot.isClaimed).length;
        const unclaimedUserCount = eligibleUserCount - claimedUserCount;
        const totalCalculatedAmount = snapshots.reduce((sum, snapshot) => sum + snapshot.rewardAmount, 0);
        const totalClaimedAmount = snapshots
            .filter(snapshot => snapshot.isClaimed)
            .reduce((sum, snapshot) => sum + snapshot.rewardAmount, 0);

        await prisma.$transaction(async (tx) => {
            await tx.rewardUserSnapshot.deleteMany({
                where: {
                    type,
                    statDate: period.statDate,
                },
            });

            if (snapshots.length > 0) {
                await tx.rewardUserSnapshot.createMany({ data: snapshots });
            }

            await tx.rewardDailyStat.upsert({
                where: {
                    type_statDate: {
                        type,
                        statDate: period.statDate,
                    },
                },
                update: {
                    periodStart: period.periodStart,
                    periodEnd: period.periodEnd,
                    eligibleUserCount,
                    claimedUserCount,
                    unclaimedUserCount,
                    claimCount: claimedUserCount,
                    totalCalculatedAmount,
                    totalClaimedAmount,
                },
                create: {
                    type,
                    statDate: period.statDate,
                    periodStart: period.periodStart,
                    periodEnd: period.periodEnd,
                    eligibleUserCount,
                    claimedUserCount,
                    unclaimedUserCount,
                    claimCount: claimedUserCount,
                    totalCalculatedAmount,
                    totalClaimedAmount,
                },
            });
        });

        return {
            statDate: period.statDate,
            eligibleUserCount,
            claimedUserCount,
            unclaimedUserCount,
            totalCalculatedAmount,
            totalClaimedAmount,
        };
    }
}

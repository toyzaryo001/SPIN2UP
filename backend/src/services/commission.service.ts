import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import dayjs from 'dayjs';
import prisma from '../lib/db.js';
import { AgentWalletService } from './agent-wallet.service.js';
import { THAI_UTC_OFFSET, thaiNow, thaiStartOfDay } from '../lib/thai-time.js';
import { BetflixService } from './betflix.service.js';
import { TurnoverService } from './turnover.service.js';
import { NexusLogSyncService } from './nexus-log-sync.service.js';

type DbLike = Prisma.TransactionClient | typeof prisma;

type TurnoverSettingRecord = {
    rate: Decimal | number;
    minTurnover: Decimal | number;
    maxReward: Decimal | number;
    isActive: boolean;
    requiresTurnover?: boolean;
    turnoverMultiplier?: Decimal | number;
};

export class CommissionService {
    private static nexusAgentIdCache: { value: number | null; fetchedAt: number } | null = null;

    private static toNumber(value: unknown) {
        return Number(value || 0);
    }

    private static getPeriodStart(args: {
        cycleStartedAt?: Date | null;
        lastClaimedPeriodEnd?: Date | null;
        createdAt?: Date | null;
    }) {
        if (args.cycleStartedAt) {
            return args.cycleStartedAt;
        }

        if (args.lastClaimedPeriodEnd) {
            return args.lastClaimedPeriodEnd;
        }

        if (args.createdAt) {
            return args.createdAt;
        }

        return thaiStartOfDay(thaiNow().toDate()).toDate();
    }

    private static async getBetflixTurnoverFromDailySummary(
        betflixUsername: string,
        periodStart: Date,
        periodEnd: Date
    ) {
        let totalTurnover = 0;
        let cursor = dayjs(periodStart).utcOffset(THAI_UTC_OFFSET).startOf('day');
        const endDay = dayjs(periodEnd).utcOffset(THAI_UTC_OFFSET).startOf('day');

        while (!cursor.isAfter(endDay, 'day')) {
            const dateStr = cursor.format('YYYY-MM-DD');
            const report = await BetflixService.getReportSummary(betflixUsername, dateStr, dateStr);
            totalTurnover += this.toNumber(
                report?.valid_amount
                || report?.turnover
                || report?.valid_bet
            );
            cursor = cursor.add(1, 'day');
        }

        return totalTurnover;
    }

    private static async getNexusAgentId() {
        if (this.nexusAgentIdCache && Date.now() - this.nexusAgentIdCache.fetchedAt < 60_000) {
            return this.nexusAgentIdCache.value;
        }

        const agent = await prisma.agentConfig.findUnique({
            where: { code: 'NEXUS' },
            select: { id: true },
        });

        this.nexusAgentIdCache = {
            value: agent?.id ?? null,
            fetchedAt: Date.now(),
        };

        return this.nexusAgentIdCache.value;
    }

    private static async getTurnoverForUser(args: {
        userId: number;
        phone?: string | null;
        betflixUsername?: string | null;
        betflixTurnover?: Decimal | number | null;
        externalAccounts?: Array<{ agentId?: number; externalUsername: string }> | false;
        periodStart: Date;
        periodEnd: Date;
        allowLiveBootstrapBetflix?: boolean;
    }) {
        const periodStartDate = args.periodStart;
        const periodEndDate = args.periodEnd;
        const persistedBetflixTurnover = this.toNumber(args.betflixTurnover);

        await NexusLogSyncService.syncRangeForUsers(
            [{
                id: args.userId,
                phone: args.phone || null,
                externalAccounts: args.externalAccounts || false,
            }],
            periodStartDate,
            periodEndDate
        );

        const [betflixTurnoverResult, nexusTurnoverResult] = await Promise.allSettled([
            args.betflixUsername && args.allowLiveBootstrapBetflix
                ? this.getBetflixTurnoverFromDailySummary(
                    args.betflixUsername,
                    periodStartDate,
                    periodEndDate
                ).then((liveTurnover) => Math.max(persistedBetflixTurnover, liveTurnover))
                : Promise.resolve(persistedBetflixTurnover),
            NexusLogSyncService.getUserTurnoverFromDb(args.userId, periodStartDate, periodEndDate),
        ]);

        let turnover = 0;

        if (betflixTurnoverResult.status === 'fulfilled') {
            turnover += this.toNumber(betflixTurnoverResult.value);
        }

        if (nexusTurnoverResult.status === 'fulfilled') {
            turnover += this.toNumber(nexusTurnoverResult.value);
        }

        return turnover;
    }

    private static async getCommissionContext(userId: number) {
        const nexusAgentId = await this.getNexusAgentId();
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                phone: true,
                balance: true,
                betflixUsername: true,
                commissionTurnover: true,
                commissionCycleStartedAt: true,
                createdAt: true,
                externalAccounts: nexusAgentId
                    ? {
                        where: { agentId: nexusAgentId },
                        select: {
                            agentId: true,
                            externalUsername: true,
                        },
                    }
                    : false,
                rewards: {
                    where: { type: 'COMMISSION' },
                    orderBy: { claimedAt: 'desc' },
                    take: 1,
                    select: { periodEnd: true },
                },
            },
        });

        if (!user) {
            throw new Error('User not found');
        }

        const periodStart = this.getPeriodStart({
            cycleStartedAt: user.commissionCycleStartedAt,
            lastClaimedPeriodEnd: user.rewards[0]?.periodEnd || null,
            createdAt: user.createdAt,
        });
        const periodEnd = thaiNow().toDate();
        const hasPriorClaim = user.rewards.length > 0;
        const turnover = await this.getTurnoverForUser({
            userId,
            phone: user.phone,
            betflixUsername: user.betflixUsername,
            betflixTurnover: user.commissionTurnover,
            externalAccounts: Array.isArray(user.externalAccounts) ? user.externalAccounts : false,
            periodStart,
            periodEnd,
            allowLiveBootstrapBetflix: !user.commissionCycleStartedAt && !hasPriorClaim,
        });

        return {
            user,
            turnover,
            periodStart,
            periodEnd,
        };
    }

    static calculateClaimable(
        turnover: number,
        setting?: TurnoverSettingRecord | null
    ) {
        if (!setting?.isActive) {
            return 0;
        }

        const normalizedTurnover = this.toNumber(turnover);
        const minTurnover = this.toNumber(setting.minTurnover);
        if (normalizedTurnover < minTurnover) {
            return 0;
        }

        const rate = this.toNumber(setting.rate);
        const maxReward = this.toNumber(setting.maxReward);
        const calculated = Number((normalizedTurnover * (rate / 100)).toFixed(2));

        if (maxReward > 0 && calculated > maxReward) {
            return maxReward;
        }

        return calculated;
    }

    static async getSetting(db: DbLike = prisma) {
        return db.turnoverSetting.findFirst();
    }

    static async recordTurnover(
        userId: number,
        turnover: number,
        occurredAt = new Date(),
        db: DbLike = prisma
    ) {
        const normalizedTurnover = this.toNumber(turnover);
        if (normalizedTurnover <= 0) {
            return 0;
        }

        const currentUser = await db.user.findUnique({
            where: { id: userId },
            select: {
                commissionTurnover: true,
                commissionCycleStartedAt: true,
            },
        });

        if (!currentUser) {
            return 0;
        }

        const updateData: Record<string, unknown> = {
            commissionTurnover: { increment: new Decimal(normalizedTurnover) },
        };

        if (
            !currentUser.commissionCycleStartedAt ||
            this.toNumber(currentUser.commissionTurnover) <= 0
        ) {
            updateData.commissionCycleStartedAt = occurredAt;
        }

        const updated = await db.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                commissionTurnover: true,
            },
        });

        return this.toNumber(updated.commissionTurnover);
    }

    static async getUserCommissionState(userId: number) {
        const [context, setting] = await Promise.all([
            this.getCommissionContext(userId),
            this.getSetting(),
        ]);

        const { turnover, periodStart, periodEnd } = context;

        return {
            claimable: this.calculateClaimable(turnover, setting),
            rate: this.toNumber(setting?.rate),
            turnover,
            minTurnover: this.toNumber(setting?.minTurnover),
            maxReward: this.toNumber(setting?.maxReward),
            requiresTurnover: setting?.requiresTurnover === true,
            turnoverMultiplier: Math.max(1, this.toNumber(setting?.turnoverMultiplier || 1)),
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
            isClaimed: false,
        };
    }

    static async claim(userId: number) {
        const [context, setting] = await Promise.all([
            this.getCommissionContext(userId),
            this.getSetting(),
        ]);

        const { user, turnover, periodStart, periodEnd } = context;
        const amount = this.calculateClaimable(turnover, setting);
        if (amount <= 0) {
            throw new Error('No reward amount to claim');
        }
        const requiresTurnover = setting?.requiresTurnover === true;
        const turnoverMultiplier = Math.max(1, this.toNumber(setting?.turnoverMultiplier || 1));

        const insertResult = await prisma.$queryRaw<{ id: number }[]>`
            INSERT INTO "RewardClaim" ("userId", "type", "amount", "periodStart", "periodEnd", "claimedAt")
            SELECT ${userId}, 'COMMISSION', ${amount}, ${periodStart}, ${periodEnd}, NOW()
            WHERE NOT EXISTS (
                SELECT 1 FROM "RewardClaim"
                WHERE "userId" = ${userId}
                  AND "type" = 'COMMISSION'
                  AND "periodStart" = ${periodStart}
            )
            RETURNING id;
        `;

        if (!insertResult.length) {
            throw new Error('Already claimed or currently processing');
        }

        const claimId = insertResult[0].id;

        try {
            if (!requiresTurnover) {
                await AgentWalletService.creditMainAgent(
                    userId,
                    amount,
                    `REWARD_COMMISSION_${claimId}`,
                    'Commission reward claim',
                    claimId
                );
            }

            const cycleResetAt = thaiNow().toDate();

            return await prisma.$transaction(async (tx) => {
                const updatedUser = await tx.user.update({
                    where: { id: userId },
                    data: {
                        ...(requiresTurnover
                            ? { bonusBalance: { increment: new Decimal(amount) } }
                            : { balance: { increment: amount } }),
                        commissionTurnover: new Decimal(0),
                        commissionCycleStartedAt: cycleResetAt,
                    },
                });

                let turnoverApplied = 0;
                if (requiresTurnover) {
                    turnoverApplied = await TurnoverService.addRequirement(
                        userId,
                        amount,
                        turnoverMultiplier,
                        `COMMISSION for period ${periodStart.toISOString()} - ${periodEnd.toISOString()}`,
                        tx
                    );
                }

                await tx.transaction.create({
                    data: {
                        userId,
                        type: 'REWARD_COMMISSION',
                        amount: new Decimal(amount),
                        balanceBefore: requiresTurnover
                            ? new Decimal(Number(updatedUser.bonusBalance) - amount)
                            : new Decimal(Number(updatedUser.balance) - amount),
                        balanceAfter: requiresTurnover
                            ? updatedUser.bonusBalance
                            : updatedUser.balance,
                        status: 'COMPLETED',
                        note: requiresTurnover
                            ? `COMMISSION for period ${periodStart.toISOString()} - ${periodEnd.toISOString()} (Turnover x${turnoverMultiplier})`
                            : `COMMISSION for period ${periodStart.toISOString()} - ${periodEnd.toISOString()}`,
                    },
                });

                return {
                    success: true,
                    amount,
                    balance: updatedUser.balance,
                    bonusBalance: updatedUser.bonusBalance,
                    walletType: requiresTurnover ? 'BONUS' : 'BALANCE',
                    turnoverApplied,
                    periodStart: periodStart.toISOString(),
                    periodEnd: periodEnd.toISOString(),
                };
            });
        } catch (error) {
            await prisma.rewardClaim.delete({ where: { id: claimId } }).catch(() => {});
            throw error;
        }
    }

    static async listPendingUsers({
        page,
        limit,
        search,
    }: {
        page: number;
        limit: number;
        search?: string;
    }) {
        const setting = await this.getSetting();
        if (!setting?.isActive) {
            return {
                data: [],
                total: 0,
                page,
                limit,
            };
        }

        const minTurnover = this.toNumber(setting.minTurnover);
        const skip = (page - 1) * limit;
        const where: Record<string, unknown> = {
            status: { not: 'DELETED' },
        };

        if (search?.trim()) {
            where.OR = [
                { username: { contains: search.trim(), mode: 'insensitive' } },
                { phone: { contains: search.trim() } },
                { fullName: { contains: search.trim(), mode: 'insensitive' } },
            ];
        }

        const nexusAgentId = await this.getNexusAgentId();
        const allUsers = await prisma.user.findMany({
            where,
            select: {
                id: true,
                username: true,
                fullName: true,
                phone: true,
                betflixUsername: true,
                commissionTurnover: true,
                commissionCycleStartedAt: true,
                createdAt: true,
                externalAccounts: nexusAgentId
                    ? {
                        where: { agentId: nexusAgentId },
                        select: {
                            agentId: true,
                            externalUsername: true,
                        },
                    }
                    : false,
                rewards: {
                    where: { type: 'COMMISSION' },
                    orderBy: { claimedAt: 'desc' },
                    take: 1,
                    select: { periodEnd: true },
                },
            },
        });

        const batchSize = 10;
        const rankedUsers: Array<{
            id: number;
            username: string | null;
            fullName: string | null;
            phone: string | null;
            turnover: number;
            rewardAmount: number;
            periodStart: Date;
            periodEnd: Date;
        }> = [];

        for (let index = 0; index < allUsers.length; index += batchSize) {
            const batch = allUsers.slice(index, index + batchSize);
            const batchResults = await Promise.all(
                batch.map(async (user) => {
                    const periodStart = this.getPeriodStart({
                        cycleStartedAt: user.commissionCycleStartedAt,
                        lastClaimedPeriodEnd: user.rewards[0]?.periodEnd || null,
                        createdAt: user.createdAt,
                    });
                    const periodEnd = thaiNow().toDate();
                    const hasPriorClaim = user.rewards.length > 0;
                    const turnover = await this.getTurnoverForUser({
                        userId: user.id,
                        phone: user.phone,
                        betflixUsername: user.betflixUsername,
                        betflixTurnover: user.commissionTurnover,
                        externalAccounts: Array.isArray(user.externalAccounts) ? user.externalAccounts : false,
                        periodStart,
                        periodEnd,
                        allowLiveBootstrapBetflix: !user.commissionCycleStartedAt && !hasPriorClaim,
                    });
                    const rewardAmount = this.calculateClaimable(turnover, setting);

                    if (turnover < minTurnover || rewardAmount <= 0) {
                        return null;
                    }

                    return {
                        id: user.id,
                        username: user.username,
                        fullName: user.fullName,
                        phone: user.phone,
                        turnover,
                        rewardAmount,
                        periodStart,
                        periodEnd,
                    };
                })
            );

            rankedUsers.push(...batchResults.filter((item): item is NonNullable<typeof item> => Boolean(item)));
        }

        rankedUsers.sort((left, right) => {
            if (right.turnover !== left.turnover) {
                return right.turnover - left.turnover;
            }
            return left.id - right.id;
        });

        const total = rankedUsers.length;
        const users = rankedUsers.slice(skip, skip + limit);
        const totalRewardAmount = rankedUsers.reduce((sum, user) => sum + user.rewardAmount, 0);

        const data = users.map((user) => {
            return {
                id: user.id,
                userId: user.id,
                type: 'COMMISSION',
                statDate: thaiNow().startOf('day').toISOString(),
                periodStart: user.periodStart.toISOString(),
                periodEnd: user.periodEnd.toISOString(),
                turnover: user.turnover,
                netLoss: 0,
                rewardAmount: user.rewardAmount,
                isClaimed: false,
                claimedAt: null,
                user: {
                    username: user.username,
                    fullName: user.fullName,
                    phone: user.phone,
                },
            };
        });

        return {
            data,
            total,
            page,
            limit,
            totalRewardAmount,
        };
    }
}

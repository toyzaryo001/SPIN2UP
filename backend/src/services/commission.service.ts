import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import dayjs from 'dayjs';
import prisma from '../lib/db.js';
import { AgentWalletService } from './agent-wallet.service.js';
import { THAI_UTC_OFFSET, thaiNow } from '../lib/thai-time.js';
import { BetflixService } from './betflix.service.js';
import { NexusProvider } from './agents/NexusProvider.js';
import { TurnoverService } from './turnover.service.js';

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

    private static formatThaiDateTime(value: Date) {
        return dayjs(value).utcOffset(THAI_UTC_OFFSET).format('YYYY-MM-DD HH:mm:ss');
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

    private static async getLiveTurnoverForUser(args: {
        betflixUsername?: string | null;
        nexusUsername?: string | null;
        periodStart: Date;
        periodEnd: Date;
    }) {
        const periodStartDate = args.periodStart;
        const periodEndDate = args.periodEnd;
        const betflixStart = this.formatThaiDateTime(periodStartDate);
        const betflixEnd = this.formatThaiDateTime(periodEndDate);
        const nexus = args.nexusUsername ? new NexusProvider() : null;

        const [betflixResult, nexusResult] = await Promise.allSettled([
            args.betflixUsername
                ? BetflixService.getReportSummary(args.betflixUsername, betflixStart, betflixEnd)
                : Promise.resolve(null),
            args.nexusUsername && nexus
                ? nexus.getUnifiedGameLog(args.nexusUsername, betflixStart, betflixEnd)
                : Promise.resolve(null),
        ]);

        let turnover = 0;

        if (betflixResult.status === 'fulfilled' && betflixResult.value) {
            turnover += this.toNumber(
                betflixResult.value.valid_amount
                || betflixResult.value.turnover
                || betflixResult.value.valid_bet
            );
        }

        if (nexusResult.status === 'fulfilled' && nexusResult.value) {
            turnover += this.toNumber(nexusResult.value.totalBet);
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
                commissionCycleStartedAt: true,
                externalAccounts: nexusAgentId
                    ? {
                        where: { agentId: nexusAgentId },
                        select: {
                            externalUsername: true,
                        },
                    }
                    : false,
            },
        });

        if (!user) {
            throw new Error('User not found');
        }

        const periodStart = user.commissionCycleStartedAt || thaiNow().toDate();
        const periodEnd = thaiNow().toDate();
        const nexus = nexusAgentId ? new NexusProvider() : null;
        const localNexusUsername = Array.isArray(user.externalAccounts) && user.externalAccounts.length > 0
            ? user.externalAccounts[0].externalUsername
            : null;
        const nexusUsername = localNexusUsername || (nexus ? await nexus.buildFallbackUsername(user.phone) : null);
        const turnover = await this.getLiveTurnoverForUser({
            betflixUsername: user.betflixUsername,
            nexusUsername,
            periodStart,
            periodEnd,
        });

        return {
            user,
            turnover,
            periodStart,
            periodEnd,
            nexusUsername,
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
                commissionCycleStartedAt: true,
                externalAccounts: nexusAgentId
                    ? {
                        where: { agentId: nexusAgentId },
                        select: {
                            externalUsername: true,
                        },
                    }
                    : false,
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
                    const periodStart = user.commissionCycleStartedAt || thaiNow().toDate();
                    const periodEnd = thaiNow().toDate();
                    const nexus = nexusAgentId ? new NexusProvider() : null;
                    const localNexusUsername = Array.isArray(user.externalAccounts) && user.externalAccounts.length > 0
                        ? user.externalAccounts[0].externalUsername
                        : null;
                    const nexusUsername = localNexusUsername || (nexus ? await nexus.buildFallbackUsername(user.phone) : null);
                    const turnover = await this.getLiveTurnoverForUser({
                        betflixUsername: user.betflixUsername,
                        nexusUsername,
                        periodStart,
                        periodEnd,
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

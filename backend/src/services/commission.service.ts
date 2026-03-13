import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../lib/db.js';
import { BetflixService } from './betflix.service.js';
import { thaiNow } from '../lib/thai-time.js';
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
    private static toNumber(value: unknown) {
        return Number(value || 0);
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
        const [user, setting] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    commissionTurnover: true,
                    commissionCycleStartedAt: true,
                },
            }),
            this.getSetting(),
        ]);

        if (!user) {
            throw new Error('User not found');
        }

        const turnover = this.toNumber(user.commissionTurnover);
        const periodStart = user.commissionCycleStartedAt || thaiNow().toDate();
        const periodEnd = thaiNow().toDate();

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
        const [user, setting] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    phone: true,
                    balance: true,
                    betflixUsername: true,
                    commissionTurnover: true,
                    commissionCycleStartedAt: true,
                },
            }),
            this.getSetting(),
        ]);

        if (!user) {
            throw new Error('User not found');
        }

        const turnover = this.toNumber(user.commissionTurnover);
        const amount = this.calculateClaimable(turnover, setting);
        if (amount <= 0) {
            throw new Error('No reward amount to claim');
        }
        const requiresTurnover = setting?.requiresTurnover === true;
        const turnoverMultiplier = Math.max(1, this.toNumber(setting?.turnoverMultiplier || 1));

        const periodStart = user.commissionCycleStartedAt || thaiNow().toDate();
        const periodEnd = thaiNow().toDate();

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
            const betflixResult = await BetflixService.ensureAndTransfer(
                userId,
                user.phone,
                user.betflixUsername,
                amount,
                `REWARD_COMMISSION_${claimId}`
            );

            if (!betflixResult.success) {
                throw new Error(betflixResult.error || 'Cannot transfer commission reward');
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
            commissionTurnover: { gte: new Decimal(minTurnover) },
        };

        if (search?.trim()) {
            where.OR = [
                { username: { contains: search.trim(), mode: 'insensitive' } },
                { phone: { contains: search.trim() } },
                { fullName: { contains: search.trim(), mode: 'insensitive' } },
            ];
        }

        const [total, users, summaryUsers] = await Promise.all([
            prisma.user.count({ where }),
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    username: true,
                    fullName: true,
                    phone: true,
                    commissionTurnover: true,
                    commissionCycleStartedAt: true,
                },
                orderBy: [
                    { commissionTurnover: 'desc' },
                    { id: 'asc' },
                ],
                skip,
                take: limit,
            }),
            prisma.user.findMany({
                where,
                select: {
                    commissionTurnover: true,
                },
            }),
        ]);

        const data = users.map((user) => {
            const turnover = this.toNumber(user.commissionTurnover);
            const rewardAmount = this.calculateClaimable(turnover, setting);
            const periodStart = user.commissionCycleStartedAt || thaiNow().toDate();
            const periodEnd = thaiNow().toDate();

            return {
                id: user.id,
                userId: user.id,
                type: 'COMMISSION',
                statDate: thaiNow().startOf('day').toISOString(),
                periodStart: periodStart.toISOString(),
                periodEnd: periodEnd.toISOString(),
                turnover,
                netLoss: 0,
                rewardAmount,
                isClaimed: false,
                claimedAt: null,
                user: {
                    username: user.username,
                    fullName: user.fullName,
                    phone: user.phone,
                },
            };
        });

        const totalRewardAmount = summaryUsers.reduce((sum, user) => {
            return sum + this.calculateClaimable(this.toNumber(user.commissionTurnover), setting);
        }, 0);

        return {
            data,
            total,
            page,
            limit,
            totalRewardAmount,
        };
    }
}

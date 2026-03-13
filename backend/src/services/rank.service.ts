import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../lib/db.js';
import { TurnoverService } from './turnover.service.js';

type RankDb = Prisma.TransactionClient | typeof prisma;

export type RankTier = {
    id: string;
    name: string;
    logo?: string;
    icon?: string;
    minDeposit: number;
    rewardAmount: number;
    rewardTurnover: number;
    colorFrom: string;
    colorTo: string;
};

export class RankService {
    static readonly SETTING_KEY = 'rank_tiers';

    static readonly DEFAULT_RANK_TIERS: RankTier[] = [
        { id: 'bronze', name: 'Bronze', icon: '🥉', logo: '', minDeposit: 0, rewardAmount: 0, rewardTurnover: 0, colorFrom: '#CD7F32', colorTo: '#A0522D' },
        { id: 'silver', name: 'Silver', icon: '🥈', logo: '', minDeposit: 5000, rewardAmount: 100, rewardTurnover: 500, colorFrom: '#C0C0C0', colorTo: '#A8A8A8' },
        { id: 'gold', name: 'Gold', icon: '🥇', logo: '', minDeposit: 20000, rewardAmount: 300, rewardTurnover: 1500, colorFrom: '#FFD700', colorTo: '#FFA500' },
        { id: 'platinum', name: 'Platinum', icon: '💎', logo: '', minDeposit: 50000, rewardAmount: 800, rewardTurnover: 4000, colorFrom: '#00CED1', colorTo: '#4169E1' },
        { id: 'diamond', name: 'Diamond', icon: '👑', logo: '', minDeposit: 100000, rewardAmount: 1500, rewardTurnover: 8000, colorFrom: '#9B59B6', colorTo: '#E91E63' },
    ];

    private static toNumber(value: unknown) {
        return Number(value || 0);
    }

    static normalizeTiers(rawTiers: unknown): RankTier[] {
        if (!Array.isArray(rawTiers) || rawTiers.length === 0) {
            return this.DEFAULT_RANK_TIERS;
        }

        return rawTiers
            .map((tier: any, index: number) => ({
                id: String(tier.id || `tier_${index + 1}`).trim(),
                name: String(tier.name || `Tier ${index + 1}`).trim(),
                logo: String(tier.logo || '').trim(),
                icon: String(tier.icon || '🏅').trim(),
                minDeposit: this.toNumber(tier.minDeposit),
                rewardAmount: this.toNumber(tier.rewardAmount),
                rewardTurnover: this.toNumber(tier.rewardTurnover),
                colorFrom: String(tier.colorFrom || '#64748B').trim(),
                colorTo: String(tier.colorTo || '#334155').trim(),
            }))
            .filter((tier) => tier.id && tier.name)
            .sort((a, b) => a.minDeposit - b.minDeposit);
    }

    static async getTiers(db: RankDb = prisma) {
        const setting = await db.setting.findUnique({
            where: { key: this.SETTING_KEY },
        });

        if (!setting?.value) {
            return this.DEFAULT_RANK_TIERS;
        }

        try {
            return this.normalizeTiers(JSON.parse(setting.value));
        } catch {
            return this.DEFAULT_RANK_TIERS;
        }
    }

    static async saveTiers(rawTiers: unknown, db: RankDb = prisma) {
        const tiers = this.normalizeTiers(rawTiers);

        if (tiers.length === 0) {
            throw new Error('RANK_TIERS_REQUIRED');
        }

        const uniqueIds = new Set<string>();
        for (const tier of tiers) {
            if (uniqueIds.has(tier.id)) {
                throw new Error('RANK_TIER_ID_DUPLICATED');
            }
            uniqueIds.add(tier.id);
        }

        await db.setting.upsert({
            where: { key: this.SETTING_KEY },
            update: { value: JSON.stringify(tiers) },
            create: { key: this.SETTING_KEY, value: JSON.stringify(tiers) },
        });

        return tiers;
    }

    static async getUserTotalDeposit(userId: number, db: RankDb = prisma) {
        const aggregate = await db.transaction.aggregate({
            _sum: { amount: true },
            where: {
                userId,
                type: 'DEPOSIT',
                status: { in: ['APPROVED', 'COMPLETED'] },
            },
        });

        return this.toNumber(aggregate._sum.amount);
    }

    static async getUserRankStatus(userId: number, db: RankDb = prisma) {
        const [tiers, totalDeposit, claims] = await Promise.all([
            this.getTiers(db),
            this.getUserTotalDeposit(userId, db),
            db.rankRewardClaim.findMany({
                where: { userId },
                orderBy: { claimedAt: 'asc' },
            }),
        ]);

        const claimsMap = new Map(claims.map((claim) => [claim.rankTierId, claim]));
        const currentTier = tiers.reduce<RankTier | null>((matched, tier) => {
            if (totalDeposit >= tier.minDeposit) {
                return tier;
            }
            return matched;
        }, null);

        return {
            totalDeposit,
            currentTierId: currentTier?.id || null,
            currentTierName: currentTier?.name || null,
            claims: claims.map((claim) => ({
                rankTierId: claim.rankTierId,
                rankName: claim.rankName,
                rewardAmount: this.toNumber(claim.rewardAmount),
                turnoverAmount: this.toNumber(claim.turnoverAmount),
                claimedAt: claim.claimedAt,
            })),
            tiers: tiers.map((tier) => {
                const existingClaim = claimsMap.get(tier.id);
                const unlocked = totalDeposit >= tier.minDeposit;
                const claimable = unlocked && !existingClaim && this.toNumber(tier.rewardAmount) > 0;

                return {
                    ...tier,
                    unlocked,
                    claimable,
                    claimedAt: existingClaim?.claimedAt || null,
                    alreadyClaimed: !!existingClaim,
                    remainingDeposit: unlocked ? 0 : Math.max(0, tier.minDeposit - totalDeposit),
                };
            }),
        };
    }

    static async claimRankReward(userId: number, rankTierId: string) {
        const normalizedTierId = String(rankTierId || '').trim();
        if (!normalizedTierId) {
            throw new Error('RANK_TIER_NOT_FOUND');
        }

        return prisma.$transaction(async (tx) => {
            const tiers = await this.getTiers(tx);
            const tier = tiers.find((item) => item.id === normalizedTierId);

            if (!tier) {
                throw new Error('RANK_TIER_NOT_FOUND');
            }

            if (this.toNumber(tier.rewardAmount) <= 0) {
                throw new Error('RANK_REWARD_NOT_AVAILABLE');
            }

            const totalDeposit = await this.getUserTotalDeposit(userId, tx);
            if (totalDeposit < tier.minDeposit) {
                throw new Error('RANK_NOT_UNLOCKED');
            }

            const existingClaim = await tx.rankRewardClaim.findUnique({
                where: {
                    userId_rankTierId: {
                        userId,
                        rankTierId: tier.id,
                    },
                },
            });

            if (existingClaim) {
                throw new Error('RANK_ALREADY_CLAIMED');
            }

            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                    bonusBalance: { increment: new Decimal(tier.rewardAmount) },
                },
                select: {
                    bonusBalance: true,
                },
            });

            if (this.toNumber(tier.rewardTurnover) > 0) {
                await TurnoverService.addManualRequirement(userId, tier.rewardTurnover, tx);
            }

            const claim = await tx.rankRewardClaim.create({
                data: {
                    userId,
                    rankTierId: tier.id,
                    rankName: tier.name,
                    rewardAmount: new Decimal(tier.rewardAmount),
                    turnoverAmount: new Decimal(tier.rewardTurnover),
                    totalDepositAtClaim: new Decimal(totalDeposit),
                },
            });

            await tx.transaction.create({
                data: {
                    userId,
                    type: 'BONUS',
                    subType: 'RANK_REWARD',
                    amount: new Decimal(tier.rewardAmount),
                    balanceBefore: new Decimal(Number(updatedUser.bonusBalance) - tier.rewardAmount),
                    balanceAfter: updatedUser.bonusBalance,
                    status: 'COMPLETED',
                    note: this.toNumber(tier.rewardTurnover) > 0
                        ? `Rank Reward: ${tier.name} (Turnover ${tier.rewardTurnover})`
                        : `Rank Reward: ${tier.name}`,
                },
            });

            return {
                id: claim.id,
                rankTierId: claim.rankTierId,
                rankName: claim.rankName,
                rewardAmount: this.toNumber(claim.rewardAmount),
                turnoverAmount: this.toNumber(claim.turnoverAmount),
                claimedAt: claim.claimedAt,
            };
        });
    }
}

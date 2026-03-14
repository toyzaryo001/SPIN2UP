import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../lib/db';
import { AgentWalletService } from './agent-wallet.service.js';
import { BetflixService } from './betflix.service';
import { NexusProvider } from './agents/NexusProvider';
import { thaiNow, thaiStartOfDay, thaiEndOfDay } from '../lib/thai-time';
import { CommissionService } from './commission.service.js';
import { TurnoverService } from './turnover.service.js';

// Types for Reward Calculation
interface RewardStats {
    cashback: {
        claimable: number;
        rate: number;
        netLoss: number;
        minLoss: number;
        maxReward: number;
        requiresTurnover: boolean;
        turnoverMultiplier: number;
        periodStart: string;
        periodEnd: string;
        isClaimed: boolean;
    };
    commission: {
        claimable: number;
        rate: number;
        turnover: number;
        minTurnover: number;
        maxReward: number;
        periodStart: string;
        periodEnd: string;
        isClaimed: boolean;
    };
}

export class RewardService {
    private static getStatDate(periodStart: string) {
        return thaiStartOfDay(periodStart).toDate();
    }

    /**
     * Get current reward stats for a user (Cashback & Commission)
     */
    static async getRewardStats(userId: number): Promise<RewardStats> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { externalAccounts: true }
        });
        if (!user) {
            throw new Error('User not found');
        }

        // 1. Get Settings
        const cashbackSetting = await prisma.cashbackSetting.findFirst();
        // Defaults if not set
        const cbRate = Number(cashbackSetting?.rate || 0); // e.g. 5%
        const cbMinLoss = Number(cashbackSetting?.minLoss || 100);
        const cbMax = Number(cashbackSetting?.maxCashback || 10000);

        // 2. Define Period (Daily for now, widely used)
        // Cashback: Yesterday (00:00 - 23:59) -> Claimable Today
        const yesterday = thaiNow().subtract(1, 'day');
        const periodStart = thaiStartOfDay(yesterday.toDate()).format('YYYY-MM-DD HH:mm:ss');
        const periodEnd = thaiEndOfDay(yesterday.toDate()).format('YYYY-MM-DD HH:mm:ss');
        // 3. Check if already claimed
        const claims = await prisma.rewardClaim.findMany({
            where: {
                userId,
                periodStart: { gte: new Date(periodStart) }, // Simple check by period approx
                // better to check overlapping ranges or exact date match if we store 'date'
                // For this implementation, we rely on periodStart being exactly yesterday 00:00
            }
        });

        const cashbackClaimed = claims.find(c => c.type === 'CASHBACK');
        // 4. Fetch Report Data from ALL agents (BetFlix + Nexus)
        let winLoss = 0;

        // Build fetch promises for all agents
        const fetchPromises: Promise<{ turnover: number; winLoss: number }>[] = [];

        // 4a. BetFlix
        if (user.betflixUsername) {
            fetchPromises.push(
                BetflixService.getReportSummary(
                    user.betflixUsername,
                    yesterday.format('YYYY-MM-DD'),
                    yesterday.format('YYYY-MM-DD')
                ).then(report => ({
                    turnover: Number(report?.valid_amount || report?.turnover || 0),
                    winLoss: Number(report?.winloss || 0)
                })).catch(err => {
                    console.error('[Reward] BetFlix report error:', err.message);
                    return { turnover: 0, winLoss: 0 };
                })
            );
        }

        // 4b. Nexus — ดึงจาก UserExternalAccount (กรองด้วย agent code)
        const nexusAgentConfig = await prisma.agentConfig.findUnique({ where: { code: 'NEXUS' } });
        const nexusAccount = nexusAgentConfig
            ? user.externalAccounts?.find(
                (acc: any) => acc.agentId === nexusAgentConfig.id && acc.externalUsername
            )
            : null;
        const nexus = nexusAgentConfig ? new NexusProvider() : null;
        const nexusUsername = nexusAccount?.externalUsername || (nexus ? await nexus.buildFallbackUsername(user.phone) : null);
        if (nexusUsername) {
            fetchPromises.push(
                (async () => {
                    try {
                        const log = await nexus!.getGameLog(
                            nexusUsername,
                            periodStart,
                            periodEnd
                        );
                        if (log) {
                            return {
                                turnover: log.totalBet,
                                winLoss: log.totalWin - log.totalBet // Positive = win, Negative = loss
                            };
                        }
                    } catch (err: any) {
                        console.error('[Reward] Nexus report error:', err.message);
                    }
                    return { turnover: 0, winLoss: 0 };
                })()
            );
        }

        // Fetch all agents in parallel — one agent down won't affect the other
        const results = await Promise.allSettled(fetchPromises);
        for (const r of results) {
            if (r.status === 'fulfilled') {
                winLoss += r.value.winLoss;
            }
        }

        // 5. Calculate Cashback
        // Net Loss = -winLoss (if winLoss is negative)
        // If winLoss is positive (User won), Loss is 0.
        const netLoss = winLoss < 0 ? Math.abs(winLoss) : 0;
        let claimableCashback = 0;

        const currentDay = thaiNow().day(); // 0(Sun) - 6(Sat)
        const currentHour = thaiNow().hour(); // 0-23
        const cbDay = Number(cashbackSetting?.dayOfWeek ?? 1);
        const cbStart = Number(cashbackSetting?.claimStartHour ?? 0);
        const cbEnd = Number(cashbackSetting?.claimEndHour ?? 23);

        const isDayValid = cbDay === 7 || cbDay === currentDay;
        const isTimeValid = currentHour >= cbStart && currentHour <= cbEnd;

        if (cashbackSetting?.isActive && netLoss >= cbMinLoss && isDayValid && isTimeValid) {
            claimableCashback = Math.floor(netLoss * (cbRate / 100));
            if (claimableCashback > cbMax) claimableCashback = cbMax;
        }

        const commission = await CommissionService.getUserCommissionState(userId);

        return {
            cashback: {
                claimable: claimableCashback,
                rate: cbRate,
                netLoss,
                minLoss: cbMinLoss,
                maxReward: cbMax,
                requiresTurnover: cashbackSetting?.requiresTurnover === true,
                turnoverMultiplier: Math.max(1, Number(cashbackSetting?.turnoverMultiplier || 1)),
                periodStart,
                periodEnd,
                isClaimed: !!cashbackClaimed
            },
            commission
        };
    }

    /**
     * Claim reward
     */
    static async claimReward(userId: number, type: 'CASHBACK' | 'COMMISSION') {
        if (type === 'COMMISSION') {
            return CommissionService.claim(userId);
        }

        const stats = await this.getRewardStats(userId);
        const target = type === 'CASHBACK' ? stats.cashback : stats.commission;

        if (target.isClaimed) {
            throw new Error('Already claimed for this period');
        }

        if (target.claimable <= 0) {
            throw new Error('No reward amount to claim');
        }

        const amount = target.claimable;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');
        const cashbackSetting = await prisma.cashbackSetting.findFirst();
        const requiresTurnover = cashbackSetting?.requiresTurnover === true;
        const turnoverMultiplier = Math.max(1, Number(cashbackSetting?.turnoverMultiplier || 1));

        // ============================================
        // PREPARE SAGA: 1. Create PRE-CLAIM Record
        // ============================================
        // Check and create atomically using Raw SQL to prevent Race Conditions without needing Schema Unique constraints
        // This query inserts ONLY IF no other claim exists for this user + type + periodStart
        // RETURNING id gives us the newly created claim ID, or undefined if it was skipped (race condition won)
        const insertResult: any[] = await prisma.$queryRaw`
            INSERT INTO "RewardClaim" ("userId", "type", "amount", "periodStart", "periodEnd", "claimedAt")
            SELECT ${userId}, ${type}, ${amount}, ${new Date(target.periodStart)}, ${new Date(target.periodEnd)}, NOW()
            WHERE NOT EXISTS (
                SELECT 1 FROM "RewardClaim" 
                WHERE "userId" = ${userId} 
                  AND "type" = ${type} 
                  AND "periodStart" = ${new Date(target.periodStart)}
            )
            RETURNING id;
        `;

        if (!insertResult || insertResult.length === 0) {
            throw new Error('Already claimed or currently processing');
        }

        const claimRecordId = insertResult[0].id;

        // ============================================
        // BETFLIX SYNC: Deposit to Game Wallet MUST Happen AFTER DB lock
        // ============================================
        try {
            if (!requiresTurnover) {
                await AgentWalletService.creditMainAgent(
                    userId,
                    amount,
                    `REWARD_${type}_${claimRecordId}`,
                    `${type} reward claim`,
                    claimRecordId
                );
            }

            // ============================================
            // COMPLETE SAGA: 2. Confirm Claim & Update Balance
            // ============================================
            return await prisma.$transaction(async (tx) => {
                const statDate = RewardService.getStatDate(target.periodStart);
                const existingSnapshot = await tx.rewardUserSnapshot.findUnique({
                    where: {
                        userId_type_statDate: {
                            userId,
                            type,
                            statDate
                        }
                    }
                });

                const updatedUser = await tx.user.update({
                    where: { id: userId },
                    data: requiresTurnover
                        ? { bonusBalance: { increment: new Decimal(amount) } }
                        : { balance: { increment: amount } }
                });

                let turnoverApplied = 0;
                if (requiresTurnover) {
                    turnoverApplied = await TurnoverService.addRequirement(
                        userId,
                        amount,
                        turnoverMultiplier,
                        `CASHBACK for period ${target.periodStart.split(' ')[0]}`,
                        tx
                    );
                }

                await tx.transaction.create({
                    data: {
                        userId,
                        type: type === 'CASHBACK' ? 'REWARD_CASHBACK' : 'REWARD_COMMISSION',
                        amount: new Decimal(amount),
                        balanceBefore: requiresTurnover
                            ? new Decimal(Number(updatedUser.bonusBalance) - amount)
                            : new Decimal(Number(updatedUser.balance) - amount),
                        balanceAfter: requiresTurnover
                            ? updatedUser.bonusBalance
                            : updatedUser.balance,
                        status: 'COMPLETED',
                        note: requiresTurnover
                            ? `${type} for period ${target.periodStart.split(' ')[0]} (Turnover x${turnoverMultiplier})`
                            : `${type} for period ${target.periodStart.split(' ')[0]}`
                    }
                });

                await tx.rewardUserSnapshot.upsert({
                    where: {
                        userId_type_statDate: {
                            userId,
                            type,
                            statDate
                        }
                    },
                    update: {
                        periodStart: new Date(target.periodStart),
                        periodEnd: new Date(target.periodEnd),
                        rewardAmount: amount,
                        isClaimed: true,
                        claimedAt: new Date()
                    },
                    create: {
                        userId,
                        type,
                        statDate,
                        periodStart: new Date(target.periodStart),
                        periodEnd: new Date(target.periodEnd),
                        rewardAmount: amount,
                        isClaimed: true,
                        claimedAt: new Date()
                    }
                });

                await tx.rewardDailyStat.upsert({
                    where: {
                        type_statDate: {
                            type,
                            statDate
                        }
                    },
                    update: {
                        periodStart: new Date(target.periodStart),
                        periodEnd: new Date(target.periodEnd),
                        ...(existingSnapshot
                            ? {}
                            : {
                                eligibleUserCount: { increment: 1 },
                                totalCalculatedAmount: { increment: amount }
                            }),
                        ...(!existingSnapshot || !existingSnapshot.isClaimed
                            ? {
                                claimedUserCount: { increment: 1 },
                                claimCount: { increment: 1 },
                                totalClaimedAmount: { increment: amount }
                            }
                            : {}),
                        ...(existingSnapshot && !existingSnapshot.isClaimed
                            ? { unclaimedUserCount: { decrement: 1 } }
                            : {})
                    },
                    create: {
                        type,
                        statDate,
                        periodStart: new Date(target.periodStart),
                        periodEnd: new Date(target.periodEnd),
                        eligibleUserCount: 1,
                        claimedUserCount: 1,
                        unclaimedUserCount: 0,
                        claimCount: 1,
                        totalCalculatedAmount: amount,
                        totalClaimedAmount: amount
                    }
                });

                return {
                    success: true,
                    amount,
                    balance: updatedUser.balance,
                    bonusBalance: updatedUser.bonusBalance,
                    walletType: requiresTurnover ? 'BONUS' : 'BALANCE',
                    turnoverApplied,
                };
            });

        } catch (error: any) {
            // ============================================
            // ROLLBACK SAGA: Remove claim record so they can try again
            // ============================================
            console.error('[Reward] Claim failed, rolling back claim record', error);
            await prisma.rewardClaim.delete({ where: { id: claimRecordId } }).catch(() => { });
            throw error;
        }
    }
}

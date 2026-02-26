import prisma from '../lib/db';
import { BetflixService } from './betflix.service';
import { NexusProvider } from './agents/NexusProvider';
import dayjs from 'dayjs';

// Types for Reward Calculation
interface RewardStats {
    cashback: {
        claimable: number;
        rate: number;
        netLoss: number;
        minLoss: number;
        maxReward: number;
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
        const turnoverSetting = await prisma.turnoverSetting.findFirst();

        // Defaults if not set
        const cbRate = Number(cashbackSetting?.rate || 0); // e.g. 5%
        const cbMinLoss = Number(cashbackSetting?.minLoss || 100);
        const cbMax = Number(cashbackSetting?.maxCashback || 10000);

        const toRate = Number(turnoverSetting?.rate || 0); // e.g. 0.5%
        const toMin = Number(turnoverSetting?.minTurnover || 100);
        const toMax = Number(turnoverSetting?.maxReward || 10000);

        // 2. Define Period (Daily for now, widely used)
        // Cashback: Yesterday (00:00 - 23:59) -> Claimable Today
        const yesterday = dayjs().subtract(1, 'day');
        const periodStart = yesterday.format('YYYY-MM-DD 00:00:00');
        const periodEnd = yesterday.format('YYYY-MM-DD 23:59:59');
        const dateKey = yesterday.format('YYYY-MM-DD'); // Used for checking claims

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
        const commissionClaimed = claims.find(c => c.type === 'COMMISSION');

        // 4. Fetch Report Data from ALL agents (BetFlix + Nexus)
        let turnover = 0;
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
        if (nexusAccount) {
            fetchPromises.push(
                (async () => {
                    try {
                        const nexus = new NexusProvider();
                        const log = await nexus.getGameLog(
                            nexusAccount.externalUsername,
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
                turnover += r.value.turnover;
                winLoss += r.value.winLoss;
            }
        }

        // 5. Calculate Cashback
        // Net Loss = -winLoss (if winLoss is negative)
        // If winLoss is positive (User won), Loss is 0.
        const netLoss = winLoss < 0 ? Math.abs(winLoss) : 0;
        let claimableCashback = 0;

        if (cashbackSetting?.isActive && netLoss >= cbMinLoss) {
            claimableCashback = Math.floor(netLoss * (cbRate / 100));
            if (claimableCashback > cbMax) claimableCashback = cbMax;
        }

        // 6. Calculate Commission
        let claimableCommission = 0;
        if (turnoverSetting?.isActive && turnover >= toMin) {
            claimableCommission = Number((turnover * (toRate / 100)).toFixed(2));
            if (claimableCommission > toMax) claimableCommission = toMax;
        }

        return {
            cashback: {
                claimable: claimableCashback,
                rate: cbRate,
                netLoss,
                minLoss: cbMinLoss,
                maxReward: cbMax,
                periodStart,
                periodEnd,
                isClaimed: !!cashbackClaimed
            },
            commission: {
                claimable: claimableCommission,
                rate: toRate,
                turnover,
                minTurnover: toMin,
                maxReward: toMax,
                periodStart,
                periodEnd,
                isClaimed: !!commissionClaimed
            }
        };
    }

    /**
     * Claim reward
     */
    static async claimReward(userId: number, type: 'CASHBACK' | 'COMMISSION') {
        const stats = await this.getRewardStats(userId);
        const target = type === 'CASHBACK' ? stats.cashback : stats.commission;

        if (target.isClaimed) {
            throw new Error('Already claimed for this period');
        }

        if (target.claimable <= 0) {
            throw new Error('No reward amount to claim');
        }

        const amount = target.claimable;

        // ============================================
        // BETFLIX SYNC: Deposit to Game Wallet FIRST
        // หักจากกระดานหลัก (Agent) → เติมเข้า User game wallet
        // ============================================
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        const betflixResult = await BetflixService.ensureAndTransfer(
            userId, user.phone, user.betflixUsername, amount, `REWARD_${type}_${Date.now()}`
        );
        if (!betflixResult.success) {
            throw new Error(betflixResult.error || 'ไม่สามารถเติมเงินเข้ากระเป๋าเกมได้');
        }

        // DB Transaction — only after game wallet deposit succeeded
        return await prisma.$transaction(async (tx) => {
            // 1. Create Claim Record
            await tx.rewardClaim.create({
                data: {
                    userId,
                    type,
                    amount: amount,
                    periodStart: new Date(target.periodStart),
                    periodEnd: new Date(target.periodEnd),
                }
            });

            // 2. Update local balance (synced with game wallet)
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                    balance: { increment: amount }
                }
            });

            // 3. Create Transaction Log
            await tx.transaction.create({
                data: {
                    userId,
                    type: type === 'CASHBACK' ? 'REWARD_CASHBACK' : 'REWARD_COMMISSION',
                    amount: amount,
                    balanceBefore: Number(updatedUser.balance) - amount,
                    balanceAfter: Number(updatedUser.balance),
                    status: 'COMPLETED',
                    note: `${type} for period ${target.periodStart.split(' ')[0]}`
                }
            });

            return { success: true, amount, balance: updatedUser.balance };
        });
    }
}

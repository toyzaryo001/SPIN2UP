import prisma from '../lib/db';
import { BetflixService } from './betflix.service';
import dayjs from 'dayjs';
import axios from 'axios';

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
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.betflixUsername) {
            throw new Error('User not found or not linked to Betflix');
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

        // 4. Fetch Betflix Data (Report Summary)
        // API: /v4/report/summaryNEW
        // We use yesterday's range
        let turnover = 0;
        let winLoss = 0;

        try {
            // Need to allow BetflixService to call arbitrary report endpoints or add a helper
            // We'll assume a helper exists or use direct axios if needed, but keeping it clean:
            const report = await BetflixService.getReportSummary(user.betflixUsername, yesterday.format('YYYY-MM-DD'), yesterday.format('YYYY-MM-DD'));

            if (report) {
                turnover = Number(report.turnover || 0); // or valid_amount? Commission usually uses valid_amount
                const validAmount = Number(report.valid_amount || 0);
                winLoss = Number(report.winloss || 0); // Negative = Loss

                // Use valid_amount for commission if standard
                turnover = validAmount;
            }
        } catch (error) {
            console.error('Error fetching betflix report for reward:', error);
            // On error, better to return 0 claimable than crash
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

        // Transaction
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

            // 2. Add Credit to User
            // Note: Should we add to 'balance' or 'bonusBalance'? 
            // Usually CashBack/Commission -> Main Balance (Withdrawable)
            // But let's check current 'User' model. Assuming 'balance' is main.
            const user = await tx.user.update({
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
                    balanceBefore: Number(user.balance) - amount, // approx
                    balanceAfter: Number(user.balance),
                    status: 'COMPLETED',
                    note: `${type} for period ${target.periodStart.split(' ')[0]}`
                }
            });

            return { success: true, amount, balance: user.balance };
        });
    }
}

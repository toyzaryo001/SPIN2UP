import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../lib/db.js';
import { thaiDateKey, thaiNow, thaiStartOfDay } from '../lib/thai-time.js';
import { TurnoverService } from './turnover.service.js';
import { AgentWalletService } from './agent-wallet.service.js';

type StreakDb = Prisma.TransactionClient | typeof prisma;

export type StreakLevel = {
    id?: number;
    day: number;
    minDeposit: number;
    bonusAmount: number;
    requiresTurnover: boolean;
    turnoverMultiplier: number;
    isActive: boolean;
};

export class StreakService {
    static readonly MAX_STREAK_DAYS = 30;

    private static readonly DEFAULT_BONUS_BY_DAY: Record<number, number> = {
        1: 10,
        2: 20,
        3: 30,
        4: 50,
        5: 100,
        6: 150,
        7: 300,
    };

    private static toNumber(value: unknown) {
        return Number(value || 0);
    }

    private static defaultLevel(day: number): StreakLevel {
        return {
            day,
            minDeposit: 100,
            bonusAmount: this.DEFAULT_BONUS_BY_DAY[day] || 0,
            requiresTurnover: false,
            turnoverMultiplier: 1,
            isActive: true,
        };
    }

    private static normalizeLevel(level: {
        id: number;
        day: number;
        minDeposit: Decimal;
        bonusAmount: Decimal;
        requiresTurnover: boolean;
        turnoverMultiplier: Decimal;
        isActive: boolean;
    }): StreakLevel {
        return {
            id: level.id,
            day: level.day,
            minDeposit: this.toNumber(level.minDeposit),
            bonusAmount: this.toNumber(level.bonusAmount),
            requiresTurnover: !!level.requiresTurnover,
            turnoverMultiplier: this.toNumber(level.turnoverMultiplier || 1),
            isActive: !!level.isActive,
        };
    }

    static async ensureSettings(db: StreakDb = prisma) {
        const existing = await db.streakSetting.findMany({
            orderBy: { day: 'asc' },
        });
        const existingDays = new Set(existing.map((item) => item.day));

        for (let day = 1; day <= this.MAX_STREAK_DAYS; day += 1) {
            if (existingDays.has(day)) {
                continue;
            }

            const fallback = this.defaultLevel(day);
            await db.streakSetting.create({
                data: {
                    day: fallback.day,
                    minDeposit: new Decimal(fallback.minDeposit),
                    bonusAmount: new Decimal(fallback.bonusAmount),
                    requiresTurnover: fallback.requiresTurnover,
                    turnoverMultiplier: new Decimal(fallback.turnoverMultiplier),
                    isActive: fallback.isActive,
                },
            });
        }

        const settings = await db.streakSetting.findMany({
            orderBy: { day: 'asc' },
        });

        return settings.map((item) => this.normalizeLevel(item));
    }

    static async getSettings(db: StreakDb = prisma) {
        return this.ensureSettings(db);
    }

    private static async buildDailyDepositMap(userId: number, db: StreakDb = prisma) {
        const lookBackStart = thaiStartOfDay(
            thaiNow().subtract(this.MAX_STREAK_DAYS + 2, 'day').toDate()
        ).toDate();

        const transactions = await db.transaction.findMany({
            where: {
                userId,
                type: 'DEPOSIT',
                status: { in: ['APPROVED', 'COMPLETED'] },
                createdAt: { gte: lookBackStart },
            },
            select: {
                amount: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        const dailyDeposits: Record<string, number> = {};
        transactions.forEach((tx) => {
            const dateStr = thaiDateKey(tx.createdAt);
            dailyDeposits[dateStr] = (dailyDeposits[dateStr] || 0) + this.toNumber(tx.amount);
        });

        return dailyDeposits;
    }

    private static calculateStreakEndingAt(endDate: ReturnType<typeof thaiNow>, settings: StreakLevel[], dailyDeposits: Record<string, number>) {
        const maxDay = settings[settings.length - 1]?.day || this.MAX_STREAK_DAYS;

        for (let candidate = maxDay; candidate >= 1; candidate -= 1) {
            let qualifies = true;

            for (let day = 1; day <= candidate; day += 1) {
                const setting = settings.find((item) => item.day === day);
                if (!setting) {
                    qualifies = false;
                    break;
                }

                const offset = candidate - day;
                const dateKey = thaiDateKey(endDate.subtract(offset, 'day').toDate());
                const totalDeposit = dailyDeposits[dateKey] || 0;

                if (totalDeposit < setting.minDeposit) {
                    qualifies = false;
                    break;
                }
            }

            if (qualifies) {
                return candidate;
            }
        }

        return 0;
    }

    static async getUserStreakStatus(userId: number, db: StreakDb = prisma) {
        const settings = await this.getSettings(db);
        const dailyDeposits = await this.buildDailyDepositMap(userId, db);
        const today = thaiNow();
        const streakToday = this.calculateStreakEndingAt(today, settings, dailyDeposits);
        const currentStreak = streakToday > 0
            ? streakToday
            : this.calculateStreakEndingAt(today.subtract(1, 'day'), settings, dailyDeposits);
        const todayKey = thaiDateKey(today.toDate());
        const nextLevel = settings.find((item) => item.day === currentStreak + 1) || null;

        return {
            currentStreak,
            maxDay: settings[settings.length - 1]?.day || this.MAX_STREAK_DAYS,
            todayDeposit: dailyDeposits[todayKey] || 0,
            minDeposit: settings[0]?.minDeposit || 100,
            nextDay: nextLevel?.day || null,
            nextDayMinDeposit: nextLevel?.minDeposit || null,
            levels: settings.map((item) => ({
                ...item,
                claimed: item.day <= currentStreak,
                isCurrentTarget: item.day === currentStreak + 1,
            })),
        };
    }

    static async processStreakBonus(userId: number) {
        try {
            const settings = await this.getSettings();
            const dailyDeposits = await this.buildDailyDepositMap(userId);
            const currentStreak = this.calculateStreakEndingAt(thaiNow(), settings, dailyDeposits);

            if (currentStreak <= 0) {
                return;
            }

            const matchedSetting = settings.find((item) => item.day === currentStreak);
            if (!matchedSetting || !matchedSetting.isActive || matchedSetting.bonusAmount <= 0) {
                return;
            }

            const startOfToday = thaiStartOfDay().toDate();

            const existingBonus = await prisma.transaction.findFirst({
                where: {
                    userId,
                    type: 'BONUS',
                    subType: 'STREAK',
                    note: { contains: `Streak Day ${currentStreak}` },
                    createdAt: { gte: startOfToday },
                },
            });

            if (existingBonus) {
                return;
            }

            const bonusAmount = matchedSetting.bonusAmount;
            const turnoverMultiplier = matchedSetting.turnoverMultiplier;
            const todayKey = thaiDateKey(thaiNow().toDate());

            await AgentWalletService.creditMainAgent(
                userId,
                bonusAmount,
                `STREAK_${userId}_${currentStreak}_${todayKey}`,
                `Streak Day ${currentStreak} Bonus`
            );

            await prisma.$transaction(async (tx) => {
                const updatedUser = await tx.user.update({
                    where: { id: userId },
                    data: {
                        balance: { increment: new Decimal(bonusAmount) },
                    },
                });

                if (matchedSetting.requiresTurnover) {
                    await TurnoverService.addRequirement(
                        userId,
                        bonusAmount,
                        turnoverMultiplier,
                        `Streak Day ${currentStreak}`,
                        tx
                    );
                }

                await tx.transaction.create({
                    data: {
                        userId,
                        type: 'BONUS',
                        subType: 'STREAK',
                        amount: new Decimal(bonusAmount),
                        balanceBefore: new Decimal(this.toNumber(updatedUser.balance) - bonusAmount),
                        balanceAfter: updatedUser.balance,
                        status: 'COMPLETED',
                        note: matchedSetting.requiresTurnover
                            ? `Streak Day ${currentStreak} Bonus (Turnover x${turnoverMultiplier})`
                            : `Streak Day ${currentStreak} Bonus`,
                    },
                });
            });
        } catch (error) {
            console.error('[Streak Calculation Error]', error);
        }
    }
}

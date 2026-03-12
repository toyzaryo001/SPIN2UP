import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../lib/db.js';
import { PromotionSelectionService } from './promotion-selection.service.js';
import { TurnoverService } from './turnover.service.js';

export class DepositBonusService {
    static async applyPostDepositBenefits(transactionId: number) {
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                promotion: true,
                promotionLog: true,
            },
        });

        if (!transaction || transaction.type !== 'DEPOSIT') {
            return;
        }

        if (!['APPROVED', 'COMPLETED'].includes(transaction.status)) {
            return;
        }

        await this.applyPromotionBonus(transaction);
        await this.processStreakBonus(transaction.userId);
    }

    private static async applyPromotionBonus(transaction: {
        id: number;
        userId: number;
        amount: Decimal;
        promotionId: number | null;
        promotionBonusAmount: Decimal | null;
        promotion: {
            id: number;
            name: string;
            description: string | null;
            type: string;
            value: Decimal;
            minDeposit: Decimal | null;
            maxBonus: Decimal | null;
            requiresTurnover: boolean;
            turnoverMultiplier: Decimal;
            image: string | null;
            isActive: boolean;
            startAt: Date | null;
            endAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        promotionLog?: { id: number } | null;
    }) {
        if (!transaction.promotionId || !transaction.promotion) {
            return;
        }

        if (transaction.promotionLog) {
            return;
        }

        const promotion = transaction.promotion;
        const storedBonusAmount = Number(transaction.promotionBonusAmount || 0);
        const bonusAmount = storedBonusAmount > 0
            ? storedBonusAmount
            : PromotionSelectionService.calculateBonusAmount(
                promotion,
                Number(transaction.amount)
            );
        const turnoverMultiplier = Number(promotion.turnoverMultiplier || 1);
        const turnoverApplied = promotion.requiresTurnover
            ? Number((bonusAmount * turnoverMultiplier).toFixed(2))
            : 0;

        try {
            await prisma.$transaction(async (tx) => {
                const updatedUser = await tx.user.update({
                    where: { id: transaction.userId },
                    data: {
                        bonusBalance: { increment: new Decimal(bonusAmount) },
                    },
                });

                if (turnoverApplied > 0) {
                    await TurnoverService.addRequirement(
                        transaction.userId,
                        bonusAmount,
                        turnoverMultiplier,
                        `Promotion ${transaction.promotion?.name || transaction.promotionId}`,
                        tx
                    );
                }

                if (bonusAmount > 0) {
                    await tx.transaction.create({
                        data: {
                        userId: transaction.userId,
                        type: 'BONUS',
                        subType: 'PROMOTION',
                        amount: new Decimal(bonusAmount),
                        balanceBefore: new Decimal(Number(updatedUser.bonusBalance) - bonusAmount),
                        balanceAfter: updatedUser.bonusBalance,
                        status: 'COMPLETED',
                        note: `Promotion Bonus: ${promotion.name}`,
                        promotionId: promotion.id,
                        promotionBonusAmount: new Decimal(bonusAmount),
                    },
                });
            }

            await tx.promotionLog.create({
                data: {
                    userId: transaction.userId,
                    promotionId: promotion.id,
                    transactionId: transaction.id,
                    amount: new Decimal(bonusAmount),
                    turnoverApplied: new Decimal(turnoverApplied),
                    },
                });
            });
        } catch (error: any) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return;
            }
            throw error;
        }
    }

    static async processStreakBonus(userId: number) {
        try {
            const settings = await prisma.streakSetting.findMany({
                where: { isActive: true },
                orderBy: { day: 'asc' },
            });

            if (settings.length === 0) {
                return;
            }

            const minDeposit = Number(settings[0].minDeposit) || 100;
            const maxDay = settings[settings.length - 1].day;

            const lookBackDate = new Date();
            lookBackDate.setDate(lookBackDate.getDate() - (maxDay + 2));

            const transactions = await prisma.transaction.findMany({
                where: {
                    userId,
                    type: 'DEPOSIT',
                    status: { in: ['APPROVED', 'COMPLETED'] },
                    createdAt: { gte: lookBackDate },
                },
                select: {
                    amount: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
            });

            const dailyDeposits: Record<string, number> = {};
            transactions.forEach((tx) => {
                const dateStr = tx.createdAt.toISOString().split('T')[0];
                dailyDeposits[dateStr] = (dailyDeposits[dateStr] || 0) + Number(tx.amount);
            });

            const today = new Date().toISOString().split('T')[0];
            if ((dailyDeposits[today] || 0) < minDeposit) {
                return;
            }

            let currentStreak = 1;
            const checkDate = new Date();
            checkDate.setDate(checkDate.getDate() - 1);

            for (let i = 1; i < maxDay; i++) {
                const dateStr = checkDate.toISOString().split('T')[0];
                if ((dailyDeposits[dateStr] || 0) >= minDeposit) {
                    currentStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }

            if (currentStreak > maxDay) {
                currentStreak = maxDay;
            }

            const matchedSetting = settings.find((item) => item.day === currentStreak);
            if (!matchedSetting || Number(matchedSetting.bonusAmount) <= 0) {
                return;
            }

            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

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

            const bonusAmount = Number(matchedSetting.bonusAmount);
            const turnoverMultiplier = Number(matchedSetting.turnoverMultiplier || 1);

            await prisma.$transaction(async (tx) => {
                const updatedUser = await tx.user.update({
                    where: { id: userId },
                    data: {
                        bonusBalance: { increment: new Decimal(bonusAmount) },
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
                        balanceBefore: new Decimal(Number(updatedUser.bonusBalance) - bonusAmount),
                        balanceAfter: updatedUser.bonusBalance,
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

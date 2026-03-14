import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../lib/db.js';
import { PromotionSelectionService } from './promotion-selection.service.js';
import { StreakService } from './streak.service.js';
import { TurnoverService } from './turnover.service.js';
import { AgentWalletService } from './agent-wallet.service.js';

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
        await StreakService.processStreakBonus(transaction.userId);
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
            if (bonusAmount > 0) {
                await AgentWalletService.creditMainAgent(
                    transaction.userId,
                    bonusAmount,
                    `PROMO_BONUS_${transaction.id}`,
                    `Promotion bonus: ${promotion.name}`
                );
            }

            await prisma.$transaction(async (tx) => {
                const updatedUser = await tx.user.update({
                    where: { id: transaction.userId },
                    data: {
                        balance: { increment: new Decimal(bonusAmount) },
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
                        balanceBefore: new Decimal(Number(updatedUser.balance) - bonusAmount),
                        balanceAfter: updatedUser.balance,
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
}

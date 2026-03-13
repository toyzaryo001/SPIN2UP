import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../lib/db.js';

type TurnoverDb = Prisma.TransactionClient | typeof prisma;

type TurnoverUser = {
    currentTurnover?: Decimal | Prisma.Decimal | number | null;
    turnoverLimit?: Decimal | Prisma.Decimal | number | null;
};

export class TurnoverService {
    private static toNumber(value: unknown) {
        return Number(value || 0);
    }

    static getRemaining(user: TurnoverUser) {
        const current = this.toNumber(user.currentTurnover);
        const limit = this.toNumber(user.turnoverLimit);
        return Math.max(0, limit - current);
    }

    static async addRequirement(
        userId: number,
        bonusAmount: number,
        multiplier: number,
        _reason?: string,
        db: TurnoverDb = prisma
    ) {
        const normalizedBonus = this.toNumber(bonusAmount);
        const normalizedMultiplier = this.toNumber(multiplier);

        if (normalizedBonus <= 0 || normalizedMultiplier <= 0) {
            return 0;
        }

        const requiredTurnover = Number((normalizedBonus * normalizedMultiplier).toFixed(2));

        await db.user.update({
            where: { id: userId },
            data: {
                turnoverLimit: { increment: new Decimal(requiredTurnover) },
            },
        });

        return requiredTurnover;
    }

    static async addManualRequirement(
        userId: number,
        turnoverAmount: number,
        db: TurnoverDb = prisma
    ) {
        const normalizedTurnover = this.toNumber(turnoverAmount);
        if (normalizedTurnover <= 0) {
            return 0;
        }

        await db.user.update({
            where: { id: userId },
            data: {
                turnoverLimit: { increment: new Decimal(normalizedTurnover) },
            },
        });

        return normalizedTurnover;
    }

    static async recordProgress(userId: number, validBet: number, db: TurnoverDb = prisma) {
        const normalizedBet = this.toNumber(validBet);
        if (normalizedBet <= 0) {
            return 0;
        }

        const user = await db.user.findUnique({
            where: { id: userId },
            select: {
                currentTurnover: true,
                turnoverLimit: true,
            },
        });

        if (!user) {
            return 0;
        }

        const turnoverLimit = this.toNumber(user.turnoverLimit);
        if (turnoverLimit <= 0) {
            return 0;
        }

        const currentTurnover = this.toNumber(user.currentTurnover);
        const nextTurnover = Math.min(turnoverLimit, currentTurnover + normalizedBet);

        if (nextTurnover <= currentTurnover) {
            return currentTurnover;
        }

        await db.user.update({
            where: { id: userId },
            data: {
                currentTurnover: new Decimal(nextTurnover),
            },
        });

        return nextTurnover;
    }

    static async clearIfLowBalance(userId: number, liveBalance: number, db: TurnoverDb = prisma) {
        const normalizedBalance = this.toNumber(liveBalance);
        if (normalizedBalance >= 5) {
            return false;
        }

        const result = await db.user.updateMany({
            where: {
                id: userId,
                OR: [
                    { turnoverLimit: { gt: 0 } },
                    { currentTurnover: { gt: 0 } },
                ],
            },
            data: {
                turnoverLimit: new Decimal(0),
                currentTurnover: new Decimal(0),
            },
        });

        return result.count > 0;
    }
}

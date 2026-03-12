import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../lib/db.js';

export type PromotionSelectionMode = 'interactive' | 'passive';

type PromotionRecord = {
    id: number;
    name: string;
    description: string | null;
    type: string;
    value: Decimal | number | string;
    minDeposit: Decimal | number | string | null;
    maxBonus: Decimal | number | string | null;
    requiresTurnover: boolean;
    turnoverMultiplier: Decimal | number | string;
    image: string | null;
    isActive: boolean;
    startAt: Date | null;
    endAt: Date | null;
};

export type SelectedPromotionSummary = {
    id: number;
    name: string;
    description: string | null;
    type: string;
    value: number;
    minDeposit: number;
    maxBonus: number | null;
    requiresTurnover: boolean;
    turnoverMultiplier: number;
    image: string | null;
    selectedAt: string | null;
};

export class PromotionSelectionService {
    private static promotionSelect = {
        id: true,
        name: true,
        description: true,
        type: true,
        value: true,
        minDeposit: true,
        maxBonus: true,
        requiresTurnover: true,
        turnoverMultiplier: true,
        image: true,
        isActive: true,
        startAt: true,
        endAt: true,
    } as const;

    private static toNumber(value: unknown) {
        return Number(value || 0);
    }

    private static isPromotionAvailable(promotion: PromotionRecord, now = new Date()) {
        if (!promotion.isActive) {
            return false;
        }

        if (promotion.startAt && promotion.startAt > now) {
            return false;
        }

        if (promotion.endAt && promotion.endAt < now) {
            return false;
        }

        return true;
    }

    static toSummary(promotion: PromotionRecord, selectedAt?: Date | null): SelectedPromotionSummary {
        return {
            id: promotion.id,
            name: promotion.name,
            description: promotion.description,
            type: promotion.type,
            value: this.toNumber(promotion.value),
            minDeposit: this.toNumber(promotion.minDeposit),
            maxBonus: promotion.maxBonus == null ? null : this.toNumber(promotion.maxBonus),
            requiresTurnover: promotion.requiresTurnover === true,
            turnoverMultiplier: this.toNumber(promotion.turnoverMultiplier) || 1,
            image: promotion.image,
            selectedAt: selectedAt ? selectedAt.toISOString() : null,
        };
    }

    static calculateBonusAmount(promotion: PromotionRecord, depositAmount: number) {
        const normalizedAmount = this.toNumber(depositAmount);
        if (normalizedAmount <= 0) {
            return 0;
        }

        if (promotion.type === 'FIXED') {
            return Number(this.toNumber(promotion.value).toFixed(2));
        }

        const rawBonus = normalizedAmount * (this.toNumber(promotion.value) / 100);
        const maxBonus = promotion.maxBonus == null ? Infinity : this.toNumber(promotion.maxBonus);
        return Number(Math.min(rawBonus, maxBonus).toFixed(2));
    }

    private static async getPromotionOrThrow(promotionId: number) {
        const promotion = await prisma.promotion.findUnique({
            where: { id: promotionId },
            select: this.promotionSelect,
        });

        if (!promotion || !this.isPromotionAvailable(promotion)) {
            throw new Error('PROMOTION_NOT_AVAILABLE');
        }

        return promotion;
    }

    static async selectPromotion(userId: number, promotionId: number) {
        const promotion = await this.getPromotionOrThrow(promotionId);
        const selectedAt = new Date();

        await prisma.user.update({
            where: { id: userId },
            data: {
                selectedPromotionId: promotion.id,
                selectedPromotionAt: selectedAt,
            },
        });

        return this.toSummary(promotion, selectedAt);
    }

    static async getSelectedPromotion(userId: number) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                selectedPromotionAt: true,
                selectedPromotion: {
                    select: this.promotionSelect,
                },
            },
        });

        if (!user?.selectedPromotion) {
            return null;
        }

        if (!this.isPromotionAvailable(user.selectedPromotion)) {
            await this.clearSelectedPromotion(userId);
            return null;
        }

        return this.toSummary(user.selectedPromotion, user.selectedPromotionAt);
    }

    static async clearSelectedPromotion(userId: number) {
        await prisma.user.update({
            where: { id: userId },
            data: {
                selectedPromotionId: null,
                selectedPromotionAt: null,
            },
        });
    }

    static async bindSelectedPromotionToTransaction(
        userId: number,
        transactionId: number,
        amount: number,
        mode: PromotionSelectionMode
    ) {
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            select: {
                id: true,
                userId: true,
                promotionId: true,
                promotionBonusAmount: true,
            },
        });

        if (!transaction || transaction.userId !== userId) {
            return { bound: false };
        }

        if (transaction.promotionId) {
            return {
                bound: true,
                bonusAmount: this.toNumber(transaction.promotionBonusAmount),
            };
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                selectedPromotionAt: true,
                selectedPromotion: {
                    select: this.promotionSelect,
                },
            },
        });

        if (!user?.selectedPromotion) {
            return { bound: false };
        }

        if (!this.isPromotionAvailable(user.selectedPromotion)) {
            await this.clearSelectedPromotion(userId);
            return { bound: false };
        }

        const minDeposit = this.toNumber(user.selectedPromotion.minDeposit);
        if (this.toNumber(amount) < minDeposit) {
            if (mode === 'interactive') {
                throw new Error('SELECTED_PROMOTION_MIN_DEPOSIT_NOT_MET');
            }
            return { bound: false };
        }

        const bonusAmount = this.calculateBonusAmount(user.selectedPromotion, amount);

        await prisma.$transaction(async (tx) => {
            await tx.transaction.update({
                where: { id: transactionId },
                data: {
                    promotionId: user.selectedPromotion!.id,
                    promotionBonusAmount: new Decimal(bonusAmount),
                },
            });

            await tx.user.update({
                where: { id: userId },
                data: {
                    selectedPromotionId: null,
                    selectedPromotionAt: null,
                },
            });
        });

        return {
            bound: true,
            bonusAmount,
            promotion: this.toSummary(user.selectedPromotion, user.selectedPromotionAt),
        };
    }
}

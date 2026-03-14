import { Prisma, AgentConfig, UserExternalAccount } from '@prisma/client';
import prisma from '../lib/db.js';
import { AgentFactory } from './agents/AgentFactory.js';
import { AlertService } from './alert.service.js';

type DbLike = Prisma.TransactionClient | typeof prisma;

type LaunchResolution = {
    agentConfig: AgentConfig;
    gameCode: string;
    providerCode: string;
    gameId?: number;
};

export type WithdrawalPullSegment = {
    userId: number;
    sourceAgentId: number;
    externalUsername: string;
    amount: number;
    transferLogId?: number;
};

export class AgentWalletService {
    private static readonly BALANCE_THRESHOLD = 0.01;

    private static toNumber(value: unknown) {
        return Number(value || 0);
    }

    private static buildReference(prefix: string) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    private static toMetadata(value: unknown) {
        try {
            return JSON.stringify(value);
        } catch {
            return null;
        }
    }

    private static async createTransferLog(data: {
        userId: number;
        transactionId?: number | null;
        sourceAgentId?: number | null;
        targetAgentId?: number | null;
        type: string;
        amount: number;
        status?: string;
        referenceId?: string | null;
        note?: string | null;
        metadata?: unknown;
    }) {
        return prisma.agentWalletTransferLog.create({
            data: {
                userId: data.userId,
                transactionId: data.transactionId ?? null,
                sourceAgentId: data.sourceAgentId ?? null,
                targetAgentId: data.targetAgentId ?? null,
                type: data.type,
                amount: new Prisma.Decimal(data.amount),
                status: data.status || 'PENDING',
                referenceId: data.referenceId ?? null,
                note: data.note ?? null,
                metadata: data.metadata === undefined ? null : this.toMetadata(data.metadata),
            },
        });
    }

    private static async updateTransferLog(
        id: number,
        data: {
            status?: string;
            note?: string | null;
            metadata?: unknown;
        }
    ) {
        return prisma.agentWalletTransferLog.update({
            where: { id },
            data: {
                ...(data.status ? { status: data.status } : {}),
                ...(data.note !== undefined ? { note: data.note } : {}),
                ...(data.metadata !== undefined ? { metadata: this.toMetadata(data.metadata) } : {}),
            },
        });
    }

    static async getMainAgentConfig(db: DbLike = prisma) {
        const mainAgent = await db.agentConfig.findFirst({
            where: { isMain: true, isActive: true },
            orderBy: { id: 'asc' },
        });

        if (!mainAgent) {
            throw new Error('MAIN_AGENT_NOT_CONFIGURED');
        }

        return mainAgent;
    }

    private static async hydrateLegacyMainAccount(userId: number, db: DbLike = prisma) {
        const user = await db.user.findUnique({
            where: { id: userId },
            include: { externalAccounts: true },
        });
        if (!user) {
            throw new Error('User not found');
        }

        const mainAgent = await this.getMainAgentConfig(db).catch(() => null);
        if (!mainAgent || !user.betflixUsername) {
            return user;
        }

        const existingMain = user.externalAccounts.find((account) => account.agentId === mainAgent.id);
        if (existingMain) {
            return user;
        }

        const created = await db.userExternalAccount.create({
            data: {
                userId: user.id,
                agentId: mainAgent.id,
                externalUsername: user.betflixUsername,
                externalPassword: user.betflixPassword || '',
            },
        }).catch(async (error: any) => {
            if (error?.code === 'P2002') {
                return db.userExternalAccount.findUnique({
                    where: {
                        userId_agentId: {
                            userId: user.id,
                            agentId: mainAgent.id,
                        },
                    },
                });
            }
            throw error;
        });

        const lastActiveAgentId = user.lastActiveAgentId ?? mainAgent.id;
        if (user.lastActiveAgentId == null) {
            await db.user.update({
                where: { id: user.id },
                data: { lastActiveAgentId },
            });
        }

        return {
            ...user,
            lastActiveAgentId,
            externalAccounts: [
                ...user.externalAccounts,
                created as UserExternalAccount,
            ],
        };
    }

    static async ensureExternalAccount(userId: number, agentId: number, db: DbLike = prisma) {
        const user = await this.hydrateLegacyMainAccount(userId, db);
        const agentConfig = await db.agentConfig.findUnique({
            where: { id: agentId },
        });

        if (!agentConfig || !agentConfig.isActive) {
            throw new Error('AGENT_NOT_AVAILABLE');
        }

        const existingAccount = user.externalAccounts.find((account) => account.agentId === agentId);
        if (existingAccount) {
            return existingAccount;
        }

        if (agentConfig.code === 'BETFLIX' && user.betflixUsername) {
            return db.userExternalAccount.create({
                data: {
                    userId: user.id,
                    agentId,
                    externalUsername: user.betflixUsername,
                    externalPassword: user.betflixPassword || '',
                },
            });
        }

        const agentService = await AgentFactory.getAgent(agentConfig.code);
        const credentials = await agentService.register(user.id, user.phone);

        if (!credentials?.username) {
            throw new Error(`AGENT_ACCOUNT_REGISTER_FAILED:${agentConfig.code}`);
        }

        const account = await db.userExternalAccount.create({
            data: {
                userId: user.id,
                agentId,
                externalUsername: credentials.username,
                externalPassword: credentials.password || '',
            },
        });

        if (agentConfig.code === 'BETFLIX') {
            await db.user.update({
                where: { id: user.id },
                data: {
                    betflixUsername: user.betflixUsername || credentials.username,
                    betflixPassword: user.betflixPassword || credentials.password || '',
                },
            });
        }

        return account;
    }

    static async getUserAgentBalances(userId: number) {
        const user = await this.hydrateLegacyMainAccount(userId);
        const balances = await Promise.all(
            user.externalAccounts.map(async (account) => {
                const agentService = await AgentFactory.getAgentById(account.agentId);
                const liveBalance = await agentService.getBalance(account.externalUsername);

                await prisma.userExternalAccount.update({
                    where: { id: account.id },
                    data: { balance: new Prisma.Decimal(liveBalance) },
                }).catch(() => {});

                return {
                    agentId: account.agentId,
                    externalUsername: account.externalUsername,
                    balance: liveBalance,
                };
            })
        );

        return {
            balances,
            totalBalance: balances.reduce((sum, item) => sum + item.balance, 0),
        };
    }

    static async syncLocalBalanceFromAgents(userId: number) {
        const { totalBalance } = await this.getUserAgentBalances(userId);
        await prisma.user.update({
            where: { id: userId },
            data: { balance: new Prisma.Decimal(totalBalance) },
        }).catch(() => {});
        return totalBalance;
    }

    static async creditMainAgent(
        userId: number,
        amount: number,
        referenceId?: string,
        reason?: string,
        transactionId?: number
    ) {
        if (amount <= 0) {
            return { success: true, amount: 0 };
        }

        const mainAgent = await this.getMainAgentConfig();
        const account = await this.ensureExternalAccount(userId, mainAgent.id);
        const agentService = await AgentFactory.getAgent(mainAgent.code);
        const ref = referenceId || this.buildReference('MAIN_CREDIT');

        const transferLog = await this.createTransferLog({
            userId,
            transactionId,
            targetAgentId: mainAgent.id,
            type: 'DEPOSIT_TO_MAIN',
            amount,
            referenceId: ref,
            note: reason || 'Deposit credited to main agent',
            metadata: { agentCode: mainAgent.code },
        });

        const success = await agentService.deposit(account.externalUsername, amount, ref);
        if (!success) {
            await this.updateTransferLog(transferLog.id, {
                status: 'FAILED',
                note: `MAIN_AGENT_DEPOSIT_FAILED:${mainAgent.code}`,
            });
            throw new Error(`MAIN_AGENT_DEPOSIT_FAILED:${mainAgent.code}`);
        }

        await prisma.userExternalAccount.update({
            where: { id: account.id },
            data: { balance: { increment: new Prisma.Decimal(amount) } },
        }).catch(() => {});

        await this.updateTransferLog(transferLog.id, {
            status: 'COMPLETED',
            note: reason || 'Deposit credited to main agent',
        });

        return {
            success: true,
            amount,
            mainAgentId: mainAgent.id,
            externalUsername: account.externalUsername,
            transferLogId: transferLog.id,
        };
    }

    static async resolveTargetAgentForGame(params: {
        gameId?: number;
        providerCode?: string;
        gameCode?: string;
    }, db: DbLike = prisma): Promise<LaunchResolution> {
        if (params.gameId) {
            const game = await db.game.findUnique({
                where: { id: params.gameId },
                include: { provider: true },
            });

            if (!game) {
                throw new Error('GAME_NOT_FOUND');
            }

            const targetAgentId = game.agentId || game.provider?.defaultAgentId;
            if (!targetAgentId) {
                throw new Error('GAME_AGENT_MAPPING_REQUIRED');
            }

            const agentConfig = await db.agentConfig.findUnique({ where: { id: targetAgentId } });
            if (!agentConfig || !agentConfig.isActive) {
                throw new Error('GAME_AGENT_MAPPING_REQUIRED');
            }

            return {
                agentConfig,
                gameId: game.id,
                gameCode: params.gameCode || game.slug,
                providerCode: game.upstreamProviderCode || params.providerCode || game.provider?.slug || '',
            };
        }

        if (!params.providerCode || !params.gameCode) {
            throw new Error('GAME_AGENT_MAPPING_REQUIRED');
        }

        const provider = await db.gameProvider.findFirst({
            where: {
                slug: params.providerCode,
                isActive: true,
            },
        });

        if (!provider?.defaultAgentId) {
            throw new Error('GAME_AGENT_MAPPING_REQUIRED');
        }

        const agentConfig = await db.agentConfig.findUnique({ where: { id: provider.defaultAgentId } });
        if (!agentConfig || !agentConfig.isActive) {
            throw new Error('GAME_AGENT_MAPPING_REQUIRED');
        }

        return {
            agentConfig,
            providerCode: provider.slug,
            gameCode: params.gameCode,
        };
    }

    private static async createCriticalSwapAlert(params: {
        userId: number;
        sourceAgentId?: number | null;
        targetAgentId?: number | null;
        amount: number;
        referenceId: string;
        message: string;
    }) {
        await AlertService.createAlert({
            type: 'CRITICAL',
            title: 'Agent wallet swap failed',
            message: params.message,
            userId: params.userId,
            agentId: params.targetAgentId || params.sourceAgentId || undefined,
            actionUrl: `/admin/transactions`,
            actionRequired: true,
            metadata: {
                sourceAgentId: params.sourceAgentId,
                targetAgentId: params.targetAgentId,
                amount: params.amount,
                referenceId: params.referenceId,
                createdAt: new Date().toISOString(),
            },
        }).catch((error) => {
            console.error('[AgentWallet] Failed to create critical alert:', error);
        });
    }

    static async sweepAllOtherAgentsToTarget(
        userId: number,
        targetAgentId: number,
        referenceId?: string,
        transactionId?: number
    ) {
        const user = await this.hydrateLegacyMainAccount(userId);
        const targetAccount = await this.ensureExternalAccount(userId, targetAgentId);
        const targetAgentConfig = await prisma.agentConfig.findUnique({ where: { id: targetAgentId } });
        if (!targetAgentConfig) {
            throw new Error('TARGET_AGENT_NOT_FOUND');
        }

        const targetAgentService = await AgentFactory.getAgent(targetAgentConfig.code);
        let totalMoved = 0;

        for (const sourceAccount of user.externalAccounts) {
            if (sourceAccount.agentId === targetAgentId) {
                continue;
            }

            const sourceAgentConfig = await prisma.agentConfig.findUnique({
                where: { id: sourceAccount.agentId },
            });
            if (!sourceAgentConfig || !sourceAgentConfig.isActive) {
                continue;
            }

            const sourceAgentService = await AgentFactory.getAgent(sourceAgentConfig.code);
            const liveBalance = await sourceAgentService.getBalance(sourceAccount.externalUsername);
            if (liveBalance <= this.BALANCE_THRESHOLD) {
                continue;
            }

            const sweepRef = `${referenceId || this.buildReference('SWAP')}_${sourceAccount.agentId}`;
            const transferLog = await this.createTransferLog({
                userId,
                transactionId,
                sourceAgentId: sourceAccount.agentId,
                targetAgentId,
                type: 'SWAP_TO_TARGET',
                amount: liveBalance,
                referenceId: sweepRef,
                note: `Sweep ${sourceAgentConfig.code} -> ${targetAgentConfig.code}`,
            });

            const withdrawn = await sourceAgentService.withdraw(
                sourceAccount.externalUsername,
                'ALL',
                `${sweepRef}_WD`
            );

            if (withdrawn === false) {
                await this.updateTransferLog(transferLog.id, {
                    status: 'FAILED',
                    note: `SOURCE_WITHDRAW_FAILED:${sourceAgentConfig.code}`,
                });
                throw new Error(`SOURCE_WITHDRAW_FAILED:${sourceAgentConfig.code}`);
            }

            const movedAmount = typeof withdrawn === 'number' ? withdrawn : liveBalance;
            if (movedAmount <= this.BALANCE_THRESHOLD) {
                await this.updateTransferLog(transferLog.id, {
                    status: 'COMPLETED',
                    note: 'Nothing to move from source agent',
                    metadata: { movedAmount },
                });
                continue;
            }

            const deposited = await targetAgentService.deposit(
                targetAccount.externalUsername,
                movedAmount,
                `${sweepRef}_DEP`
            );

            if (!deposited) {
                const refundSucceeded = await sourceAgentService.deposit(
                    sourceAccount.externalUsername,
                    movedAmount,
                    `${sweepRef}_REFUND`
                );

                await this.updateTransferLog(transferLog.id, {
                    status: 'FAILED',
                    note: refundSucceeded
                        ? `TARGET_DEPOSIT_FAILED:${targetAgentConfig.code} (refund succeeded)`
                        : `TARGET_DEPOSIT_FAILED:${targetAgentConfig.code} (refund failed)`,
                    metadata: {
                        movedAmount,
                        refundSucceeded,
                    },
                });

                if (!refundSucceeded) {
                    await this.createCriticalSwapAlert({
                        userId,
                        sourceAgentId: sourceAccount.agentId,
                        targetAgentId,
                        amount: movedAmount,
                        referenceId: sweepRef,
                        message: `Unable to refund ${movedAmount} from failed swap ${sourceAgentConfig.code} -> ${targetAgentConfig.code} for user ${userId}.`,
                    });
                }

                throw new Error(`TARGET_DEPOSIT_FAILED:${targetAgentConfig.code}`);
            }

            totalMoved += movedAmount;

            await Promise.all([
                prisma.userExternalAccount.update({
                    where: { id: sourceAccount.id },
                    data: { balance: new Prisma.Decimal(0) },
                }).catch(() => {}),
                prisma.userExternalAccount.update({
                    where: { id: targetAccount.id },
                    data: { balance: { increment: new Prisma.Decimal(movedAmount) } },
                }).catch(() => {}),
            ]);

            await this.updateTransferLog(transferLog.id, {
                status: 'COMPLETED',
                note: `Swept ${movedAmount} from ${sourceAgentConfig.code} to ${targetAgentConfig.code}`,
                metadata: { movedAmount },
            });
        }

        return {
            targetAgentId,
            totalMoved,
            targetAccount,
        };
    }

    private static async reconcileLocalDeficitToTarget(
        userId: number,
        targetAgentId: number,
        referenceId?: string,
        transactionId?: number
    ) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                balance: true,
            },
        });

        if (!user) {
            throw new Error('User not found');
        }

        const localBalance = this.toNumber(user.balance);
        if (localBalance <= this.BALANCE_THRESHOLD) {
            return { mirroredAmount: 0 };
        }

        const { totalBalance: totalAgentBalance } = await this.getUserAgentBalances(userId);
        const deficit = Number((localBalance - totalAgentBalance).toFixed(2));

        if (deficit <= this.BALANCE_THRESHOLD) {
            return { mirroredAmount: 0 };
        }

        const targetAgentConfig = await prisma.agentConfig.findUnique({
            where: { id: targetAgentId },
        });
        if (!targetAgentConfig || !targetAgentConfig.isActive) {
            throw new Error('TARGET_AGENT_NOT_FOUND');
        }

        const targetAccount = await this.ensureExternalAccount(userId, targetAgentId);
        const targetAgentService = await AgentFactory.getAgent(targetAgentConfig.code);
        const mirrorRef = `${referenceId || this.buildReference('BALANCE_MIRROR')}_${targetAgentId}`;

        const transferLog = await this.createTransferLog({
            userId,
            transactionId,
            targetAgentId,
            type: 'LEGACY_ACCOUNT_BACKFILL',
            amount: deficit,
            referenceId: mirrorRef,
            note: `Mirror local wallet deficit to ${targetAgentConfig.code}`,
            metadata: {
                localBalance,
                totalAgentBalance,
            },
        });

        const deposited = await targetAgentService.deposit(
            targetAccount.externalUsername,
            deficit,
            `${mirrorRef}_DEP`
        );

        if (!deposited) {
            await this.updateTransferLog(transferLog.id, {
                status: 'FAILED',
                note: `LOCAL_DEFICIT_MIRROR_FAILED:${targetAgentConfig.code}`,
                metadata: {
                    localBalance,
                    totalAgentBalance,
                    deficit,
                },
            });
            throw new Error(`LOCAL_DEFICIT_MIRROR_FAILED:${targetAgentConfig.code}`);
        }

        await prisma.userExternalAccount.updateMany({
            where: {
                userId,
                agentId: targetAgentId,
                externalUsername: targetAccount.externalUsername,
            },
            data: {
                balance: { increment: new Prisma.Decimal(deficit) },
            },
        }).catch(() => {});

        await this.updateTransferLog(transferLog.id, {
            status: 'COMPLETED',
            note: `Mirrored ${deficit} local wallet deficit to ${targetAgentConfig.code}`,
            metadata: {
                localBalance,
                totalAgentBalance,
                deficit,
            },
        });

        return { mirroredAmount: deficit };
    }

    static async prepareLaunch(params: {
        userId: number;
        gameId?: number;
        providerCode?: string;
        gameCode?: string;
        lang?: string;
    }) {
        const resolution = await this.resolveTargetAgentForGame({
            gameId: params.gameId,
            providerCode: params.providerCode,
            gameCode: params.gameCode,
        });

        const targetAccount = await this.ensureExternalAccount(params.userId, resolution.agentConfig.id);
        const sweepResult = await this.sweepAllOtherAgentsToTarget(
            params.userId,
            resolution.agentConfig.id,
            this.buildReference(`LAUNCH_${params.userId}`),
        );
        const reconcileResult = await this.reconcileLocalDeficitToTarget(
            params.userId,
            resolution.agentConfig.id,
            this.buildReference(`LAUNCH_MIRROR_${params.userId}`),
        );

        await prisma.user.update({
            where: { id: params.userId },
            data: { lastActiveAgentId: resolution.agentConfig.id },
        });

        const targetAgentService = await AgentFactory.getAgent(resolution.agentConfig.code);
        const url = await targetAgentService.launchGame(
            targetAccount.externalUsername,
            resolution.gameCode,
            resolution.providerCode,
            params.lang || 'th'
        );

        if (!url) {
            throw new Error('AGENT_GAME_LAUNCH_FAILED');
        }

        console.log(
            `[AgentWallet] Launch prepared for user=${params.userId} target=${resolution.agentConfig.code} moved=${sweepResult.totalMoved} mirrored=${reconcileResult.mirroredAmount}`
        );

        return {
            url,
            targetAgentId: resolution.agentConfig.id,
            providerCode: resolution.providerCode,
            gameCode: resolution.gameCode,
        };
    }

    private static async loadWithdrawalPriorityAccounts(userId: number) {
        const user = await this.hydrateLegacyMainAccount(userId);
        const mainAgent = await this.getMainAgentConfig();

        const priorityAgentIds = [
            user.lastActiveAgentId,
            mainAgent.id,
            ...user.externalAccounts.map((account) => account.agentId),
        ].filter((value): value is number => typeof value === 'number' && value > 0);

        const orderedUniqueAgentIds: number[] = [];
        for (const agentId of priorityAgentIds) {
            if (!orderedUniqueAgentIds.includes(agentId)) {
                orderedUniqueAgentIds.push(agentId);
            }
        }

        return {
            user,
            orderedUniqueAgentIds,
        };
    }

    static async pullFundsForWithdrawal(
        userId: number,
        amount: number,
        referenceId?: string,
        transactionId?: number
    ): Promise<WithdrawalPullSegment[]> {
        if (amount <= 0) {
            return [];
        }

        const { user, orderedUniqueAgentIds } = await this.loadWithdrawalPriorityAccounts(userId);
        const pullRef = referenceId || this.buildReference('WITHDRAW_PULL');
        const pulledSegments: WithdrawalPullSegment[] = [];
        let remaining = amount;

        for (const agentId of orderedUniqueAgentIds) {
            if (remaining <= this.BALANCE_THRESHOLD) {
                break;
            }

            const account = user.externalAccounts.find((item) => item.agentId === agentId);
            if (!account) {
                continue;
            }

            const agentConfig = await prisma.agentConfig.findUnique({ where: { id: agentId } });
            if (!agentConfig || !agentConfig.isActive) {
                continue;
            }

            const agentService = await AgentFactory.getAgent(agentConfig.code);
            const liveBalance = await agentService.getBalance(account.externalUsername);
            if (liveBalance <= this.BALANCE_THRESHOLD) {
                continue;
            }

            const pullAmount = Math.min(remaining, liveBalance);
            const segmentRef = `${pullRef}_${agentId}_${pulledSegments.length + 1}`;
            const transferLog = await this.createTransferLog({
                userId,
                transactionId,
                sourceAgentId: agentId,
                type: 'WITHDRAW_PULL',
                amount: pullAmount,
                referenceId: segmentRef,
                note: `Pull ${pullAmount} from ${agentConfig.code}`,
            });

            const withdrawn = await agentService.withdraw(
                account.externalUsername,
                pullAmount,
                `${segmentRef}_WD`
            );

            if (withdrawn === false) {
                await this.updateTransferLog(transferLog.id, {
                    status: 'FAILED',
                    note: `WITHDRAW_PULL_FAILED:${agentConfig.code}`,
                });

                if (pulledSegments.length > 0) {
                    await this.refundPulledFunds(pulledSegments, `${segmentRef}_ROLLBACK`, 'Rollback after pull failure', transactionId);
                }

                throw new Error(`WITHDRAW_PULL_FAILED:${agentConfig.code}`);
            }

            const actualAmount = typeof withdrawn === 'number' ? withdrawn : pullAmount;
            if (actualAmount <= this.BALANCE_THRESHOLD) {
                await this.updateTransferLog(transferLog.id, {
                    status: 'FAILED',
                    note: `WITHDRAW_PULL_ZERO:${agentConfig.code}`,
                });
                continue;
            }

            pulledSegments.push({
                userId,
                sourceAgentId: agentId,
                externalUsername: account.externalUsername,
                amount: actualAmount,
                transferLogId: transferLog.id,
            });

            remaining -= actualAmount;

            await prisma.userExternalAccount.update({
                where: { id: account.id },
                data: {
                    balance: {
                        decrement: new Prisma.Decimal(actualAmount),
                    },
                },
            }).catch(() => {});

            await this.updateTransferLog(transferLog.id, {
                status: 'COMPLETED',
                note: `Pulled ${actualAmount} from ${agentConfig.code}`,
                metadata: { actualAmount },
            });
        }

        if (remaining > this.BALANCE_THRESHOLD) {
            if (pulledSegments.length > 0) {
                await this.refundPulledFunds(
                    pulledSegments,
                    `${pullRef}_ROLLBACK`,
                    'Rollback after insufficient aggregate balance',
                    transactionId
                );
            }
            throw new Error('INSUFFICIENT_AGENT_FUNDS');
        }

        return pulledSegments;
    }

    static async getPulledFundsForTransaction(transactionId: number): Promise<WithdrawalPullSegment[]> {
        const logs = await prisma.agentWalletTransferLog.findMany({
            where: {
                transactionId,
                type: 'WITHDRAW_PULL',
                status: 'COMPLETED',
            },
            orderBy: { id: 'asc' },
            include: {
                sourceAgent: true,
            },
        });

        const accounts = await prisma.userExternalAccount.findMany({
            where: {
                userId: { in: [...new Set(logs.map((log) => log.userId))] },
            },
        });

        return logs
            .filter((log) => log.sourceAgentId)
            .map((log) => ({
                userId: log.userId,
                sourceAgentId: log.sourceAgentId!,
                externalUsername: accounts.find(
                    (account) => account.userId === log.userId && account.agentId === log.sourceAgentId
                )?.externalUsername || '',
                amount: this.toNumber(log.amount),
                transferLogId: log.id,
            }));
    }

    static async refundPulledFunds(
        pulls: WithdrawalPullSegment[],
        referenceId?: string,
        reason?: string,
        transactionId?: number
    ) {
        const refundRef = referenceId || this.buildReference('WITHDRAW_REFUND');
        const refundErrors: Array<{ agentId: number; message: string }> = [];

        for (const [index, pull] of pulls.entries()) {
            const agentConfig = await prisma.agentConfig.findUnique({ where: { id: pull.sourceAgentId } });
            if (!agentConfig) {
                refundErrors.push({
                    agentId: pull.sourceAgentId,
                    message: 'AGENT_NOT_FOUND',
                });
                continue;
            }

            let externalUsername = pull.externalUsername;
            if (!externalUsername) {
                const externalAccount = await prisma.userExternalAccount.findUnique({
                    where: {
                        userId_agentId: {
                            userId: pull.userId,
                            agentId: pull.sourceAgentId,
                        },
                    },
                });
                externalUsername = externalAccount?.externalUsername || '';
            }

            if (!externalUsername) {
                refundErrors.push({
                    agentId: pull.sourceAgentId,
                    message: 'EXTERNAL_USERNAME_NOT_FOUND',
                });
                continue;
            }

            const refundLog = await this.createTransferLog({
                userId: pull.userId,
                transactionId: transactionId ?? null,
                targetAgentId: pull.sourceAgentId,
                type: 'WITHDRAW_REFUND',
                amount: pull.amount,
                referenceId: `${refundRef}_${index + 1}`,
                note: reason || 'Refund withdrawal pull',
                metadata: {
                    originalTransferLogId: pull.transferLogId,
                },
            });

            const agentService = await AgentFactory.getAgent(agentConfig.code);
            const success = await agentService.deposit(
                externalUsername,
                pull.amount,
                `${refundRef}_${index + 1}_DEP`
            );

            if (!success) {
                await this.updateTransferLog(refundLog.id, {
                    status: 'FAILED',
                    note: `WITHDRAW_REFUND_FAILED:${agentConfig.code}`,
                });
                refundErrors.push({
                    agentId: pull.sourceAgentId,
                    message: `WITHDRAW_REFUND_FAILED:${agentConfig.code}`,
                });
                continue;
            }

            await prisma.userExternalAccount.updateMany({
                where: {
                    agentId: pull.sourceAgentId,
                    externalUsername,
                },
                data: {
                    balance: { increment: new Prisma.Decimal(pull.amount) },
                },
            }).catch(() => {});

            await this.updateTransferLog(refundLog.id, {
                status: 'COMPLETED',
                note: reason || 'Refund withdrawal pull',
            });
        }

        if (refundErrors.length > 0) {
            throw new Error(`WITHDRAW_REFUND_FAILED:${refundErrors.map((item) => item.message).join(',')}`);
        }

        return { success: true };
    }
}

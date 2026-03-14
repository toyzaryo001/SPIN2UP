import { BetLogSyncService } from './bet-log-sync.service.js';
import { RewardSnapshotService } from './reward-snapshot.service.js';
import { JobLockService } from './job-lock.service.js';
import { NexusLogSyncService } from './nexus-log-sync.service.js';

type JobTimer = ReturnType<typeof setInterval>;

type JobConfig = {
    name: string;
    intervalMs: number;
    runImmediately?: boolean;
    task: () => Promise<void>;
};

export class BackgroundJobsService {
    private static started = false;
    private static timers: JobTimer[] = [];

    private static getInterval(envKey: string, fallbackMs: number) {
        const raw = Number(process.env[envKey] || fallbackMs);
        if (!Number.isFinite(raw) || raw <= 0) {
            return fallbackMs;
        }
        return raw;
    }

    private static async runJob(config: JobConfig) {
        const lockKey = `job:${config.name}`;
        const executed = await JobLockService.runExclusive(lockKey, async () => {
            const startedAt = Date.now();
            try {
                await config.task();
                console.log(`[Jobs] ${config.name} completed in ${Date.now() - startedAt}ms`);
            } catch (error) {
                console.error(`[Jobs] ${config.name} failed:`, error);
            }
        });

        if (!executed) {
            console.log(`[Jobs] ${config.name} skipped because another instance is running it`);
        }
    }

    private static registerJob(config: JobConfig) {
        if (config.runImmediately !== false) {
            void this.runJob(config);
        }

        const timer = setInterval(() => {
            void this.runJob(config);
        }, config.intervalMs);

        this.timers.push(timer);
        console.log(`[Jobs] Registered ${config.name} every ${config.intervalMs}ms`);
    }

    static start() {
        if (this.started) {
            return;
        }

        if (process.env.ENABLE_BACKGROUND_JOBS === 'false') {
            console.log('[Jobs] Background jobs disabled by ENABLE_BACKGROUND_JOBS=false');
            this.started = true;
            return;
        }

        this.started = true;

        this.registerJob({
            name: 'bet-log-sync',
            intervalMs: this.getInterval('BETLOG_SYNC_INTERVAL_MS', 60_000),
            task: async () => {
                await BetLogSyncService.syncLogs();
            },
        });

        this.registerJob({
            name: 'cashback-snapshot-sync',
            intervalMs: this.getInterval('CASHBACK_SNAPSHOT_INTERVAL_MS', 300_000),
            task: async () => {
                await RewardSnapshotService.syncDailySnapshots('CASHBACK');
            },
        });

        this.registerJob({
            name: 'nexus-log-sync',
            intervalMs: this.getInterval('NEXUS_LOG_SYNC_INTERVAL_MS', 300_000),
            task: async () => {
                await NexusLogSyncService.syncRecentWindow();
            },
        });
    }

    static stop() {
        for (const timer of this.timers) {
            clearInterval(timer);
        }
        this.timers = [];
        this.started = false;
    }
}

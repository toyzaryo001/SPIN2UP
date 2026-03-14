import prisma from '../lib/db.js';

type LockAcquireRow = { value: string };

export class JobLockService {
    private static LOCK_PREFIX = '__JOB_LOCK__:';
    private static DEFAULT_TTL_MS = 10 * 60 * 1000;

    private static getSettingKey(jobKey: string) {
        return `${this.LOCK_PREFIX}${jobKey}`;
    }

    private static getTtlMs() {
        const raw = Number(process.env.JOB_LOCK_TTL_MS || this.DEFAULT_TTL_MS);
        if (!Number.isFinite(raw) || raw <= 0) {
            return this.DEFAULT_TTL_MS;
        }
        return raw;
    }

    private static parseExpiresAt(value?: string | null) {
        if (!value) return 0;

        const [, expiresAtRaw = '0'] = String(value).split('|');
        const expiresAt = Number(expiresAtRaw);
        return Number.isFinite(expiresAt) ? expiresAt : 0;
    }

    static async acquire(jobKey: string) {
        const now = Date.now();
        const token = `${process.pid}-${now}-${Math.random().toString(36).slice(2, 10)}`;
        const expiresAt = now + this.getTtlMs();
        const value = `${token}|${expiresAt}`;
        const key = this.getSettingKey(jobKey);

        const result = await prisma.$queryRaw<LockAcquireRow[]>`
            INSERT INTO "Setting" ("key", "value")
            VALUES (${key}, ${value})
            ON CONFLICT ("key") DO UPDATE
            SET "value" = EXCLUDED."value"
            WHERE
                CASE
                    WHEN split_part("Setting"."value", '|', 2) ~ '^[0-9]+$'
                    THEN CAST(split_part("Setting"."value", '|', 2) AS BIGINT) < ${now}
                    ELSE true
                END
            RETURNING "value"
        `;

        const acquired = result[0]?.value === value;

        if (!acquired) {
            const existing = await prisma.setting.findUnique({
                where: { key },
                select: { value: true },
            });

            const expiresAt = this.parseExpiresAt(existing?.value);
            if (expiresAt > now) {
                console.log(`[JobLock] ${jobKey} is locked until ${new Date(expiresAt).toISOString()}`);
            }

            return null;
        }

        return { key, value };
    }

    static async release(lockHandle: { key: string; value: string } | null) {
        if (!lockHandle) return;

        await prisma.setting.deleteMany({
            where: {
                key: lockHandle.key,
                value: lockHandle.value,
            },
        });
    }

    static async runExclusive(jobKey: string, job: () => Promise<void>) {
        const lockHandle = await this.acquire(jobKey);
        if (!lockHandle) {
            return false;
        }

        try {
            await job();
            return true;
        } finally {
            await this.release(lockHandle).catch((error) => {
                console.error(`[JobLock] Failed to release ${jobKey}:`, error);
            });
        }
    }
}

import prisma from '../lib/db.js';

type LockRow = { locked: boolean };

export class JobLockService {
    static async acquire(jobKey: string) {
        const result = await prisma.$queryRaw<LockRow[]>`
            SELECT pg_try_advisory_lock(hashtext(${jobKey})) AS locked
        `;

        return result[0]?.locked === true;
    }

    static async release(jobKey: string) {
        await prisma.$queryRaw`
            SELECT pg_advisory_unlock(hashtext(${jobKey}))
        `;
    }

    static async runExclusive(jobKey: string, job: () => Promise<void>) {
        const locked = await this.acquire(jobKey);
        if (!locked) {
            return false;
        }

        try {
            await job();
            return true;
        } finally {
            await this.release(jobKey).catch((error) => {
                console.error(`[JobLock] Failed to release ${jobKey}:`, error);
            });
        }
    }
}

CREATE TABLE IF NOT EXISTS "RewardDailyStat" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "statDate" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "claimedUserCount" INTEGER NOT NULL DEFAULT 0,
    "claimCount" INTEGER NOT NULL DEFAULT 0,
    "totalClaimedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardDailyStat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RewardDailyStat_type_statDate_key"
ON "RewardDailyStat"("type", "statDate");

CREATE INDEX IF NOT EXISTS "RewardDailyStat_type_statDate_idx"
ON "RewardDailyStat"("type", "statDate");

INSERT INTO "RewardDailyStat" (
    "type",
    "statDate",
    "periodStart",
    "periodEnd",
    "claimedUserCount",
    "claimCount",
    "totalClaimedAmount",
    "createdAt",
    "updatedAt"
)
SELECT
    "type",
    DATE_TRUNC('day', "periodStart") AS "statDate",
    MIN("periodStart") AS "periodStart",
    MAX("periodEnd") AS "periodEnd",
    COUNT(DISTINCT "userId")::INTEGER AS "claimedUserCount",
    COUNT(*)::INTEGER AS "claimCount",
    COALESCE(SUM("amount"), 0) AS "totalClaimedAmount",
    CURRENT_TIMESTAMP AS "createdAt",
    CURRENT_TIMESTAMP AS "updatedAt"
FROM "RewardClaim"
GROUP BY
    "type",
    DATE_TRUNC('day', "periodStart")
ON CONFLICT ("type", "statDate") DO UPDATE SET
    "periodStart" = EXCLUDED."periodStart",
    "periodEnd" = EXCLUDED."periodEnd",
    "claimedUserCount" = EXCLUDED."claimedUserCount",
    "claimCount" = EXCLUDED."claimCount",
    "totalClaimedAmount" = EXCLUDED."totalClaimedAmount",
    "updatedAt" = CURRENT_TIMESTAMP;

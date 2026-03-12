ALTER TABLE "RewardDailyStat"
ADD COLUMN IF NOT EXISTS "eligibleUserCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "unclaimedUserCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "totalCalculatedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "RewardUserSnapshot" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "statDate" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "turnover" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "netLoss" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "rewardAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "isClaimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardUserSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RewardUserSnapshot_userId_type_statDate_key"
ON "RewardUserSnapshot"("userId", "type", "statDate");

CREATE INDEX IF NOT EXISTS "RewardUserSnapshot_type_statDate_idx"
ON "RewardUserSnapshot"("type", "statDate");

CREATE INDEX IF NOT EXISTS "RewardUserSnapshot_type_statDate_isClaimed_idx"
ON "RewardUserSnapshot"("type", "statDate", "isClaimed");

ALTER TABLE "RewardUserSnapshot"
ADD CONSTRAINT "RewardUserSnapshot_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "RewardUserSnapshot" (
    "userId",
    "type",
    "statDate",
    "periodStart",
    "periodEnd",
    "rewardAmount",
    "isClaimed",
    "claimedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    rc."userId",
    rc."type",
    DATE_TRUNC('day', rc."periodStart") AS "statDate",
    rc."periodStart",
    rc."periodEnd",
    rc."amount" AS "rewardAmount",
    true AS "isClaimed",
    rc."claimedAt",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "RewardClaim" rc
ON CONFLICT ("userId", "type", "statDate") DO UPDATE SET
    "periodStart" = EXCLUDED."periodStart",
    "periodEnd" = EXCLUDED."periodEnd",
    "rewardAmount" = EXCLUDED."rewardAmount",
    "isClaimed" = true,
    "claimedAt" = EXCLUDED."claimedAt",
    "updatedAt" = CURRENT_TIMESTAMP;

WITH daily_claims AS (
    SELECT
        rc."type",
        DATE_TRUNC('day', rc."periodStart") AS "statDate",
        MIN(rc."periodStart") AS "periodStart",
        MAX(rc."periodEnd") AS "periodEnd",
        COUNT(DISTINCT rc."userId")::INTEGER AS "claimedUserCount",
        COUNT(DISTINCT rc."userId")::INTEGER AS "eligibleUserCount",
        0::INTEGER AS "unclaimedUserCount",
        COUNT(*)::INTEGER AS "claimCount",
        COALESCE(SUM(rc."amount"), 0) AS "totalCalculatedAmount",
        COALESCE(SUM(rc."amount"), 0) AS "totalClaimedAmount"
    FROM "RewardClaim" rc
    GROUP BY rc."type", DATE_TRUNC('day', rc."periodStart")
)
INSERT INTO "RewardDailyStat" (
    "type",
    "statDate",
    "periodStart",
    "periodEnd",
    "eligibleUserCount",
    "claimedUserCount",
    "unclaimedUserCount",
    "claimCount",
    "totalCalculatedAmount",
    "totalClaimedAmount",
    "createdAt",
    "updatedAt"
)
SELECT
    dc."type",
    dc."statDate",
    dc."periodStart",
    dc."periodEnd",
    dc."eligibleUserCount",
    dc."claimedUserCount",
    dc."unclaimedUserCount",
    dc."claimCount",
    dc."totalCalculatedAmount",
    dc."totalClaimedAmount",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM daily_claims dc
ON CONFLICT ("type", "statDate") DO UPDATE SET
    "periodStart" = EXCLUDED."periodStart",
    "periodEnd" = EXCLUDED."periodEnd",
    "eligibleUserCount" = EXCLUDED."eligibleUserCount",
    "claimedUserCount" = EXCLUDED."claimedUserCount",
    "unclaimedUserCount" = EXCLUDED."unclaimedUserCount",
    "claimCount" = EXCLUDED."claimCount",
    "totalCalculatedAmount" = EXCLUDED."totalCalculatedAmount",
    "totalClaimedAmount" = EXCLUDED."totalClaimedAmount",
    "updatedAt" = CURRENT_TIMESTAMP;

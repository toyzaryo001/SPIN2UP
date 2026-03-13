CREATE TABLE "RankRewardClaim" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "rankTierId" TEXT NOT NULL,
    "rankName" TEXT NOT NULL,
    "rewardAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "turnoverAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalDepositAtClaim" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankRewardClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RankRewardClaim_userId_rankTierId_key" ON "RankRewardClaim"("userId", "rankTierId");
CREATE INDEX "RankRewardClaim_rankTierId_idx" ON "RankRewardClaim"("rankTierId");
CREATE INDEX "RankRewardClaim_claimedAt_idx" ON "RankRewardClaim"("claimedAt");

ALTER TABLE "RankRewardClaim"
ADD CONSTRAINT "RankRewardClaim_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

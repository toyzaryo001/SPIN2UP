ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "commissionTurnover" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "commissionCycleStartedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "User_commissionTurnover_idx" ON "User"("commissionTurnover");

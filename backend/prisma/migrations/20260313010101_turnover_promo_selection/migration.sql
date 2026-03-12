-- Bring drifted turnover columns into migration history
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "turnoverLimit" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "currentTurnover" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "selectedPromotionId" INTEGER,
ADD COLUMN IF NOT EXISTS "selectedPromotionAt" TIMESTAMP(3);

UPDATE "User"
SET
  "turnoverLimit" = COALESCE("turnoverLimit", 0),
  "currentTurnover" = COALESCE("currentTurnover", 0)
WHERE "turnoverLimit" IS NULL
   OR "currentTurnover" IS NULL;

ALTER TABLE "User"
ALTER COLUMN "turnoverLimit" SET NOT NULL,
ALTER COLUMN "currentTurnover" SET NOT NULL;

-- Replace legacy promotion.turnover with the new per-promotion flags
ALTER TABLE "Promotion"
ADD COLUMN IF NOT EXISTS "requiresTurnover" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "turnoverMultiplier" DECIMAL(65,30) DEFAULT 1;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Promotion'
          AND column_name = 'turnover'
    ) THEN
        EXECUTE '
            UPDATE "Promotion"
            SET
              "requiresTurnover" = COALESCE("turnover", 0) > 0,
              "turnoverMultiplier" = CASE
                WHEN COALESCE("turnover", 0) > 0 THEN "turnover"
                ELSE COALESCE("turnoverMultiplier", 1)
              END
        ';
        EXECUTE 'ALTER TABLE "Promotion" DROP COLUMN IF EXISTS "turnover"';
    END IF;
END $$;

-- Add promotion metadata to transactions
ALTER TABLE "Transaction"
ADD COLUMN IF NOT EXISTS "promotionId" INTEGER,
ADD COLUMN IF NOT EXISTS "promotionBonusAmount" DECIMAL(65,30) DEFAULT 0;

UPDATE "Transaction"
SET "promotionBonusAmount" = 0
WHERE "promotionBonusAmount" IS NULL;

ALTER TABLE "Transaction"
ALTER COLUMN "promotionBonusAmount" SET NOT NULL;

-- Extend promotion logs for idempotent post-deposit bonus application
ALTER TABLE "PromotionLog"
ADD COLUMN IF NOT EXISTS "transactionId" INTEGER,
ADD COLUMN IF NOT EXISTS "turnoverApplied" DECIMAL(65,30) DEFAULT 0;

UPDATE "PromotionLog"
SET "turnoverApplied" = 0
WHERE "turnoverApplied" IS NULL;

ALTER TABLE "PromotionLog"
ALTER COLUMN "turnoverApplied" SET NOT NULL;

-- Support streak turnover fields in migration history
ALTER TABLE "StreakSetting"
ADD COLUMN IF NOT EXISTS "requiresTurnover" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "turnoverMultiplier" DECIMAL(65,30) DEFAULT 1;

-- Support decimal streak turnover multipliers
ALTER TABLE "StreakSetting"
ALTER COLUMN "turnoverMultiplier" TYPE DECIMAL(65,30)
USING "turnoverMultiplier"::DECIMAL(65,30);

-- Foreign keys and indexes
CREATE INDEX IF NOT EXISTS "User_selectedPromotionId_idx" ON "User"("selectedPromotionId");
CREATE INDEX IF NOT EXISTS "Transaction_promotionId_idx" ON "Transaction"("promotionId");
CREATE UNIQUE INDEX IF NOT EXISTS "PromotionLog_transactionId_key" ON "PromotionLog"("transactionId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'User_selectedPromotionId_fkey'
    ) THEN
        ALTER TABLE "User"
        ADD CONSTRAINT "User_selectedPromotionId_fkey"
        FOREIGN KEY ("selectedPromotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Transaction_promotionId_fkey'
    ) THEN
        ALTER TABLE "Transaction"
        ADD CONSTRAINT "Transaction_promotionId_fkey"
        FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'PromotionLog_transactionId_fkey'
    ) THEN
        ALTER TABLE "PromotionLog"
        ADD CONSTRAINT "PromotionLog_transactionId_fkey"
        FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

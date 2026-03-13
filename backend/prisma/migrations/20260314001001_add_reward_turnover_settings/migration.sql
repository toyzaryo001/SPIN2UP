ALTER TABLE "CashbackSetting"
ADD COLUMN "requiresTurnover" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "turnoverMultiplier" DECIMAL(65,30) NOT NULL DEFAULT 1;

ALTER TABLE "TurnoverSetting"
ADD COLUMN "requiresTurnover" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "turnoverMultiplier" DECIMAL(65,30) NOT NULL DEFAULT 1;

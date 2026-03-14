ALTER TABLE "Transaction"
ADD COLUMN "settledAgentId" INTEGER,
ADD COLUMN "settledExternalUsername" TEXT,
ADD COLUMN "settleStatus" TEXT,
ADD COLUMN "settledAmount" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN "settledAt" TIMESTAMP(3);

ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_settledAgentId_fkey"
FOREIGN KEY ("settledAgentId") REFERENCES "AgentConfig"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Transaction_settledAgentId_idx" ON "Transaction"("settledAgentId");
CREATE INDEX "Transaction_settleStatus_idx" ON "Transaction"("settleStatus");

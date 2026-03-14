CREATE TABLE "AgentWalletTransferLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "transactionId" INTEGER,
    "sourceAgentId" INTEGER,
    "targetAgentId" INTEGER,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "referenceId" TEXT,
    "note" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentWalletTransferLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentWalletTransferLog_userId_idx" ON "AgentWalletTransferLog"("userId");
CREATE INDEX "AgentWalletTransferLog_transactionId_idx" ON "AgentWalletTransferLog"("transactionId");
CREATE INDEX "AgentWalletTransferLog_sourceAgentId_idx" ON "AgentWalletTransferLog"("sourceAgentId");
CREATE INDEX "AgentWalletTransferLog_targetAgentId_idx" ON "AgentWalletTransferLog"("targetAgentId");
CREATE INDEX "AgentWalletTransferLog_type_status_idx" ON "AgentWalletTransferLog"("type", "status");
CREATE INDEX "AgentWalletTransferLog_referenceId_idx" ON "AgentWalletTransferLog"("referenceId");
CREATE INDEX "AgentWalletTransferLog_createdAt_idx" ON "AgentWalletTransferLog"("createdAt");

ALTER TABLE "AgentWalletTransferLog"
ADD CONSTRAINT "AgentWalletTransferLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AgentWalletTransferLog"
ADD CONSTRAINT "AgentWalletTransferLog_transactionId_fkey"
FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AgentWalletTransferLog"
ADD CONSTRAINT "AgentWalletTransferLog_sourceAgentId_fkey"
FOREIGN KEY ("sourceAgentId") REFERENCES "AgentConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AgentWalletTransferLog"
ADD CONSTRAINT "AgentWalletTransferLog_targetAgentId_fkey"
FOREIGN KEY ("targetAgentId") REFERENCES "AgentConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

WITH "resolved_main_agent" AS (
    SELECT COALESCE(
        (SELECT "id" FROM "AgentConfig" WHERE "isMain" = true ORDER BY "id" ASC LIMIT 1),
        (SELECT "id" FROM "AgentConfig" WHERE "code" = 'BETFLIX' ORDER BY "id" ASC LIMIT 1)
    ) AS "id"
)
INSERT INTO "UserExternalAccount" (
    "userId",
    "agentId",
    "externalUsername",
    "externalPassword",
    "balance",
    "createdAt",
    "updatedAt"
)
SELECT
    u."id",
    rma."id",
    u."betflixUsername",
    COALESCE(u."betflixPassword", ''),
    0,
    NOW(),
    NOW()
FROM "User" u
CROSS JOIN "resolved_main_agent" rma
WHERE rma."id" IS NOT NULL
  AND u."betflixUsername" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "UserExternalAccount" ea
    WHERE ea."userId" = u."id"
      AND ea."agentId" = rma."id"
  );

WITH "resolved_main_agent" AS (
    SELECT COALESCE(
        (SELECT "id" FROM "AgentConfig" WHERE "isMain" = true ORDER BY "id" ASC LIMIT 1),
        (SELECT "id" FROM "AgentConfig" WHERE "code" = 'BETFLIX' ORDER BY "id" ASC LIMIT 1)
    ) AS "id"
)
UPDATE "User" u
SET "lastActiveAgentId" = rma."id",
    "updatedAt" = NOW()
FROM "resolved_main_agent" rma
WHERE rma."id" IS NOT NULL
  AND u."betflixUsername" IS NOT NULL
  AND u."lastActiveAgentId" IS NULL;

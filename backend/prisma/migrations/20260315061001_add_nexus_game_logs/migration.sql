CREATE TABLE "NexusGameLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "externalUsername" TEXT NOT NULL,
    "providerCode" TEXT,
    "gameCode" TEXT,
    "gameType" TEXT NOT NULL,
    "txnId" TEXT NOT NULL,
    "txnType" TEXT NOT NULL,
    "betAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "winAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "occurredAtUtc" TIMESTAMP(3) NOT NULL,
    "occurredAtThai" TIMESTAMP(3) NOT NULL,
    "thaiStatDate" TIMESTAMP(3) NOT NULL,
    "rawPayload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NexusGameLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NexusGameLog_externalUsername_txnId_txnType_key"
ON "NexusGameLog"("externalUsername", "txnId", "txnType");

CREATE INDEX "NexusGameLog_userId_thaiStatDate_idx"
ON "NexusGameLog"("userId", "thaiStatDate");

CREATE INDEX "NexusGameLog_externalUsername_occurredAtUtc_idx"
ON "NexusGameLog"("externalUsername", "occurredAtUtc");

CREATE INDEX "NexusGameLog_thaiStatDate_idx"
ON "NexusGameLog"("thaiStatDate");

ALTER TABLE "NexusGameLog"
ADD CONSTRAINT "NexusGameLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

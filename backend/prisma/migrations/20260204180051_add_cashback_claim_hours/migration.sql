-- AlterTable
ALTER TABLE "CashbackSetting" ADD COLUMN     "claimEndHour" INTEGER NOT NULL DEFAULT 23,
ADD COLUMN     "claimStartHour" INTEGER NOT NULL DEFAULT 0;

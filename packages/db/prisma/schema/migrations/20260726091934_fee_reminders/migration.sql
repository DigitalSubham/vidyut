-- CreateEnum
CREATE TYPE "NotifChannel" AS ENUM ('PUSH', 'SMS', 'WHATSAPP', 'EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotifStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "WalletTxnType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "channel" "NotifChannel" NOT NULL,
    "templateKey" TEXT NOT NULL,
    "toUserId" TEXT,
    "toPhone" TEXT,
    "status" "NotifStatus" NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTxn" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "WalletTxnType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTxn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationLog_tenantId_idx" ON "NotificationLog"("tenantId");

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTxn" ADD CONSTRAINT "WalletTxn_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

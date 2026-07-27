-- CreateEnum
CREATE TYPE "PlatformInvoiceStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateTable
CREATE TABLE "PlatformInvoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PlatformInvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformInvoice_invoiceNo_key" ON "PlatformInvoice"("invoiceNo");

-- CreateIndex
CREATE INDEX "PlatformInvoice_tenantId_idx" ON "PlatformInvoice"("tenantId");

-- AddForeignKey
ALTER TABLE "PlatformInvoice" ADD CONSTRAINT "PlatformInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformInvoice" ADD CONSTRAINT "PlatformInvoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- No RLS on this table (platform-managed, same posture as Plan/Subscription/ModuleToggle).

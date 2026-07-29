-- CreateEnum
CREATE TYPE "DataDeletionRequestStatus" AS ENUM ('PENDING', 'REJECTED', 'EXECUTED');

-- DropIndex
DROP INDEX "invoice_number_trgm_idx";

-- DropIndex
DROP INDEX "student_admission_no_trgm_idx";

-- DropIndex
DROP INDEX "student_first_name_trgm_idx";

-- DropIndex
DROP INDEX "student_last_name_trgm_idx";

-- DropIndex
DROP INDEX "user_name_trgm_idx";

-- AlterTable
ALTER TABLE "Guardian" ADD COLUMN     "consentedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DataDeletionRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reason" TEXT,
    "status" "DataDeletionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "executedById" TEXT,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataDeletionRequest_tenantId_idx" ON "DataDeletionRequest"("tenantId");

-- AddForeignKey
ALTER TABLE "DataDeletionRequest" ADD CONSTRAINT "DataDeletionRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

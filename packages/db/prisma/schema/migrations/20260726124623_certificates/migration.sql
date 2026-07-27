-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('TC', 'BONAFIDE', 'CHARACTER', 'CONDUCT', 'ID_CARD', 'ADMIT_CARD', 'CUSTOM');

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "CertificateType" NOT NULL,
    "customTitle" TEXT,
    "number" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedById" TEXT NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Certificate_tenantId_idx" ON "Certificate"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_branchId_type_number_key" ON "Certificate"("branchId", "type", "number");

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('TUITION', 'TRANSPORT', 'EXAM', 'ADMISSION', 'LAB', 'MISC');

-- CreateEnum
CREATE TYPE "FeeFrequency" AS ENUM ('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'TERM', 'ANNUAL');

-- CreateEnum
CREATE TYPE "ConcessionType" AS ENUM ('RTE', 'BPL', 'SIBLING', 'STAFF', 'MERIT', 'SCHOLARSHIP', 'OTHER');

-- CreateEnum
CREATE TYPE "ConcessionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "FeeHead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FeeType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FeeHead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeStructure" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "classId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FeeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeStructureItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "structureId" TEXT NOT NULL,
    "feeHeadId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "frequency" "FeeFrequency" NOT NULL,
    "dueDayOfMonth" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeStructureItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FineRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "feeStructureItemId" TEXT NOT NULL,
    "graceDays" INTEGER NOT NULL,
    "isPercent" BOOLEAN NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FineRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "structureId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "ConcessionType" NOT NULL,
    "value" INTEGER NOT NULL,
    "isPercent" BOOLEAN NOT NULL,
    "status" "ConcessionStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Concession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeeHead_tenantId_idx" ON "FeeHead"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeHead_branchId_name_key" ON "FeeHead"("branchId", "name");

-- CreateIndex
CREATE INDEX "FeeStructure_tenantId_idx" ON "FeeStructure"("tenantId");

-- CreateIndex
CREATE INDEX "FeeStructureItem_tenantId_idx" ON "FeeStructureItem"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeStructureItem_structureId_feeHeadId_key" ON "FeeStructureItem"("structureId", "feeHeadId");

-- CreateIndex
CREATE UNIQUE INDEX "FineRule_feeStructureItemId_key" ON "FineRule"("feeStructureItemId");

-- CreateIndex
CREATE INDEX "FineRule_tenantId_idx" ON "FineRule"("tenantId");

-- CreateIndex
CREATE INDEX "FeeAssignment_tenantId_idx" ON "FeeAssignment"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeAssignment_studentId_structureId_key" ON "FeeAssignment"("studentId", "structureId");

-- CreateIndex
CREATE INDEX "Concession_tenantId_idx" ON "Concession"("tenantId");

-- AddForeignKey
ALTER TABLE "FeeHead" ADD CONSTRAINT "FeeHead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeHead" ADD CONSTRAINT "FeeHead_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructureItem" ADD CONSTRAINT "FeeStructureItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructureItem" ADD CONSTRAINT "FeeStructureItem_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "FeeStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructureItem" ADD CONSTRAINT "FeeStructureItem_feeHeadId_fkey" FOREIGN KEY ("feeHeadId") REFERENCES "FeeHead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FineRule" ADD CONSTRAINT "FineRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FineRule" ADD CONSTRAINT "FineRule_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FineRule" ADD CONSTRAINT "FineRule_feeStructureItemId_fkey" FOREIGN KEY ("feeStructureItemId") REFERENCES "FeeStructureItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeAssignment" ADD CONSTRAINT "FeeAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeAssignment" ADD CONSTRAINT "FeeAssignment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeAssignment" ADD CONSTRAINT "FeeAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeAssignment" ADD CONSTRAINT "FeeAssignment_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "FeeStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concession" ADD CONSTRAINT "Concession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concession" ADD CONSTRAINT "Concession_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concession" ADD CONSTRAINT "Concession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

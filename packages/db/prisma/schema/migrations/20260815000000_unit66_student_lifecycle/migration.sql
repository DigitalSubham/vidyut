-- CreateEnum
CREATE TYPE "StudentTimelineType" AS ENUM ('DISCIPLINE', 'ACHIEVEMENT', 'NOTE');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "siblingGroupId" TEXT;

-- CreateTable
CREATE TABLE "SiblingGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiblingGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiblingGroup_tenantId_idx" ON "SiblingGroup"("tenantId");

-- CreateTable
CREATE TABLE "StudentTimelineEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "StudentTimelineType" NOT NULL,
    "body" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentTimelineEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentTimelineEntry_tenantId_idx" ON "StudentTimelineEntry"("tenantId");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_siblingGroupId_fkey" FOREIGN KEY ("siblingGroupId") REFERENCES "SiblingGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiblingGroup" ADD CONSTRAINT "SiblingGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTimelineEntry" ADD CONSTRAINT "StudentTimelineEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentTimelineEntry" ADD CONSTRAINT "StudentTimelineEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentTimelineEntry" ADD CONSTRAINT "StudentTimelineEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

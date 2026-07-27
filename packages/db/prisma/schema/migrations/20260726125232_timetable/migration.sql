-- CreateTable
CREATE TABLE "TimetablePeriod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "periodNo" INTEGER NOT NULL,
    "subjectId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "room" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetablePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimetablePeriod_tenantId_idx" ON "TimetablePeriod"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetablePeriod_sectionId_dayOfWeek_periodNo_key" ON "TimetablePeriod"("sectionId", "dayOfWeek", "periodNo");

-- AddForeignKey
ALTER TABLE "TimetablePeriod" ADD CONSTRAINT "TimetablePeriod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetablePeriod" ADD CONSTRAINT "TimetablePeriod_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetablePeriod" ADD CONSTRAINT "TimetablePeriod_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetablePeriod" ADD CONSTRAINT "TimetablePeriod_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetablePeriod" ADD CONSTRAINT "TimetablePeriod_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetablePeriod" ADD CONSTRAINT "TimetablePeriod_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

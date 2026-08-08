-- CreateTable
CREATE TABLE "Substitution" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "timetablePeriodId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "substituteStaffId" TEXT NOT NULL,
    "room" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Substitution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Substitution_timetablePeriodId_date_key" ON "Substitution"("timetablePeriodId", "date");

-- CreateIndex
CREATE INDEX "Substitution_tenantId_idx" ON "Substitution"("tenantId");

-- CreateIndex
CREATE INDEX "Substitution_branchId_date_idx" ON "Substitution"("branchId", "date");

-- AddForeignKey
ALTER TABLE "Substitution" ADD CONSTRAINT "Substitution_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Substitution" ADD CONSTRAINT "Substitution_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Substitution" ADD CONSTRAINT "Substitution_timetablePeriodId_fkey" FOREIGN KEY ("timetablePeriodId") REFERENCES "TimetablePeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Substitution" ADD CONSTRAINT "Substitution_substituteStaffId_fkey" FOREIGN KEY ("substituteStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

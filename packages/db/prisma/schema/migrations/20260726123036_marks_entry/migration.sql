-- CreateTable
CREATE TABLE "MarksEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "examSubjectId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "marks" INTEGER,
    "grade" TEXT,
    "isAbsent" BOOLEAN NOT NULL DEFAULT false,
    "enteredById" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarksEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarksEntry_tenantId_idx" ON "MarksEntry"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "MarksEntry_examSubjectId_studentId_key" ON "MarksEntry"("examSubjectId", "studentId");

-- AddForeignKey
ALTER TABLE "MarksEntry" ADD CONSTRAINT "MarksEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarksEntry" ADD CONSTRAINT "MarksEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarksEntry" ADD CONSTRAINT "MarksEntry_examSubjectId_fkey" FOREIGN KEY ("examSubjectId") REFERENCES "ExamSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarksEntry" ADD CONSTRAINT "MarksEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

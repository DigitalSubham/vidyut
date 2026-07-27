-- CreateTable
CREATE TABLE "ReportCardTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "board" "Board" NOT NULL,
    "layout" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ReportCardTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportCard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportCardTemplate_tenantId_idx" ON "ReportCardTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "ReportCard_tenantId_idx" ON "ReportCard"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportCard_examId_studentId_key" ON "ReportCard"("examId", "studentId");

-- AddForeignKey
ALTER TABLE "ReportCardTemplate" ADD CONSTRAINT "ReportCardTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCardTemplate" ADD CONSTRAINT "ReportCardTemplate_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReportCardTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

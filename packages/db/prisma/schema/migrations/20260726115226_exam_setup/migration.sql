-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('UNIT_TEST', 'HALF_YEARLY', 'ANNUAL', 'PRE_BOARD', 'PRACTICAL');

-- CreateEnum
CREATE TYPE "GradingScheme" AS ENUM ('MARKS', 'PERCENTAGE', 'GRADE', 'CCE', 'CGPA');

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ExamType" NOT NULL,
    "gradingScheme" "GradingScheme" NOT NULL,
    "startDate" TIMESTAMP(3),
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSubject" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "maxMarks" INTEGER NOT NULL,
    "passMarks" INTEGER NOT NULL,
    "weightage" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamSubject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Exam_tenantId_idx" ON "Exam"("tenantId");

-- CreateIndex
CREATE INDEX "ExamSubject_tenantId_idx" ON "ExamSubject"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSubject_examId_classId_subjectId_key" ON "ExamSubject"("examId", "classId", "subjectId");

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSubject" ADD CONSTRAINT "ExamSubject_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSubject" ADD CONSTRAINT "ExamSubject_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSubject" ADD CONSTRAINT "ExamSubject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSubject" ADD CONSTRAINT "ExamSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

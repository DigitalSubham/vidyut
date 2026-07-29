-- CreateTable
CREATE TABLE "ExamTimetable" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "room" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamTimetable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoScholasticGrade" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "enteredById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoScholasticGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionBankItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctOptionIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionBankItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineExam" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlineExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineExamQuestion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "onlineExamId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctOptionIndex" INTEGER NOT NULL,
    "marks" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL,

    CONSTRAINT "OnlineExamQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnlineExamSubmission" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "onlineExamId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnlineExamSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamTimetable_tenantId_idx" ON "ExamTimetable"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamTimetable_examId_subjectId_key" ON "ExamTimetable"("examId", "subjectId");

-- CreateIndex
CREATE INDEX "CoScholasticGrade_tenantId_idx" ON "CoScholasticGrade"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CoScholasticGrade_examId_studentId_activity_key" ON "CoScholasticGrade"("examId", "studentId", "activity");

-- CreateIndex
CREATE INDEX "QuestionBankItem_tenantId_idx" ON "QuestionBankItem"("tenantId");

-- CreateIndex
CREATE INDEX "OnlineExam_tenantId_idx" ON "OnlineExam"("tenantId");

-- CreateIndex
CREATE INDEX "OnlineExamQuestion_tenantId_idx" ON "OnlineExamQuestion"("tenantId");

-- CreateIndex
CREATE INDEX "OnlineExamSubmission_tenantId_idx" ON "OnlineExamSubmission"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "OnlineExamSubmission_onlineExamId_studentId_key" ON "OnlineExamSubmission"("onlineExamId", "studentId");

-- AddForeignKey
ALTER TABLE "ExamTimetable" ADD CONSTRAINT "ExamTimetable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTimetable" ADD CONSTRAINT "ExamTimetable_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTimetable" ADD CONSTRAINT "ExamTimetable_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoScholasticGrade" ADD CONSTRAINT "CoScholasticGrade_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoScholasticGrade" ADD CONSTRAINT "CoScholasticGrade_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoScholasticGrade" ADD CONSTRAINT "CoScholasticGrade_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoScholasticGrade" ADD CONSTRAINT "CoScholasticGrade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionBankItem" ADD CONSTRAINT "QuestionBankItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionBankItem" ADD CONSTRAINT "QuestionBankItem_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionBankItem" ADD CONSTRAINT "QuestionBankItem_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionBankItem" ADD CONSTRAINT "QuestionBankItem_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineExam" ADD CONSTRAINT "OnlineExam_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineExam" ADD CONSTRAINT "OnlineExam_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineExam" ADD CONSTRAINT "OnlineExam_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineExam" ADD CONSTRAINT "OnlineExam_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineExamQuestion" ADD CONSTRAINT "OnlineExamQuestion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineExamQuestion" ADD CONSTRAINT "OnlineExamQuestion_onlineExamId_fkey" FOREIGN KEY ("onlineExamId") REFERENCES "OnlineExam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineExamSubmission" ADD CONSTRAINT "OnlineExamSubmission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineExamSubmission" ADD CONSTRAINT "OnlineExamSubmission_onlineExamId_fkey" FOREIGN KEY ("onlineExamId") REFERENCES "OnlineExam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnlineExamSubmission" ADD CONSTRAINT "OnlineExamSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


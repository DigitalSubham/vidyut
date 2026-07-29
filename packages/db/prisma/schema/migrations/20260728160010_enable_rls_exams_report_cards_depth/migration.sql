-- Unit 46 — RLS for ExamTimetable/CoScholasticGrade/QuestionBankItem/
-- OnlineExam/OnlineExamQuestion/OnlineExamSubmission, written in the same
-- batch as the tables themselves (per Units 39/40/42/43/45's own lesson).
ALTER TABLE "ExamTimetable" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExamTimetable" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ExamTimetable"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "CoScholasticGrade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CoScholasticGrade" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CoScholasticGrade"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "QuestionBankItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuestionBankItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "QuestionBankItem"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "OnlineExam" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OnlineExam" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "OnlineExam"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "OnlineExamQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OnlineExamQuestion" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "OnlineExamQuestion"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "OnlineExamSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OnlineExamSubmission" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "OnlineExamSubmission"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

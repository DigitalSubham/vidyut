-- Row-Level Security for Unit 17's Exam + ExamSubject tables (same
-- rationale as 20260725202700_enable_rls — see that migration's header).

ALTER TABLE "Exam" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Exam" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Exam"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "ExamSubject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExamSubject" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "ExamSubject"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- Unit 45 — RLS for HomeworkSubmission, written in the same batch as the
-- table itself (per Units 39/40/42/43's own lesson).
ALTER TABLE "HomeworkSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HomeworkSubmission" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "HomeworkSubmission"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- Row-Level Security for Unit 07's Student/Enrollment tables (same rationale
-- as 20260725202700_enable_rls — see that migration's header comment).

ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Student" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Student"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Enrollment" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Enrollment"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

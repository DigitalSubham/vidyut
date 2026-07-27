-- Row-Level Security for Unit 23's Homework table (same rationale as
-- 20260725202700_enable_rls — see that migration's header).

ALTER TABLE "Homework" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Homework" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Homework"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

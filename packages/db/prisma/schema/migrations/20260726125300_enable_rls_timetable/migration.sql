-- Row-Level Security for Unit 22's TimetablePeriod table (same rationale as
-- 20260725202700_enable_rls — see that migration's header).

ALTER TABLE "TimetablePeriod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimetablePeriod" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "TimetablePeriod"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

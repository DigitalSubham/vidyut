-- Row-Level Security for Unit 21's Certificate table (same rationale as
-- 20260725202700_enable_rls — see that migration's header).

ALTER TABLE "Certificate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Certificate" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Certificate"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- Row-Level Security for Unit 13's RefundRequest table (same rationale as
-- 20260725202700_enable_rls — see that migration's header comment).

ALTER TABLE "RefundRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RefundRequest" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "RefundRequest"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

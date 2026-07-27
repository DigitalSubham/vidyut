-- Row-Level Security for Unit 18's MarksEntry table (same rationale as
-- 20260725202700_enable_rls — see that migration's header).

ALTER TABLE "MarksEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MarksEntry" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "MarksEntry"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

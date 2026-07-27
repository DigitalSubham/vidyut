-- Row-Level Security for Unit 20's Announcement table (same rationale as
-- 20260725202700_enable_rls — see that migration's header).

ALTER TABLE "Announcement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Announcement" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Announcement"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

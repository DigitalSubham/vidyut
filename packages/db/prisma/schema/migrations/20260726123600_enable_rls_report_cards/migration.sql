-- Row-Level Security for Unit 19's ReportCardTemplate + ReportCard tables
-- (same rationale as 20260725202700_enable_rls — see that migration's header).

ALTER TABLE "ReportCardTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReportCardTemplate" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "ReportCardTemplate"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "ReportCard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReportCard" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "ReportCard"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

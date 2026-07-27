-- Row-Level Security for Unit 10's Enquiry/Application tables (same
-- rationale as 20260725202700_enable_rls — see that migration's header
-- comment).

ALTER TABLE "Enquiry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Enquiry" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Enquiry"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Application" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Application" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Application"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

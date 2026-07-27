-- Row-Level Security for Unit 09's Staff/LeaveRequest tables (same rationale
-- as 20260725202700_enable_rls — see that migration's header comment).

ALTER TABLE "Staff" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Staff" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Staff"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "LeaveRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeaveRequest" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "LeaveRequest"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

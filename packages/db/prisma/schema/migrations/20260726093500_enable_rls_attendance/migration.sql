-- Row-Level Security for Unit 15's AttendanceRecord table (same rationale as
-- 20260725202700_enable_rls — see that migration's header comment).

ALTER TABLE "AttendanceRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceRecord" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "AttendanceRecord"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

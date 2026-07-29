-- Unit 42 — StaffAttendanceRecord RLS, written in the same batch as the
-- table itself (per Units 39/40's own lesson: every new tenant-owned model
-- needs its own RLS migration, not automatic from tenantId alone).
ALTER TABLE "StaffAttendanceRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StaffAttendanceRecord" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "StaffAttendanceRecord"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

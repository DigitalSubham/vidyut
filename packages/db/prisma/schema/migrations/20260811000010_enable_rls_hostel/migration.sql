-- Unit 59 — RLS for HostelBlock/Room/RoomAllocation/HostelAttendanceRecord.
ALTER TABLE "HostelBlock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HostelBlock" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "HostelBlock"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Room" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Room" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Room"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "RoomAllocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RoomAllocation" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "RoomAllocation"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "HostelAttendanceRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HostelAttendanceRecord" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "HostelAttendanceRecord"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

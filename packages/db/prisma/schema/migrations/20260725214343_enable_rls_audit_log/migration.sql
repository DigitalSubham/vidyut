-- AuditLog is tenant-owned (context/data-model.md §12, within the RLS
-- range §2-12), unlike the other Unit 05 tables — same ENABLE+FORCE+policy
-- pattern as every other tenant-owned table.

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AuditLog"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

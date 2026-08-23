-- Unit 54 — RLS for PublicNotice, written in the same batch as the table
-- itself (per Units 39/40/42/43/47/48/49's own lesson).
ALTER TABLE "PublicNotice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PublicNotice" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PublicNotice"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

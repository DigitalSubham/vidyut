-- Unit 43 — RLS for ElectiveGroup/StudentElectiveChoice/House, written in the
-- same batch as the tables themselves (per Units 39/40/42's own lesson).
ALTER TABLE "ElectiveGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ElectiveGroup" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ElectiveGroup"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "StudentElectiveChoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentElectiveChoice" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "StudentElectiveChoice"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "House" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "House" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "House"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

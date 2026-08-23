-- Unit 57 — RLS for Route/RouteStop/Vehicle/Driver/StudentRouteAllocation/LocationPing.
ALTER TABLE "Route" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Route" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Route"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "RouteStop" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RouteStop" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "RouteStop"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Vehicle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vehicle" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Vehicle"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Driver" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Driver" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Driver"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "StudentRouteAllocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentRouteAllocation" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "StudentRouteAllocation"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "LocationPing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LocationPing" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "LocationPing"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

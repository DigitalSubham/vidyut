-- Unit 61 — RLS for HealthRecord/DisciplineIncident/Award/CanteenWallet/CanteenTxn/LostFoundEntry.
ALTER TABLE "HealthRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HealthRecord" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "HealthRecord"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "DisciplineIncident" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DisciplineIncident" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "DisciplineIncident"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Award" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Award" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Award"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "CanteenWallet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CanteenWallet" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CanteenWallet"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "CanteenTxn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CanteenTxn" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CanteenTxn"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "LostFoundEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LostFoundEntry" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "LostFoundEntry"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

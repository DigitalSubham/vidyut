-- Unit 60 — RLS for Visitor/GatePass/ComplaintDeskEntry/CallLogEntry/PostalLogEntry.
ALTER TABLE "Visitor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Visitor" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Visitor"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "GatePass" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GatePass" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "GatePass"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "ComplaintDeskEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComplaintDeskEntry" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ComplaintDeskEntry"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "CallLogEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CallLogEntry" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CallLogEntry"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "PostalLogEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PostalLogEntry" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PostalLogEntry"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

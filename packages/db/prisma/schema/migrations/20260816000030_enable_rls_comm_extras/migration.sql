ALTER TABLE "CommunicationPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommunicationPreference" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CommunicationPreference"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Newsletter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Newsletter" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Newsletter"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

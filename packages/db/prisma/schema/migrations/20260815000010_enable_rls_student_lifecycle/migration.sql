-- Unit 66 — RLS for SiblingGroup/StudentTimelineEntry.
ALTER TABLE "SiblingGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SiblingGroup" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "SiblingGroup"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "StudentTimelineEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentTimelineEntry" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "StudentTimelineEntry"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

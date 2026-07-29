-- Unit 40 — NotificationTemplate RLS, written in the same batch as the
-- table itself this time (Unit 39's own progress-tracker entry flagged this
-- as an easy step to forget).
ALTER TABLE "NotificationTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationTemplate" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "NotificationTemplate"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

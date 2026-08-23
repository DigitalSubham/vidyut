ALTER TABLE "SyllabusChapter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SyllabusChapter" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "SyllabusChapter"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "LessonPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LessonPlan" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "LessonPlan"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "ContentItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContentItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ContentItem"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "LiveClassLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LiveClassLink" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "LiveClassLink"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

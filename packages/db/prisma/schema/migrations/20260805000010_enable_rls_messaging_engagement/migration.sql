-- Unit 49 — RLS for Circular/CircularAck/PTMSlot/CalendarEvent/Complaint/
-- Survey/SurveyQuestion/SurveyResponse/GalleryAlbum/GalleryPhoto/Message,
-- written in the same batch as the tables themselves (per Units 39/40/42/43/
-- 47/48's own lesson).
ALTER TABLE "Circular" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Circular" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Circular"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "CircularAck" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CircularAck" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CircularAck"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "PTMSlot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PTMSlot" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PTMSlot"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "CalendarEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CalendarEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CalendarEvent"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Complaint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Complaint" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Complaint"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Survey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Survey" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Survey"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "SurveyQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SurveyQuestion" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "SurveyQuestion"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "SurveyResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SurveyResponse" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "SurveyResponse"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "GalleryAlbum" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GalleryAlbum" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "GalleryAlbum"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "GalleryPhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GalleryPhoto" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "GalleryPhoto"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Message"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

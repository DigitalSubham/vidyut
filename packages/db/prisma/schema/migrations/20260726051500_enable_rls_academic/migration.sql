-- Row-Level Security for Unit 06's academic-structure tables (same rationale
-- as 20260725202700_enable_rls — see that migration's header comment).

ALTER TABLE "Class" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Class" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Class"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Section" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Section" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Section"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Subject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subject" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Subject"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "ClassSubject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassSubject" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "ClassSubject"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "TeacherAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeacherAssignment" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "TeacherAssignment"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

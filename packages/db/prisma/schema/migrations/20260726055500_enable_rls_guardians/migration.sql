-- Row-Level Security for Unit 08's Guardian/StudentGuardian tables (same
-- rationale as 20260725202700_enable_rls — see that migration's header
-- comment).

ALTER TABLE "Guardian" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Guardian" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Guardian"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "StudentGuardian" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentGuardian" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "StudentGuardian"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

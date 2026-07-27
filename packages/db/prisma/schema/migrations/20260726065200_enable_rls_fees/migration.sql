-- Row-Level Security for Unit 11's fee-setup tables (same rationale as
-- 20260725202700_enable_rls — see that migration's header comment).

ALTER TABLE "FeeHead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeeHead" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "FeeHead"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "FeeStructure" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeeStructure" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "FeeStructure"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "FeeStructureItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeeStructureItem" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "FeeStructureItem"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "FineRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FineRule" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "FineRule"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "FeeAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeeAssignment" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "FeeAssignment"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Concession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Concession" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Concession"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

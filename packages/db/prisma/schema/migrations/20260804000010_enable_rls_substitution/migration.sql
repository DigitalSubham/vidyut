-- Unit 47 — RLS for Substitution, written in the same batch as the table
-- itself (per Units 39/40/42/43's own lesson).
ALTER TABLE "Substitution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Substitution" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Substitution"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

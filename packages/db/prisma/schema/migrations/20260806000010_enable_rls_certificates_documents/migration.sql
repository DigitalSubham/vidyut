-- Unit 50 — RLS for CertificateTemplate and Document, written in the same
-- batch as the tables themselves (per Units 39/40/42/43/47's own lesson).
ALTER TABLE "CertificateTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CertificateTemplate" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CertificateTemplate"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Document"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

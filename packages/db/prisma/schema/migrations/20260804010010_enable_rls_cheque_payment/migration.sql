-- Unit 48 — RLS for ChequePayment, written in the same batch as the table
-- itself (per Units 39/40/42/43/47's own lesson).
ALTER TABLE "ChequePayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChequePayment" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ChequePayment"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

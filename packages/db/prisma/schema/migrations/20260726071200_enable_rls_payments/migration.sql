-- Row-Level Security for Unit 12's fee-collection tables (same rationale as
-- 20260725202700_enable_rls — see that migration's header comment).

ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Invoice"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "InvoiceItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceItem" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "InvoiceItem"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Payment"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Receipt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Receipt" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Receipt"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

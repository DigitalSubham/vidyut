-- Unit 62 — RLS for ExpenseHead/Expense.
ALTER TABLE "ExpenseHead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExpenseHead" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ExpenseHead"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Expense"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- Unit 64 — RLS for Store/InventoryItem/StockMovement/PurchaseOrder/Grn/GrnLine/Asset/StoreItem/StoreOrder.
ALTER TABLE "Store" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Store" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Store"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "InventoryItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "InventoryItem"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "StockMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockMovement" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "StockMovement"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "PurchaseOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrder" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PurchaseOrder"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Grn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Grn" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Grn"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "GrnLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GrnLine" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "GrnLine"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Asset" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Asset"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "StoreItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StoreItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "StoreItem"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "StoreOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StoreOrder" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "StoreOrder"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

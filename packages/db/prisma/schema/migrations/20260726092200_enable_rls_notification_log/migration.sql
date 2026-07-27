-- Row-Level Security for Unit 14's NotificationLog table (same rationale as
-- 20260725202700_enable_rls — see that migration's header comment).
-- WalletTxn deliberately has NO RLS — same as SmsWallet (Unit 05's decision:
-- platform-managed config, plain tenantId-filtered queries).

ALTER TABLE "NotificationLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationLog" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "NotificationLog"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

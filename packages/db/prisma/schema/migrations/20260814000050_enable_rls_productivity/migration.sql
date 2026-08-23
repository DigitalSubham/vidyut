-- Unit 65 — RLS for StaffTask. Survey already has RLS from Unit 49 — the
-- isPoll column addition doesn't need a new policy.
ALTER TABLE "StaffTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StaffTask" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "StaffTask"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

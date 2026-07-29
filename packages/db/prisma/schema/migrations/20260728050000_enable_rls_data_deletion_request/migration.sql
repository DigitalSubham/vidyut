-- Unit 39 — DataDeletionRequest was created without an RLS policy in the
-- same migration (a real gap caught by this unit's own tenant-isolation
-- test: an OWNER in tenant A could see every tenant's deletion requests
-- with `withTenant()` alone, since Postgres RLS wasn't enabled on the
-- table at all). Same pattern as every other tenant-owned table.

ALTER TABLE "DataDeletionRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DataDeletionRequest" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "DataDeletionRequest"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

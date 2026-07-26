-- Row-Level Security for tenant-owned tables (context/data-model.md §14,
-- context/architecture-context.md §3). Prisma does not manage RLS, so this is
-- hand-written. `Tenant` itself is platform-level and is NOT RLS-scoped.
--
-- FORCE ROW LEVEL SECURITY is required in addition to ENABLE: by default
-- Postgres exempts the table owner (the role Prisma connects as, since it
-- created these tables) from RLS. Without FORCE, the isolation test would
-- pass locally for non-owner roles but silently fail to protect the app's
-- own DB user in production.
--
-- current_setting('app.tenant_id', true) uses missing_ok=true so a query that
-- never went through withTenant() gets NULL, and `"tenantId" = NULL` is
-- neither true nor false in SQL — it filters out every row. That is the
-- default-deny behavior the "deliberately unscoped query" test asserts.

ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Branch" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Branch"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "AcademicSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AcademicSession" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "AcademicSession"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

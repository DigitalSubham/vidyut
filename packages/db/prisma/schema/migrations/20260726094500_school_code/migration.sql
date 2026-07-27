-- Unit 15b: Tenant.schoolCode — nullable so existing rows backfill safely
-- (NULLs never violate a unique constraint in Postgres); every new tenant
-- gets one at creation (Unit 05's createTenant, updated).

ALTER TABLE "Tenant" ADD COLUMN "schoolCode" TEXT;
CREATE UNIQUE INDEX "Tenant_schoolCode_key" ON "Tenant"("schoolCode");

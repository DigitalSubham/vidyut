# Unit 02 — Database & Tenancy Foundation

Read `AGENTS.md`, `data-model.md`, `architecture-context.md` (§3 tenancy), `code-standards.md` first.

## Goal
Stand up PostgreSQL + Prisma with the tenancy foundation — `Tenant`, `Branch`, `AcademicSession` — and the **RLS + `withTenant()`** mechanism that all later data access depends on. This is the safety layer for the whole product.

## Scope
1. **Prisma setup** in `apps/api` (or `packages/db`): Prisma schema (multi-file), client, migration tooling, connection to Postgres (RDS in prod; local via docker-compose Postgres).
2. **Models** (per `data-model.md` §2): `Tenant`, `Branch`, `AcademicSession` + enums `TenantStatus`, `AppDelivery`, `Board`. Include base conventions: `id` (cuid), `tenantId`/`branchId` where applicable, `createdAt/updatedAt`, `deletedAt`.
3. **Row-Level Security:** enable RLS on tenant-owned tables; policy `USING (tenantId = current_setting('app.tenant_id'))`. Add via a migration (raw SQL) since Prisma doesn't manage RLS.
4. **`withTenant(tenantId, fn)` helper** (`apps/api/src/db`): opens a transaction, runs `SET LOCAL app.tenant_id = $tenant`, executes Prisma calls inside it, returns result. **All tenant DB access must go through this.**
5. **Connection pooling:** Prisma pool; document PgBouncer for scale (not required locally).
6. **Seed:** a demo tenant + one branch + current session (for dev/tests/sales demo).
7. **Migration baseline** applied; client generated.

## Out of scope
Users/auth/RBAC (Unit 03), any domain module, super-admin UI.

## Definition of done / checks
- Migrations apply cleanly; Prisma client generates; `pnpm build` + typecheck pass.
- `withTenant()` works: a query inside it only sees the set tenant's rows.
- **Tenant-isolation test:** create 2 tenants + rows; assert a query under tenant A returns zero of tenant B's rows (both via RLS and via a deliberately unscoped query — RLS must still block it).
- Demo tenant/branch/session seeded.
- `progress-tracker.md` updated (02 → Completed, set 03 current).

## Next unit
**03 — Auth & RBAC.**

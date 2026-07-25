# Unit 03 — Auth & RBAC

Read `AGENTS.md`, `api-conventions.md` (Auth), `rbac.md`, `data-model.md` (§3) first.

## Goal
Identity + access control: JWT auth (parent OTP, staff password+2FA), roles & permissions, and the guards that every later endpoint uses.

## Scope
1. **Models** (per `data-model.md` §3): `User`, `Role`, `RolePermission`, `UserRole` (branch-scoped), `BranchMembership`. Enums `RoleKey`, `UserStatus`. Static **permission catalog** in `packages/types`.
2. **Password hashing:** argon2. **JWT:** access (~15 min) + refresh (~30 days, **rotating**, stored hashed, revocable). Claims per `api-conventions.md`.
3. **Auth endpoints:**
   - Parent OTP: `POST /auth/otp/request`, `POST /auth/otp/verify` (OTP throttled via Redis; SMS send stubbed behind the notification/`jobs` interface until the SMS provider is chosen).
   - Staff: `POST /auth/login`, `POST /auth/2fa/verify`, `POST /auth/refresh`, `POST /auth/logout`.
4. **Middleware/guards:** `authGuard` (verify JWT) → tenant-context (`withTenant`) → **branch-scope** (from `branchIds`) → **RBAC guard** (`requirePermission('...')`). Wire the full pipeline from `api-conventions.md`.
5. **Role seeding:** seed default roles + `RolePermission` from the `rbac.md` matrix for the demo tenant; owner can edit later.
6. **Self-scope** helper for PARENT/STUDENT (only their own/children's records).

## Out of scope
Full API skeleton/OpenAPI (Unit 04 — but the middleware built here plugs into it), any domain module, actual SMS delivery (stub the send).

## Definition of done / checks
- Parent can request+verify OTP (dev: OTP returned/logged, not sent) → gets tokens.
- Staff login (+2FA path) → tokens; refresh rotates and revokes old; logout revokes.
- `requirePermission` returns `403 FORBIDDEN` for missing permission; allowed role passes.
- **Branch scoping test:** a PRINCIPAL on Branch A is denied Branch B data.
- Tokens carry correct `tenantId/roles/branchIds`; all DB access via `withTenant`.
- Tests: auth flows + permission matrix (allowed vs denied) + cross-branch denied.
- `progress-tracker.md` updated (03 → done, 04 current).

## Next unit
**04 — API Skeleton + Jobs Infra.**

# Unit 05 — Super-Admin: Tenants & Plans

Read `AGENTS.md`, `plans-entitlements.md`, `data-model.md` (§13), `api-conventions.md` first.

## Goal
The platform (super-admin) capability to **onboard and run tenants**: create/suspend a school (tenant + first branch), assign a plan, seed module toggles + limits, set `app_type`, and basic usage metering. This is what lets us provision every customer.

## Scope
1. **Platform models** (per `data-model.md` §13): `Plan`, `Subscription`, `ModuleToggle`, `SmsWallet` (balance only for now), `AppBuild` (record only), + enum `PlanKey`. Seed the **four plans** from `plans-entitlements.md` (one canonical price each).
2. **Super-admin auth context** — separate from tenant JWT (platform role `SUPERADMIN`); **never** uses `withTenant` (operates across tenants with explicit, audited access).
3. **Endpoints (platform):**
   - `POST /platform/tenants` — create tenant + first branch + current session + owner user; assign plan; **seed `ModuleToggle` from the plan's modules**; set `appType`.
   - `PATCH /platform/tenants/:id` — suspend/activate/cancel; change plan (re-seed toggles); override a module toggle.
   - `GET /platform/tenants` (list, filters) + `GET /platform/tenants/:id`.
   - `GET /platform/tenants/:id/usage` — student/user/branch/storage counts vs plan limits.
4. **Entitlement enforcement hooks** (used by all modules): `isModuleEnabled(tenantId, moduleKey)` and `assertWithinLimit(...)` → `403 MODULE_DISABLED` / `403 LIMIT_EXCEEDED` per `api-conventions.md`.
5. **Onboarding branch on `app_type`:** `shared` → tenant is immediately usable; `dedicated` → create an `AppBuild` record + enqueue an (stubbed) app-build job (real EAS pipeline is Unit 31).
6. **Impersonation** (audited, time-boxed) — optional stub with `AuditLog` entry.
7. Minimal **super-admin web** screens in `apps/web-app` (super-admin route group): tenant list, create-tenant form, tenant detail (plan, toggles, usage). Uses the design system (Unit 01) + Vidyut tokens.

## Out of scope
Full billing/invoicing + wallet top-ups (Unit 30), real EAS build pipeline (Unit 31), academic/domain modules.

## Definition of done / checks
- Super-admin can create a tenant → owner can log in and sees an empty, correctly-provisioned school (right plan, enabled modules, limits, app_type).
- Suspending a tenant blocks tenant API with `403 TENANT_SUSPENDED`.
- `isModuleEnabled`/`assertWithinLimit` enforce correctly (disabled module hidden + 403; over-limit blocked + upsell hint).
- Plan change re-seeds toggles; module override persists.
- Usage endpoint returns accurate counts vs limits.
- Tests: provisioning, suspension, entitlement + limit enforcement, plan change.
- `progress-tracker.md` updated (05 → done; Milestone 0 complete → Unit 06 current).

## Next unit
**06 — Academic Structure** (Milestone 1 begins).

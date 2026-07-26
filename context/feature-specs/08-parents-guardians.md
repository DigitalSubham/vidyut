# Unit 08 — Parents/Guardians

Read `AGENTS.md`, `data-model.md` (§5), `rbac.md` (rule 5, self-scope), `api-conventions.md`, `code-standards.md`, and `apps/api/src/core/guards/require-self.ts` (Unit 03) first.

## Goal

Guardian records, multi-child linking, and parent-account invites — and the piece Unit 03 left stubbed: resolving which students a PARENT's own requests may touch.

## Scope

1. **Models** (`data-model.md` §5): `Guardian`, `StudentGuardian` + enum `GuardianRelation`. Tenant-scoped; RLS per the established pattern. Note: `Guardian` carries no `branchId` (a guardian's children can span branches within one tenant group) — branch-scoping happens transitively through the linked `Student`, not on `Guardian` directly.
2. `POST/GET/PATCH /api/v1/guardians` (name, relation, phone, email, occupation) — gated by `guardian.manage`.
3. `POST /api/v1/students/:id/guardians` (link an existing or newly-created guardian to a student via `StudentGuardian`: `isPrimary`, `canPay`) and `DELETE /api/v1/students/:id/guardians/:guardianId` — gated by `guardian.manage`.
4. `POST /api/v1/guardians/:id/invite` — creates a `User` (role PARENT, phone from the guardian record) if one doesn't already exist, links `Guardian.userId`, and enqueues the existing OTP-invite send (reusing Unit 03's `sendOtpSms` seam) as a background job.
5. **Self-scope resolver:** `resolveGuardianStudentIds(tenantId, userId)` (`apps/api/src/core/guards/require-self.ts` or a new sibling module) — given an authenticated PARENT's `userId`, returns the set of `studentId`s they're linked to via `Guardian.userId → StudentGuardian`. This is what later units' parent-facing endpoints (attendance, fees, report cards) will call to enforce self-scope, instead of the direct self-userId-only check Unit 03 shipped.
6. `GET /api/v1/guardians/me/children` — the first real consumer of the resolver above: an authenticated PARENT lists their own linked students (id, name, class/section). Proves the resolver works end to end.
7. **i18n:** all validation/error/invite-message strings via i18n keys.

## Out of scope

Guardian-level granular access control (what each guardian can individually see/pay — feature-catalog P2), parent communication preferences, and the actual attendance/fees/report-card endpoints that will later *consume* the self-scope resolver.

## Definition of done / checks

- Guardian CRUD + multi-child linking works end to end, tenant-isolated.
- Invite creates a working PARENT login (OTP request/verify against the invited phone succeeds, per Unit 03's existing flow).
- `GET /guardians/me/children` returns exactly a parent's own linked children, and nothing for an unlinked parent or another tenant's students.
- Tenant-isolation test: cross-tenant guardian/link queries return zero rows both via RLS and via a deliberately unscoped query.
- RBAC test: `guardian.manage` roles (OWNER/PRINCIPAL/ADMIN) pass; TEACHER/ACCOUNTANT get `403 FORBIDDEN` on mutations.
- Self-scope test: a PARENT cannot list another parent's children via `/guardians/me/children` or any guardian-id spoof.
- Lint + typecheck + tests pass; `progress-tracker.md` updated (08 → done, 09 current).

## Next unit

**09 — Staff/HR + Leave.**

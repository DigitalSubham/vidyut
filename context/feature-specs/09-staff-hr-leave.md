# Unit 09 — Staff/HR + Leave

Read `AGENTS.md`, `data-model.md` (§7), `rbac.md`, `api-conventions.md`, `code-standards.md`, and Unit 06's spec (class-teacher/teacher-assignment deferral) first.

## Decisions (confirmed with the user before implementation)

- **LeaveRequest.type:** `data-model.md` lists it as a plain field with no defined enum (unlike `StaffType`/`LeaveStatus`, which are explicit). Confirmed: a fixed enum `LeaveType{CASUAL, SICK, EARNED, OTHER}` — the common Indian-school HR baseline. A configurable/tenant-specific leave-type catalog is deferred to a later HR/settings unit if a school needs more types.
- **`PATCH /academic/sections/:id` (classTeacherId):** this unit's own scope line writes it as a flat route, but Unit 06 already built `Section` under the nested `/academic/classes/:classId/sections/:id` route. Rather than add a redundant flat route, `classTeacherId` is added to the existing nested `PATCH` endpoint's schema — same resource, no new route shape.

## Goal

Staff records with linked logins, and leave apply/approve — and close the loop Unit 06 deferred: class-teacher assignment and teacher-subject-section mapping, now that Staff exists to assign.

## Scope

1. **Models** (`data-model.md` §7): `Staff`, `LeaveRequest` + enums `StaffType`, `LeaveStatus`. Branch-scoped; RLS per the established pattern.
2. `POST /api/v1/staff` — creates a `User` (email+password, per Unit 03's staff-login shape) + `Staff` record + `UserRole` (role assigned at creation: PRINCIPAL/ADMIN/ACCOUNTANT/TEACHER) + `BranchMembership`, atomically — the same "create identity + domain record together" pattern as Unit 05's tenant-owner creation. Gated by `staff.manage` (OWNER/PRINCIPAL **only**, per `rbac.md` — narrower than most mutations in this codebase, ADMIN is denied).
3. `GET/PATCH /api/v1/staff`, `GET /api/v1/staff/:id` (profile, designation, type, qualifications, docs). Mutations gated by `staff.manage`; reads are broad (any authenticated staff role, matching the feature catalog's "staff directory" note) rather than inventing a new `staff.view` permission string.
4. **Teacher-subject-section mapping** (deferred from Unit 06): `POST/GET/DELETE /api/v1/academic/teacher-assignments` (staffId, subjectId, sectionId, sessionId) and `PATCH /api/v1/academic/sections/:id` (`classTeacherId`) — gated by `class.manage` (reusing the existing permission rather than introducing a new one; `rbac.md` has no dedicated "teacherassignment.manage" string).
5. **Leave:** `POST /api/v1/leave-requests` (type, fromDate, toDate, halfDay) — gated by `leave.apply` (OWNER/PRINCIPAL/ADMIN/ACCOUNTANT/TEACHER), with an ownership check: the `staffId` on the request must resolve to the authenticated user's own `Staff` row (no applying on a colleague's behalf).
6. `PATCH /api/v1/leave-requests/:id` (approve/reject) — gated by `leave.approve` (OWNER/PRINCIPAL/ADMIN) + branch-scope (approver must share a branch with the requester).
7. `GET /api/v1/leave-requests` (filters: staffId, branchId, status).
8. **i18n:** all validation/error strings via i18n keys.

## Out of scope

Staff attendance (feature-catalog P1, separate from student attendance in Units 15/16), staff ID cards (Unit 21), payroll (on-demand, out of core), recruitment/appraisal (P3).

## Definition of done / checks

- Staff CRUD (incl. linked login creation) + leave apply/approve works end to end, tenant + branch isolated.
- Class-teacher assignment and teacher-subject-section mapping are now functional (Unit 06's schema-only placeholder activated).
- A staff member's own leave application succeeds; applying with someone else's `staffId` is rejected.
- Tenant-isolation test: cross-tenant staff/leave queries return zero rows both via RLS and via a deliberately unscoped query.
- RBAC test: `staff.manage` restricted to OWNER/PRINCIPAL (ADMIN denied, matching `rbac.md`); `leave.approve` denied to TEACHER.
- Branch-scope test: a PRINCIPAL on Branch A cannot approve a Branch B staff member's leave.
- Lint + typecheck + tests pass; `progress-tracker.md` updated (09 → done, 10 current).

## Next unit

**10 — Admissions/Enquiry.**

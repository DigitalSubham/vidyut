# Unit 15 — Attendance (API + Web)

Read `AGENTS.md`, `data-model.md` (§8), `rbac.md`, `api-conventions.md`, `code-standards.md` first.

## Open Questions

- This unit's own title — "Attendance (**API + Web**)" — is the first title in the build plan to explicitly name a web surface, unlike every backend-only unit since 06. **Recommendation:** stay backend + tests only, same as Units 06–13 (no `apps/web-app` screens have been built for any domain module yet — a UI pass across all of them is better done together later, not module-by-module). Flagging because the title itself signals otherwise, unlike prior units' titles.
- `data-model.md` notes attendance sync uses "client-generated `id`" for idempotency (mobile offline marking, Unit 16). This unit's `POST /attendance` must therefore accept an optional client-supplied `id` per record now, even though Unit 16 (mobile) is the actual producer of client-generated IDs — otherwise Unit 16 would need to retrofit this unit's endpoint. Building it now, not as a later retrofit.

## Goal

Daily attendance marking (by section, bulk), corrections, and register/defaulter reporting — the API Unit 16's offline mobile app will sync against.

## Scope

1. **Models** (`data-model.md` §8): `AttendanceRecord` + enums `AttendanceStatus`, `AttendanceSource`. Branch-scoped; RLS per the established pattern. `@@unique([studentId, date])` per the spec; `id` accepts a client-supplied value (for Unit 16's offline sync) or defaults to server-generated.
2. `POST /api/v1/attendance` (bulk: `sectionId`, `date`, `records: [{ id?, studentId, status }]`, `source` defaulting to `WEB`) — **upserts** by `(studentId, date)`: marking the same day twice (e.g. a teacher fixing their own same-day mistake) overwrites, no error. Gated by `attendance.mark` (`rbac.md`: PRINCIPAL/ADMIN/TEACHER — **not** OWNER), and a `TEACHER` caller must additionally be assigned to that section (`TeacherAssignment`, Unit 09); PRINCIPAL/ADMIN aren't section-restricted.
3. `GET /api/v1/attendance` (filters: sectionId, date, studentId) — gated by `attendance.view` (`rbac.md`: OWNER/PRINCIPAL/ADMIN/TEACHER — not ACCOUNTANT).
4. `PATCH /api/v1/attendance/:id` (`{ status, reason }`) — the audited correction path for a **past** (already-closed) day, distinct from the same-day upsert in scope #2. Gated by `attendance.regularize` (OWNER/PRINCIPAL/ADMIN only, per `rbac.md` — narrower than `attendance.mark`). Writes an `AuditLog` entry (a correction to an official record, same sensitivity class as a fee edit per `AGENTS.md`).
5. `GET /api/v1/attendance/reports/register` (`sectionId`, `month`, `year`) — a day-by-day grid for the section. `GET /api/v1/attendance/reports/defaulters` (`branchId`, `classId?`, `thresholdPercent`) — students below the attendance-percentage threshold for the current session. Both gated by `attendance.view`.
6. **i18n:** all validation/error strings via i18n keys.

## Out of scope

The web UI itself (see Open Questions), period-wise/per-subject attendance (feature-catalog P2), attendance analytics/trends (P1), staff attendance (separate feature-catalog line, not this unit), biometric integration, offline mobile marking + sync itself (Unit 16 — this unit only builds the API surface Unit 16's app calls).

## Definition of done / checks

- Bulk marking a section's attendance for a day works end to end; re-marking the same day upserts instead of erroring; a `TEACHER` not assigned to a section is denied.
- Regularizing a past day's record works only for `attendance.regularize` roles and writes an `AuditLog` entry.
- Register and defaulter reports return accurate data against a deliberately-constructed multi-day, multi-student scenario.
- Tenant-isolation test: cross-tenant attendance queries return zero rows both via RLS and via a deliberately unscoped query.
- RBAC test: `attendance.mark` (PRINCIPAL/ADMIN/TEACHER) vs `attendance.regularize` (PRINCIPAL/ADMIN/OWNER only) enforced distinctly.
- Branch-scope test: a TEACHER on Branch A denied Branch B's attendance.
- Lint + typecheck + tests pass; `progress-tracker.md` updated (15 → done, 15b current).

## Next unit

**15b — Mobile App Shell** (pulled forward from Unit 24 — teacher offline attendance needs an app to live in before Unit 16 can be built).

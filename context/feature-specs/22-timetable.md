# Unit 22 — Timetable

Read `AGENTS.md`, `data-model.md` (§11), `rbac.md`, `api-conventions.md`, `code-standards.md` first. Builds on Unit 06's `Section`/`Subject` and Unit 09's `Staff`/`TeacherAssignment`.

## Open Questions

1. **Conflict detection scope.** No document specifies what counts as an invalid timetable. **Recommendation:** two hard, cheap-to-check invariants only — (a) a `(sectionId, dayOfWeek, periodNo)` slot holds exactly one period (DB-level `@@unique`, upserted like Unit 15's attendance — re-assigning the same slot overwrites, no error), and (b) the same `staffId` cannot be double-booked in two different sections at the same `(dayOfWeek, periodNo)` in the same session (checked in the service, `409` on conflict). A full room-double-booking check or a constraint-solver is explicitly out of scope — `feature-catalog.md` marks "auto/smart timetable generation" `[P3]`, and a manual grid with just these two guards is what a school actually needs to run day one.
2. **Self-view scope (parent/student/teacher "app views").** `feature-catalog.md` lists "Timetable on app" as `[P1]`, but no self-scoped endpoint exists yet for any of these roles (same gap already flagged and deferred in Units 19/20's Open Questions). **Recommendation:** this unit ships `GET /timetable?sectionId=` and `GET /timetable?staffId=` as plain query-filtered reads open to any authenticated user in the branch — real self-scoping (a parent only ever querying their own child's section) is enforced by whichever unit builds the actual parent/teacher app screens (Unit 24/26), not invented here as a speculative guard.

## Goal

A period-grid timetable per section and per teacher — the structural data Unit 24/26's mobile app views will read.

## Scope

1. **Model** (`data-model.md` §11): `TimetablePeriod{ id, tenantId, branchId, sessionId, sectionId, dayOfWeek, periodNo, subjectId, staffId, room? }`, unique `(sectionId, dayOfWeek, periodNo)`. Branch-scoped, RLS per the established pattern.
2. `POST /api/v1/timetable` — bulk upsert by `(sectionId, dayOfWeek, periodNo)` (grid entry, same shape as Unit 15's attendance/Unit 18's marks bulk endpoints), gated `timetable.manage`. Cross-checks `subjectId`/`staffId` belong to the section's branch; enforces Open Question 1(b)'s staff double-booking guard across the whole batch.
3. `GET /api/v1/timetable?sectionId=` — a section's full week grid.
4. `GET /api/v1/timetable?staffId=` — one teacher's week grid across every section they teach.
5. `DELETE /api/v1/timetable/:id` — remove a single period slot, gated `timetable.manage`.
6. **RBAC:** `timetable.manage` (OWNER/PRINCIPAL/ADMIN per `rbac.md`) gates all mutations; reads are broad (any authenticated staff role, matching Unit 06/17's structural-data pattern).
7. **i18n:** all validation/error strings via i18n keys.

## Out of scope

Auto/smart timetable generation (`[P3]`, constraint-solver territory), room-conflict detection (Open Question 1 kept to the two cheapest, highest-value guards), self-scoped parent/student/teacher app views (Open Question 2 — later mobile units), recurring exceptions/holidays overriding a specific day's grid (Unit 15's `AttendanceStatus.HOLIDAY` already covers the attendance side of holidays; a timetable holiday override is a separate, smaller feature not asked for here).

## Definition of done / checks

- Bulk timetable upsert + section/staff grid reads work end to end, tenant + branch isolated.
- Re-assigning the same `(sectionId, dayOfWeek, periodNo)` slot overwrites cleanly (upsert, no error) — verified via row count.
- A staff double-booking across two sections at the same `(dayOfWeek, periodNo)` in the same session is rejected with a clear `409`.
- Tenant-isolation test: cross-tenant timetable queries return zero rows both via RLS and via a deliberately unscoped query.
- RBAC test: `timetable.manage` roles (OWNER/PRINCIPAL/ADMIN) pass on mutations; TEACHER/ACCOUNTANT denied; reads open to any authenticated staff role.
- Branch-scope test: an ADMIN on Branch A denied Branch B's timetable.
- Lint + typecheck + tests pass; `progress-tracker.md` updated (22 → done, 23 current — Unit 23/Homework is Milestone 6's other unit).

## Next unit

**23 — Homework/Assignments.**

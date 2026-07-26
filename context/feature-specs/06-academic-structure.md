# Unit 06 — Academic Structure

Read `AGENTS.md`, `data-model.md` (§4), `rbac.md`, `api-conventions.md`, `code-standards.md` first.

## Open Questions

- `Section.classTeacherId` and `TeacherAssignment.staffId` (`data-model.md` §4) both reference **Staff**, which doesn't exist until Unit 09 (Staff/HR). **Recommendation (proceeding on this basis unless you resequence):** create both columns/tables now as part of the academic-structure migration — `Class`/`Section`/`Subject`/`ClassSubject` are the coherent structural unit and shouldn't wait — but ship no mutation endpoints for them yet. Unit 09 adds `PATCH /academic/sections/:id` (class-teacher) and the `TeacherAssignment` write endpoints once Staff exists to assign. Sections/classes/subjects are otherwise fully functional in this unit.

## Goal

Classes, sections, subjects, and academic-session management — the structural graph every later domain module (students, exams, timetable) enrolls into.

## Scope

1. **Models** (`data-model.md` §4, extends Unit 02's `AcademicSession`): `Class`, `Section`, `Subject`, `ClassSubject`, `TeacherAssignment` + enum `SubjectType`. All branch-scoped; RLS enabled+forced per the established pattern (hand-written migration, same as Units 02/03/05).
2. **Academic session management** — no tenant-facing CRUD existed before this unit (Unit 02 only created a session internally during provisioning): `POST/GET/PATCH /api/v1/academic/sessions` (create, list, set current). Only one session per branch may have `isCurrent = true`; setting a new current session unsets the previous one in the same transaction.
3. **Classes:** `POST/GET/PATCH/DELETE /api/v1/academic/classes` (name, order) — soft delete (`deletedAt`).
4. **Sections:** `POST/GET/PATCH/DELETE /api/v1/academic/classes/:classId/sections` (name, capacity). `classTeacherId` accepted in the schema but left null/unset via the API until Unit 09 (see Open Questions).
5. **Subjects:** `POST/GET/PATCH/DELETE /api/v1/academic/subjects` (name, code, type) — a branch-level catalog, not per-class.
6. **Class–subject assignment:** `POST/GET/DELETE /api/v1/academic/classes/:classId/subjects` (`ClassSubject`: subjectId, isElective).
7. **Teacher-subject-section mapping:** create the `TeacherAssignment` table now (schema only, per data-model.md §4's grouping) — no endpoints; Unit 09 adds the write endpoints once Staff exists.
8. **RBAC:** `session.manage` / `class.manage` / `subject.manage` → OWNER/PRINCIPAL/ADMIN (`rbac.md`). Reads are broad (any authenticated staff role) since class/section/subject data is referenced everywhere. Branch-scoped via `requireBranch`.
9. **i18n:** all validation/error strings via i18n keys, no hardcoded English.

## Out of scope

Student enrollment (Unit 07), exam/timetable structures (Units 17/22), teacher-assignment mutations and class-teacher assignment (Unit 09), academic-year rollover logic (Unit 33 — this unit only lets an owner create a new session and flip `isCurrent`, no bulk promotion).

## Definition of done / checks

- Classes/sections/subjects/sessions CRUD works end to end, tenant + branch isolated.
- Only one `isCurrent` session per branch is enforced (setting a new one unsets the old, atomically).
- Tenant-isolation test: cross-tenant class/section/subject queries return zero rows both via RLS and via a deliberately unscoped query.
- RBAC test: OWNER/PRINCIPAL/ADMIN allowed to mutate; TEACHER/ACCOUNTANT get `403 FORBIDDEN` on mutations, `200` on reads.
- Branch-scope test: a PRINCIPAL on Branch A denied Branch B's classes.
- Lint + typecheck + tests pass; `progress-tracker.md` updated (06 → done, 07 current).

## Next unit

**07 — Students + Bulk Import.**

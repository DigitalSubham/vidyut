# Unit 18 — Marks Entry + Moderation

Read `AGENTS.md`, `data-model.md` (§9), `rbac.md`, `api-conventions.md`, `code-standards.md` first. Builds directly on Unit 17's `Exam`/`ExamSubject`.

## Open Questions

1. **Grade computation for `GradingScheme` other than `MARKS`.** `data-model.md` gives `MarksEntry.grade` as an optional field but no boundary/conversion table exists anywhere in the docs for `PERCENTAGE`/`GRADE`/`CCE`/`CGPA`. A real per-tenant configurable boundary table is a meaningful feature on its own (schools disagree on where "A1" starts). **Recommendation:** this unit computes `grade` only for the two schemes with an obvious, universally-agreed formula: `PERCENTAGE` (marks/maxMarks × 100, stored as a formatted string) and a **hardcoded CBSE-standard CCE 9-band table** (91–100=A1 … ≤32=E2) used for both `GRADE` and `CCE` schemes, since CBSE's own bands are the de facto standard every Bihar CBSE school already uses and Unit 17 already lets a school opt out by picking `MARKS`/`PERCENTAGE` instead. `CGPA` is deferred (no marks→CGPA formula is uncontroversial across boards) — `grade` stays `null` for `CGPA` exams until a real per-tenant table is asked for.
2. **Teacher section-scoping.** `marks.enter` is TEACHER/PRINCIPAL per `rbac.md` (not OWNER/ADMIN directly). **Recommendation:** reuse Unit 15's `assertCanMarkSection`-style check — a TEACHER may only enter marks for an `ExamSubject` whose `classId` has a `TeacherAssignment` linking them to that class's subject (via any section under it), mirroring the attendance precedent rather than inventing a new authorization shape.
3. **Bulk entry shape.** Like Unit 15's attendance, marks entry is naturally a grid (all students in a section × one subject). **Recommendation:** `POST /marks` accepts `{ examSubjectId, entries: [{ studentId, marks?, isAbsent }] }` and upserts by `(examSubjectId, studentId)` — same upsert-not-error precedent as attendance, since a teacher correcting one row before submission shouldn't require deleting and recreating the whole batch.

## Goal

Per-student, per-subject mark entry against Unit 17's exam structure, with a `>maxMarks` guard, absentee handling, and a moderation/lock step before Unit 19's report cards can safely read the data.

## Scope

1. **Model** (`data-model.md` §9): `MarksEntry{ id, tenantId, branchId, examSubjectId, studentId, marks?, grade?, isAbsent, enteredById, lockedAt? }`, unique `(examSubjectId, studentId)`. Branch-scoped, RLS per the established pattern. `marks` is nullable exactly when `isAbsent` is true (guarded at the validation layer — a present student must have a mark).
2. `POST /api/v1/marks` — bulk upsert by `(examSubjectId, studentId)`, gated `marks.enter`. Guards: `marks ≤ ExamSubject.maxMarks`; rejects entry against a `lockedAt`-set `MarksEntry` row or a parent `Exam` that's `isLocked` is irrelevant here (that's Unit 17's own structural lock, already enforced there) but rejects if the specific `MarksEntry` itself has `lockedAt` set (`409`). Computes `grade` per Open Question 1 when the exam's `gradingScheme` calls for it.
3. `GET /api/v1/marks?examSubjectId=` — the grid read-back for a subject; broad read access (any authenticated staff role, matching the structural-data pattern).
4. `PATCH /api/v1/marks/:id/lock` — sets `lockedAt = now()`, gated `marks.moderate` (OWNER/PRINCIPAL). The **moderation** step: once locked, further `POST /marks` upserts touching that row are rejected (`409`) — this is the "review/lock" the catalog names, a lighter one-row-at-a-time lock rather than Unit 17's whole-exam lock (a moderator can lock individual rows as they review, without freezing the entire exam's subject list).
5. **RBAC:** `marks.enter` (PRINCIPAL/TEACHER per `rbac.md` — not OWNER/ADMIN) gates `POST /marks`; TEACHER additionally section/class-scoped per Open Question 2. `marks.moderate` (OWNER/PRINCIPAL) gates the lock endpoint.
6. **i18n:** all validation/error strings via i18n keys.

## Out of scope

Real per-tenant grade-boundary configuration UI (deferred per Open Question 1), a teacher/web marks-entry UI screen (this unit is backend + tests only, matching every backend-only unit since 06), report card generation/publishing (Unit 19), any "class average"/analytics rollups.

## Definition of done / checks

- Bulk mark entry + upsert-by-(examSubjectId,studentId) works end to end, tenant + branch isolated.
- `marks > maxMarks` is rejected with a clear validation error.
- Locking a `MarksEntry` row blocks further edits to that row with `409`; other rows for the same `examSubjectId` remain editable.
- Tenant-isolation test: cross-tenant `MarksEntry` queries return zero rows both via RLS and via a deliberately unscoped query.
- RBAC test: `marks.enter` (TEACHER/PRINCIPAL) pass on entry, OWNER/ADMIN/ACCOUNTANT denied; `marks.moderate` (OWNER/PRINCIPAL) pass on lock, TEACHER denied.
- Branch-scope test: a TEACHER on Branch A denied Branch B's exam subjects.
- Lint + typecheck + tests pass; `progress-tracker.md` updated (18 → done, 19 current).

## Next unit

**19 — Report Cards.**

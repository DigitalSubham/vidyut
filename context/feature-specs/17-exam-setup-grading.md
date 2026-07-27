# Unit 17 — Exam Setup & Grading

Read `AGENTS.md`, `data-model.md` (§9), `rbac.md`, `api-conventions.md`, `code-standards.md` first.

## Open Questions

- This unit's scope line says "board configs," but no document defines a separate board-configuration entity — `Board` (`CBSE`/`ICSE`/`STATE_BIHAR`/`OTHER`) already exists as a field on `Branch` (Unit 02). **Recommendation:** no new model — an `Exam`'s effective board is simply its branch's `Board`; "board configs" reads as "the grading scheme selection respects the branch's board" (e.g. CBSE schools commonly use `CCE`/`GRADE`), not a separate configurable entity. A real board-specific grade-boundary/conversion table (e.g. what marks range maps to what CCE grade) is deferred to whichever unit actually computes grades from marks — likely Unit 18 (Marks Entry), not this one, since this unit only lets a school *choose* a scheme, not define its boundaries.

## Goal

Exam/term definitions and per-class-subject mark schemes — the structure Unit 18's marks entry and Unit 19's report cards build on.

## Scope

1. **Models** (`data-model.md` §9): `Exam`, `ExamSubject` + enums `ExamType`, `GradingScheme`. Branch-scoped; RLS per the established pattern.
2. `POST/GET/PATCH/DELETE /api/v1/exams` (sessionId, name, type, gradingScheme, startDate?) — soft-deleted. `isLocked` is a field on the normal `PATCH` (no separate lock endpoint) — once `true`, subsequent `PATCH`/subject mutations on that exam are rejected (`409`), since a locked exam is meant to freeze its structure before marks entry begins (Unit 18).
3. `POST/GET/DELETE /api/v1/exams/:id/subjects` (classId, subjectId, maxMarks, passMarks, weightage?) — cross-checks `classId`/`subjectId` belong to the exam's branch. Blocked once the parent `Exam.isLocked`.
4. **RBAC:** `exam.manage` (OWNER/PRINCIPAL/ADMIN per `rbac.md`) gates all mutations; reads are broad (any authenticated staff role — matches the pattern for structural/reference data like Unit 06's classes).
5. **i18n:** all validation/error strings via i18n keys.

## Out of scope

`MarksEntry` and the `>100%`/`marks ≤ maxMarks` guard (Unit 18), `ReportCardTemplate`/`ReportCard` generation (Unit 19), actual grade-boundary/conversion tables for `CCE`/`CGPA` schemes (deferred to whichever unit first needs to compute a grade from a mark — likely Unit 18), timetable/exam-scheduling conflicts (Unit 22 territory, not this unit).

## Definition of done / checks

- Exam + exam-subject CRUD works end to end, tenant + branch isolated.
- Locking an exam (`isLocked = true`) blocks further subject/exam mutations with a clear `409`, and unlocking (if ever needed) is a deliberate separate `PATCH` — not silently reversible by accident.
- Tenant-isolation test: cross-tenant exam/exam-subject queries return zero rows both via RLS and via a deliberately unscoped query.
- RBAC test: `exam.manage` roles (OWNER/PRINCIPAL/ADMIN) pass on mutations; TEACHER/ACCOUNTANT denied; reads work for any authenticated staff role.
- Branch-scope test: an ADMIN on Branch A denied Branch B's exams.
- Lint + typecheck + tests pass; `progress-tracker.md` updated (17 → done, 18 current).

## Next unit

**18 — Marks Entry + Moderation.**

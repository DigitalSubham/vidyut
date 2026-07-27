# Unit 33 — Academic-Year Rollover

Read `AGENTS.md`, `data-model.md` (§4–5), and Unit 06/07's schema (`Class.order`, `Enrollment`, `AcademicSession.isCurrent`) first. Churn-critical per `build-approach.md`'s definition-of-done checklist ("a full term of exams → report cards... " implies a full year cycle, and this is the piece that closes the loop into the next one).

## Open Questions

1. **What decides promotion vs. repeat vs. withdrawal?** No document specifies the business rule (e.g., "promote if attendance% and pass marks met" vs. always-manual). **Recommendation:** always **staff-decided, never automatic** — the rollover tool proposes a default (promote every currently-enrolled student to the next `Class.order`), but a PRINCIPAL/ADMIN reviews and can override any student to `REPEAT` (same class, new session) or `WITHDRAWN` (no new `Enrollment`) before committing. An automatic pass/fail promotion rule would need real academic-policy input this project has no source for — don't invent one.
2. **What happens to fee structures, concessions, and staff assignments across the boundary.** These are all session-scoped (`FeeStructure.sessionId`, `TeacherAssignment.sessionId`) — none of them carry forward automatically today. **Recommendation:** the rollover tool creates the new `AcademicSession` and the new `Enrollment` rows only; fee structure setup and teacher assignments for the new session are **deliberately separate, existing staff workflows** (Unit 11/09's own creation endpoints) — re-running them each year is normal school-admin work, not something to silently auto-copy (a copied fee structure with last year's amounts silently active would be a real financial bug waiting to happen).
3. **Idempotency / re-running the tool.** A rollover is a rare, high-stakes, once-a-year action — it must be safe to preview repeatedly and must not double-enroll if run twice by mistake. **Recommendation:** a two-step API (`preview` then `commit`, not a single mutating call) — `commit` is a no-op (or a clear conflict error) if the target session's `Enrollment` rows already exist for a given student.

## Goal

A staff-driven tool to close one `AcademicSession` and open the next: promote/repeat/withdraw every student, preserving full history (old `Enrollment`/`AttendanceRecord`/`MarksEntry`/`ReportCard` rows are never touched or deleted).

## Scope

1. **`POST /api/v1/academic/rollover/preview`** — `{ branchId, fromSessionId, toSessionId }` (the new session already created via Unit 06's existing `POST /sessions`) — returns a proposed roster: every enrolled student mapped to their default next class (by `Class.order + 1`), gated `session.manage`.
2. **`POST /api/v1/academic/rollover/commit`** — `{ branchId, fromSessionId, toSessionId, decisions: [{ studentId, action: PROMOTE|REPEAT|WITHDRAW, targetClassId?, targetSectionId? }] }` — creates new `Enrollment` rows for `PROMOTE`/`REPEAT` students (never mutates old ones), writes nothing for `WITHDRAWN` students. Idempotent per Open Question 3. Gated `session.manage` (OWNER/PRINCIPAL/ADMIN).
3. **Old session closure**: sets the `fromSessionId` `AcademicSession.isCurrent = false` and the new one `isCurrent = true` (reusing Unit 06's existing single-current-session-per-branch invariant), only on a successful commit.
4. **i18n:** all validation/error strings via i18n keys.

## Out of scope

Automatic promotion-eligibility rules (Open Question 1), auto-copying fee structures/teacher assignments/timetables to the new session (Open Question 2 — those stay separate, existing workflows), a rollback/undo for a committed rollover (a committed rollover is treated as final, matching how real school year-transitions work — corrections happen via normal per-student edits afterward, not a bulk undo).

## Definition of done / checks

- Preview never writes anything — verified by checking no `Enrollment` rows exist after a preview-only call.
- Commit creates exactly the decided `Enrollment` rows and correctly flips `isCurrent`, verified against a real multi-student, mixed-decision (promote + repeat + withdraw) fixture.
- Re-running commit for an already-committed student is a no-op or a clear conflict, never a duplicate `Enrollment`.
- Old session's `AttendanceRecord`/`MarksEntry`/`ReportCard` rows are provably untouched after rollover (row-count and content diff before/after).
- Tenant-isolation + branch-scope + RBAC tests, same pattern as every prior unit.
- Lint + typecheck + tests pass; `progress-tracker.md` updated (33 → done, 34 current).

## Next unit

**34 — Security & Isolation Pass.**

# Unit 26 — Teacher App

Read `AGENTS.md`, `feature-catalog.md`, `rbac.md` first. Extends Unit 16's `TeacherAttendanceScreen` (`apps/mobile`) rather than building a new surface from scratch.

## Open Questions

1. **Marks entry on a phone screen.** Unit 18's `POST /marks` is a bulk grid endpoint; a phone-sized marks-entry UI needs to be simpler than a spreadsheet grid. **Recommendation:** one-student-at-a-time entry (tap a student from the roster → number pad for marks / absent toggle → next student), not a scrollable grid — mirrors how Unit 16's attendance screen already works (tap-to-cycle-status), for UI consistency across the same app.
2. **The still-open "my assigned sections" gap.** Unit 16's tracker entry explicitly flagged this as unresolved: no endpoint lets a teacher look up their own sections/subjects (only `GET /academic/teacher-assignments?staffId=`, not self-deriving). **Recommendation:** this unit finally resolves it — add `GET /api/v1/academic/teacher-assignments/me` (self-scoped: resolves the caller's own `Staff` row via `getStaffByUserId`, returns their assignments) — small, backend-only addition, then wire both the attendance screen (retrofit) and the new marks/homework screens to a shared "my sections" picker instead of manual ID entry.

## Goal

A complete teacher-facing mobile experience: offline attendance (already built, Unit 16) + marks entry + homework posting — "simple and fast" per the catalog's own framing.

## Scope

1. **`GET /api/v1/academic/teacher-assignments/me`** (Open Question 2) — self-scoped, no `staffId` param needed.
2. **Mobile — section picker**: replaces `TeacherAttendanceScreen`'s manual branch/section text inputs (Unit 16's documented gap) with a real list from the new endpoint.
3. **Mobile — marks entry screen**: one-student-at-a-time flow (Open Question 1) against an exam's `ExamSubject`, using Unit 18's `POST /marks`.
4. **Mobile — homework posting screen**: a simple form (title/description/due date) against Unit 23's `POST /homework`, scoped to the teacher's own assigned sections.
5. **i18n:** every new screen string via i18n keys (Hindi/English).

## Out of scope

Grading/moderation UI (Unit 18's `marks.moderate` is PRINCIPAL-only, not a teacher-app screen), a full gradebook/analytics view, offline-write support for marks/homework (Unit 16's offline-write pattern was justified by attendance's daily, connectivity-sensitive cadence — marks entry happens in a classroom at exam time, less latency-sensitive; add offline support later only if teachers actually report connectivity problems during marks entry).

## Definition of done / checks

- A teacher can pick their own section from a real list (no more manual ID entry), mark attendance (existing), enter marks for an exam, and post homework — all end to end against a seeded demo tenant.
- `GET /teacher-assignments/me` returns only the caller's own assignments — verified against a second teacher's assignments in the same tenant.
- Honest verification-gap disclosure if no simulator/device is attached when implemented.
- `progress-tracker.md` updated (26 → done, 27 current).

## Next unit

**27 — Web Admin Panel.**

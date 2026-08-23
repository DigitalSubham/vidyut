# Unit 66 — Student Lifecycle Depth

Read `apps/api/src/modules/students/` (Unit 07) + Unit 33's rollover code first. Closes A1's remaining rows, found missing on re-audit of the spec batch.

## Open Questions

1. **Sibling linking** — is this purely a "these students are related" tag (for combined communication/reports) or does it need to auto-apply a sibling fee discount? **Recommendation:** a plain `SiblingGroup` (students share a `siblingGroupId`) for the tagging/comms use case; auto-discount stays a manual `Concession` (Unit 11, already supports it) rather than an automatic rule — confirm if auto-discount is actually wanted before adding that logic to the fee engine.
2. **Transfer between branches** — does the student's history (attendance, marks, fees) move with them, or does the old branch keep it and the new branch starts fresh? **Recommendation:** history stays put (same principle as Unit 33's rollover — old records are never rewritten); a transfer creates a new `Enrollment` in the target branch and closes the old one, same shape as a promotion.
3. **Re-admission** — Unit 33's rollover only handles REPEAT/WITHDRAW at year-end. A student withdrawn mid-year and coming back later needs its own flow, not a rollover-time decision.

## Goal

Sibling grouping, cross-branch transfer, alumni records, a student activity timeline, and a standalone re-admission flow.

## Scope

1. `SiblingGroup` + `Student.siblingGroupId` (Open Question 1).
2. `POST /students/:id/transfer` — `{ targetBranchId, targetClassId, targetSectionId }`, closes the current `Enrollment` and opens a new one in the target branch (Open Question 2).
3. `Student.status = ALUMNI` transition + `GET /students/alumni?branchId=` — a filtered list, not a separate "alumni portal" (no distinct login/experience beyond what a former guardian's existing parent-app access already covers, if their account is kept active).
4. `POST /students/:id/readmit` — for a `WITHDRAWN`/struck-off student, creates a fresh `Enrollment` in the current session (Open Question 3), distinct from Unit 33's rollover-time REPEAT.
5. `StudentTimelineEntry` (`studentId`, `type: DISCIPLINE|ACHIEVEMENT|NOTE`, `body`, `recordedById`, `occurredAt`) — a simple append-only log, surfaced on the student profile.

## Out of scope

Automatic sibling fee-discount application (Open Question 1, unless confirmed); a distinct alumni-portal login experience (reuses the existing parent/student login if the account stays active).

## Definition of done / checks

- Sibling grouping, transfer, alumni filtering, re-admission, and the timeline all work correctly against a real multi-student fixture, with old records provably untouched by a transfer (same check style as Unit 33).
- Tenant-isolation + branch-scope tests.
- `progress-tracker.md` updated.

## Decisions made during build

- Open Question 1: built as the recommended plain `SiblingGroup` tag, no auto-discount.
- Open Question 2: `Enrollment` has `@@unique([studentId, sessionId])`, so a transfer cannot literally "close and open a new Enrollment" for the same session — it updates the existing Enrollment row's `branchId`/`classId`/`sectionId` in place (and moves `Student.branchId`), same shape as a promotion updating one row. Old attendance/marks/fee records already carry their own `branchId` and are never rewritten — verified with a fixture that creates a real pre-transfer `AttendanceRecord` and asserts it is untouched after the transfer.
- Open Question 3: readmission upserts on the same `studentId_sessionId` key (reactivating a `LEFT` current-session Enrollment if one exists, else creating a fresh one) — distinct from Unit 33's rollover-time REPEAT.
- Web UI added on the existing Unit 07 student detail page (`/students/[id]`) rather than a new route: a "Lifecycle" card with transfer (branch/class/section pickers), mark-alumni/readmit toggle, sibling linking, and timeline log.
- Docker was unreachable for this unit (as for Units 52–65); migrations are hand-written to match Prisma's generated SQL shape and verified via `prisma generate` (schema-only) + `tsc --noEmit`, not against a live Postgres.

## Next unit

**67 — Lesson Planning, Curriculum & LMS.**

# Unit 42 — Staff HR Depth

Read `apps/api/src/modules/staff/` (Unit 09) first. Fills A4's remaining gaps: document storage, staff attendance, staff ID cards, recruitment, appraisal.

## Open Questions

1. **Staff ID cards need a schema change**, not just a UI — `Certificate.studentId` is a required FK, so the certificates module structurally can't issue one today. **Recommendation:** make `Certificate.studentId` nullable and add `Certificate.staffId` (nullable, mutually exclusive with `studentId` via an app-level check, not a DB constraint Postgres can express cleanly) — the smallest schema change that unblocks it, reusing the same register/numbering machinery rather than a parallel `StaffCertificate` model.
2. **Recruitment/onboarding and appraisal** — real HR-process features with no source-of-truth process document. **Recommendation**: defer both fully — feature-catalog.md already tags them P3, and building a workflow without a real school's actual hiring/review process to model would be guessing. Flag to user rather than build blind.

## Goal

Staff document uploads, a separate staff-attendance record, and staff ID cards. Recruitment/appraisal explicitly deferred (Open Question 2).

## Scope

1. `POST /staff/:id/documents` — presigned upload via Unit 04's existing S3 wrapper, storing `{key, label}` in `Staff.docs` JSONB.
2. `StaffAttendanceRecord` (mirrors `AttendanceRecord`'s shape, staff-scoped) + `POST/GET /staff/attendance`.
3. `Certificate.staffId` (Open Question 1) + issue a staff ID card via the existing certificates flow.

## Out of scope

Recruitment/onboarding, appraisal/performance (Open Question 2 — explicitly deferred, not silently dropped).

## Definition of done / checks

- A document uploads and is retrievable via a signed URL scoped to the correct tenant/branch.
- Staff attendance records and reports work the same way student attendance does (reused patterns, tested).
- A staff ID card issues correctly and doesn't collide with the student certificate register.
- `progress-tracker.md` updated.

## Next unit

**43 — Academic Structure Depth.**

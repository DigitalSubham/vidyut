# Unit 44 — Attendance Depth (Period-wise, Biometric, Analytics)

Read `apps/api/src/modules/attendance/` (Unit 15/16/32) first.

## Open Questions

1. **Biometric/RFID integration** — this unit can build the *ingestion endpoint* (a device pushes a scan event, this API upserts an `AttendanceRecord` the same way a teacher's manual mark does) but **cannot integrate a specific device** without the user choosing a real vendor (ESSL/Mantra are named in the catalog as examples, not a decision). **Recommendation:** build a generic `POST /attendance/device-scan` webhook-shaped endpoint keyed by a device token, document the payload shape, and let the user's chosen vendor be wired to it later — don't guess a vendor-specific SDK integration with no device to test against.
2. **Period-wise attendance** — needs a period reference; Unit 22's `TimetablePeriod` already has the shape (`sectionId`, `dayOfWeek`, `periodNo`, `subjectId`). **Recommendation:** add `AttendanceRecord.periodId` (nullable — daily attendance keeps `null`), reusing the existing model rather than a parallel `PeriodAttendanceRecord`.

## Goal

Support period-wise (not just daily) attendance, a generic device-scan ingestion point, and real trend analytics beyond the defaulter list.

## Scope

1. `AttendanceRecord.periodId` (nullable) + a period-aware mark/list variant.
2. `POST /attendance/device-scan` (Open Question 1) — device-token-authenticated, not user-JWT-authenticated (a device isn't a user).
3. `GET /attendance/analytics?branchId=` — attendance % trend over a date range, chronic-absentee list (≥N absences in the period), reusing Unit 15's existing percent-calculation logic rather than reimplementing it.

## Out of scope

Face-recognition attendance (needs a real camera/vendor, same reasoning as Open Question 1, and is P3/lower-priority than biometric); a specific vendor SDK integration.

## Definition of done / checks

- Period-wise marks and daily marks coexist without breaking existing daily-attendance tests.
- A device-scan payload correctly creates/updates an `AttendanceRecord`.
- Analytics endpoint returns a real trend + chronic-absentee list against seeded data, tested.
- `progress-tracker.md` updated.

## Next unit

**45 — Homework Depth.**

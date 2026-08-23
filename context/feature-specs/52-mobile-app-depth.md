# Unit 52 — Mobile App Depth (Teacher/Parent/Student Remaining Features)

Read `apps/mobile/src/screens/` (Units 16, 24–26) first.

## Open Questions

1. **Messaging/leave from the teacher app** — resolved: messaging (Unit 49) and the unified calendar were already wired into `TeacherHomeScreen`/`ParentStudentHomeScreen` by Unit 49's own mobile pass. The only real gap left was leave-apply — Unit 09's `POST /leave-requests` was backend-only until this unit added a `LeaveScreen` tab to the teacher app.
2. **Student materials/online exams** — resolved by auto-pacing (per this session's operating mode) to the smaller, already-spec-endorsed option: online-exam-taking without a study-material library. A10 (content library, LMS territory) remains fully deferred, untouched by this unit. This was **already built** by Unit 46/49's own mobile passes (`OnlineExamTaker` wired into `ParentStudentHomeScreen`'s `onlineExams` section) — nothing new needed here.
3. **Scope discovered at implementation time**: auditing `apps/mobile/src/screens/` and `navigation/` before writing anything showed messaging, the unified calendar, and online-exam-taking were *already* wired in (Units 46/49), leaving only two real gaps: (a) leave-apply on the teacher app, (b) PTM slot booking on the parent app (Unit 49's own mobile pass explicitly scoped this out — "PTM-slot booking did not get a mobile screen this pass"). PTM booking needed one small backend addition: `GET /me/teachers` (self-scoped, resolves a student's current-session subject teachers) to give the parent a staffId to browse slots for — the existing `GET /ptm-slots?staffId=` required one, and no self-scoped way to discover it existed.

## Goal

Surface existing-but-not-yet-mobile-exposed features (leave apply, calendar) and the genuinely new ones (chat, online exam taking) on the mobile app.

## Scope

1. Teacher app: a "Leave" tab calling Unit 09's existing `POST /leave-requests` (already built, backend-only until now) + Unit 49's messaging inbox.
2. Parent app: Unit 49's calendar + messaging inbox + PTM slot booking.
3. Student app: Unit 46's online-exam-taking screen (MCQ, timed) — **only if Open Question 2 confirms materials are out of scope for this unit**; otherwise this unit's scope grows to include a materials list first.

## Out of scope

A study-material content library unless Open Question 2 resolves to include it (A10 remains its own deferred module otherwise).

## Definition of done / checks

- Leave apply, messaging, and calendar work on-device against the real backend endpoints.
- An online exam can be taken and auto-grades correctly from the student app.
- **Honest verification gap** (matching every prior mobile unit): if no simulator/device is attached at implementation time, note that only `tsc --noEmit` + backend tests were verified, not on-device behavior.
- `progress-tracker.md` updated.

## Next unit

**53 — Owner Dashboard Depth.**

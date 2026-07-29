# Unit 52 — Mobile App Depth (Teacher/Parent/Student Remaining Features)

Read `apps/mobile/src/screens/` (Units 16, 24–26) first.

## Open Questions

1. **Messaging/leave from the teacher app** — depends on Unit 49's `Message`/leave-apply patterns existing first; sequence this after Unit 49 and Unit 09's existing `LeaveRequest` apply endpoint (already built, just never surfaced on mobile).
2. **Student materials/online exams** — depends on Unit 46's `OnlineExam` and a study-material model (not yet specced anywhere — **flag to user**: is a content library (A10, LMS territory, currently fully deferred) actually wanted, or just online exams without materials? Building online-exam-taking without any study material to prepare from is a valid, smaller scope — confirm before assuming A10 is now in scope too.

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

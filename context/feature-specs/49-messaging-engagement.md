# Unit 49 — Messaging & Engagement (C2 Depth)

Read `apps/api/src/modules/announcements/` (Unit 20) first — several of these rows are thin extensions of the existing audience-matching announcement pipeline; a few are genuinely new surfaces.

## Open Questions

1. **Parent-teacher 1:1 chat** — real-time messaging is meaningfully more infrastructure (websockets or polling, message threading, read receipts) than anything else in this batch. **Recommendation:** scope v1 as **asynchronous, not real-time** — a `Message` model + REST polling (the mobile app already polls `/me/*` endpoints elsewhere), no websocket server. Confirm with the user if true real-time chat is actually wanted before building socket infra.
2. **Events & school calendar** — is this a new calendar or should exam dates (Unit 46's `ExamTimetable`) and homework due-dates (already visible) surface into one unified calendar view? **Recommendation:** the latter — a `CalendarEvent` model for holidays/generic events, **merged at read time** with existing exam/homework dates into one `GET /me/calendar` response, not a separate calendar UI per data source.

## Goal

Circulars, class broadcast, PTM scheduling, a unified calendar, complaints/surveys, gallery, and SOS broadcast.

## Scope

1. `Circular` (`title`, `body`, `attachmentUrl`, `audience` — reuses Unit 20's exact audience-matching shape) + acknowledgement tracking (`CircularAck(circularId, userId, ackedAt)`).
2. Class/group broadcast: confirmed as already covered by Announcements' class-audience targeting (Unit 20) — no new code, just a UI label clarifying it in the web/mobile apps.
3. `PTMSlot` (`staffId`, `startTime`, `endTime`, `bookedByGuardianId?`) + booking endpoint.
4. `CalendarEvent` + `GET /me/calendar` (Open Question 2).
5. `Complaint` (`raisedByUserId`, `category`, `body`, `status`) + staff resolution flow.
6. `Survey`/`SurveyQuestion`/`SurveyResponse` — simple single-choice/text questions, no branching logic.
7. `GalleryAlbum`/`GalleryPhoto` — S3-backed, reuses Unit 04's storage wrapper.
8. Emergency/SOS: a `POST /announcements/sos` variant that skips the normal fan-out queue delay and forces `channel: PUSH` + `channel: SMS` simultaneously to every guardian in the branch, bypassing the wallet-balance skip (an emergency shouldn't silently fail for lack of SMS balance — flag this explicitly to the user as a deliberate policy choice needing their sign-off, since it could overspend the wallet).
9. Parent-teacher chat (Open Question 1), if confirmed in scope.

## Out of scope

Real-time chat/websockets (Open Question 1, unless confirmed); calendar sync to external calendars (Google Calendar/ICS export — a real but separate integration ask).

## Definition of done / checks

- Circular acknowledgement tracks correctly per user.
- Calendar correctly merges events + exam dates + homework due-dates.
- SOS broadcast fires to every channel regardless of wallet balance — **confirm this policy with the user before shipping it**, since it's a real billing-impact decision, not a pure engineering one.
- `progress-tracker.md` updated.

## Next unit

**50 — Certificates Depth.**

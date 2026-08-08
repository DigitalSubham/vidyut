# Unit 49 — Messaging & Engagement (C2 Depth)

Read `apps/api/src/modules/announcements/` (Unit 20) first — several of these rows are thin extensions of the existing audience-matching announcement pipeline; a few are genuinely new surfaces.

## Open Questions

1. **Parent-teacher 1:1 chat — resolved, confirmed in scope, async.** Built as recommended: a `Message` model + REST polling (`GET /messages/threads/mine`, `GET /messages?staffId=&guardianId=`, `POST /messages`), no websocket server, no read receipts. Self-scope is enforced by resolving the caller's own Staff/Guardian record server-side and checking they're one of the two conversation participants (or staff with branch access, for moderation).
2. **Events & school calendar — resolved as recommended.** `CalendarEvent` for holidays/generic events, merged at read time with `ExamTimetable` dates (via the student's current class's `ExamSubject` rows) and `Homework` due-dates into one `GET /me/calendar` response — replaced the old homework-only calendar the mobile app's Parent/Student screen used before this unit, rather than adding a second calendar tab.
3. **SOS broadcast (scope #8) — deliberately NOT built this pass.** The user explicitly said to skip the SMS-wallet-balance bypass for now, pending a real sign-off on the billing-impact policy (an emergency shouldn't silently fail for lack of SMS balance — but that's a "can overspend the wallet" decision, not an engineering default). Everything else in this spec's scope was built.

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
8. Emergency/SOS: a `POST /announcements/sos` variant that skips the normal fan-out queue delay and forces `channel: PUSH` + `channel: SMS` simultaneously to every guardian in the branch, bypassing the wallet-balance skip (an emergency shouldn't silently fail for lack of SMS balance — flag this explicitly to the user as a deliberate policy choice needing their sign-off, since it could overspend the wallet). **Skipped this pass — see Open Question 3.**
9. Parent-teacher chat (Open Question 1), if confirmed in scope. **Confirmed — built.**

## Out of scope

Real-time chat/websockets (Open Question 1, unless confirmed); calendar sync to external calendars (Google Calendar/ICS export — a real but separate integration ask).

## Definition of done / checks

- Circular acknowledgement tracks correctly per user.
- Calendar correctly merges events + exam dates + homework due-dates.
- SOS broadcast fires to every channel regardless of wallet balance — **confirm this policy with the user before shipping it**, since it's a real billing-impact decision, not a pure engineering one.
- `progress-tracker.md` updated.

## Next unit

**50 — Certificates Depth.**

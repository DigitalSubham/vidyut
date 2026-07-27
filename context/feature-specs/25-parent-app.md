# Unit 25 — Parent App

Read `AGENTS.md`, `feature-catalog.md` (parent-app persona notes), `rbac.md`, `architecture-context.md` §8 first. Builds on Unit 24's self-scope layer; the mobile-side counterpart to nearly every backend unit built so far (11–23).

## Open Questions

1. **Multi-child switching.** A parent with more than one child (common — `feature-catalog.md` explicitly calls out "multi-child") needs a way to switch context. **Recommendation:** a single persistent "active child" selector at the top of the app (not a re-login) — every screen below reads from the currently-selected child, switching is instant (client-side state, no network round-trip since Unit 24's `/me` endpoints already accept `studentId`).
2. **Online payment inside the app vs. a web handoff.** Unit 13 built `POST /api/v1/online-payments/initiate` (Razorpay) as a backend endpoint, but no mobile Razorpay Checkout integration exists yet. **Recommendation:** use Razorpay's React Native SDK / Checkout WebView (their standard mobile integration, not a custom payment form — PCI scope stays with Razorpay, matching Unit 13's original webhook-based design). This is a well-trodden integration, not a novel one.
3. **Offline behavior for a read-heavy app.** Unlike Unit 16's teacher app (offline-write-then-sync), the parent app is almost entirely reads. **Recommendation:** simple cache-last-response-per-screen (WatermelonDB's existing sync engine from 15b isn't needed here — a lighter `AsyncStorage`/in-memory cache per screen is enough; don't force the offline-write machinery onto a read-only surface that doesn't need it).

## Goal

The full parent-facing mobile experience: fees + online pay, attendance, results/report cards, notices, homework, timetable — everything a paying parent actually opens the app for.

## Scope

1. **Fees**: `GET /api/v1/fees/students/:studentId/ledger` (Unit 12, already self-scope-checkable) rendered as a due/paid history; a "Pay Now" screen wired to Unit 13's `initiate` + Razorpay Checkout (Open Question 2).
2. **Attendance**: monthly calendar view on Unit 24's `GET /me/attendance`.
3. **Results/report cards**: list + detail view on Unit 24's `GET /me/report-cards` (published only).
4. **Notices**: a feed reading `GET /api/v1/announcements` filtered client-side to the parent's audience match (Unit 20's `audience` rule, same matching logic as the worker's fan-out, just read-only here).
5. **Homework**: list view on Unit 24's `GET /me/homework`.
6. **Timetable**: weekly grid view on Unit 24's `GET /me/timetable`.
7. **Multi-child switcher** (Open Question 1) wired across every screen above.
8. **i18n:** every screen string via i18n keys (Hindi/English) — this is the highest-traffic surface for Hindi/Hinglish correctness.

## Out of scope

Messaging/chat with teachers (not in any spec — a real feature, not this unit's job), transport/GPS tracking (`build-approach.md`'s explicit on-demand list), a native calendar widget beyond the homework due-date list (Unit 23's Open Question 1 — deferred further).

## Definition of done / checks

- Every screen renders real data end to end against a seeded demo tenant with a multi-child parent.
- Switching the active child updates every screen without a re-login.
- A test payment completes through Razorpay's sandbox/test mode and the ledger reflects it.
- Honest verification-gap disclosure if no simulator/device is attached when implemented.
- `progress-tracker.md` updated (25 → done, 26 current).

## Next unit

**26 — Teacher App.**

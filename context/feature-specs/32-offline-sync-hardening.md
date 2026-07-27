# Unit 32 — Offline Sync Hardening

Read `AGENTS.md`, `architecture-context.md` §8 (offline-first mobile), and Units 15b/16's progress-tracker entries first. Unit 16 built the first real offline-write-then-sync flow (attendance); this unit hardens that pattern rather than inventing a new one, and extends it to marks entry if Unit 26 added offline support there.

## Open Questions

1. **What "conflict" actually means for this app's data shapes.** Attendance/marks are last-writer-wins by design (a teacher correcting a mistake overwrites, per Units 15/18's own upsert semantics) — there's no real merge-conflict scenario like collaborative document editing. **Recommendation:** don't build a generic conflict-resolution engine (CRDT, vector clocks, etc.) — that solves a problem this app doesn't have. Harden the two things that actually can go wrong: (a) a sync that partially succeeds (some records committed, some failed) must be retryable without duplicating the committed ones — verify Unit 16's client-generated-id upsert already guarantees this end to end under real network interruption, not just the happy path; (b) a very stale local write (e.g., a phone offline for a week) landing after a teacher already re-entered the same data on the web — last-write-wins by `updatedAt` is enough, no need for anything smarter.
2. **Delta sync vs. full resync.** Unit 16's screen currently re-fetches the full roster on load. **Recommendation:** add a `?since=` timestamp param to the relevant list endpoints (attendance, marks, homework) so a returning-online device only pulls what changed — a real bandwidth/battery win for Bihar's connectivity conditions, worth doing here rather than deferring further.
3. **SMS fallback.** When a push notification can't be delivered (device offline, no data), `feature-catalog.md`/`build-approach.md` name SMS as the fallback channel. **Recommendation:** extend Unit 14/16/20's existing `NotificationLog` fan-out — after a `PUSH` attempt, if no delivery confirmation within a short window, fall back to `SMS` via the same `SmsWallet`-gated path Unit 14 already built (reuse, don't duplicate the wallet-check logic).

## Goal

Prove the offline-write pattern is actually robust under real interruption (not just idealized happy-path tests), add delta sync, and wire the SMS fallback the notification system was always meant to have.

## Scope

1. **Idempotent sync retry test** (Open Question 1a): simulate a partial sync failure (kill the connection mid-batch) and verify a retry doesn't duplicate committed records — a real integration test against `POST /attendance`, not just a unit test of the upsert logic in isolation.
2. **`?since=` delta param** on `GET /attendance`, `GET /marks`, `GET /homework` (Open Question 2) — backward-compatible addition, omitting it keeps existing full-fetch behavior.
3. **SMS fallback** (Open Question 3) in the relevant worker processors (`students-absence-alert.ts`, `announcement-fanout.ts`) — attempt `PUSH`, fall back to `SMS` on no confirmation.
4. **Mobile**: wire the section-picker/roster screens (Unit 26) to use `?since=` on reconnect instead of a full refetch.

## Out of scope

A general-purpose conflict-resolution framework (Open Question 1 — not needed for this app's data shapes), real push-delivery-confirmation infrastructure beyond what FCM already reports (building a custom delivery-tracking system is disproportionate to the actual problem), offline support for modules that don't have offline-write yet (fees, admissions — those are online-only surfaces by design, not a gap to fix here).

## Definition of done / checks

- A simulated partial-sync-then-retry test proves no duplicate records land, end to end.
- `?since=` returns only changed records — verified against a real before/after mutation.
- An SMS fallback fires when a push attempt has no confirmation within the configured window — verified with a forced-failure test double for the push step only (not mocking the whole notification pipeline).
- Lint + typecheck + tests pass; `progress-tracker.md` updated (32 → done, 33 current).

## Next unit

**33 — Academic-Year Rollover.**

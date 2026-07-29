# Unit 68 — Communication Extras (Contact Fields, Preferences, Newsletter, Birthday Automation)

Read Unit 08 (`Guardian`), Unit 40 (real notification providers) first — this unit is meaningless without Unit 40's real send capability landing first (opt-out preferences and newsletters are moot while every send is stubbed).

## Open Questions

1. **Communication preferences** only matters once sends are real (Unit 40) — build the data model now, but the *effect* (actually skipping a stubbed send) is trivial; the real value lands only after Unit 40.
2. **Birthday automation** — a nice-to-have with real spam risk if not opt-outable. **Recommendation:** gate it behind the same communication-preference flag (Open Question 1), on by default only if the user confirms that's the right default (some parents may find it intrusive rather than delightful — a genuine judgment call, not purely technical).

## Goal

Alternate contact fields, an opt-in/opt-out preference center, a newsletter send, and optional birthday greetings.

## Scope

1. `Guardian.alternatePhone`, `Guardian.whatsappOptIn` — the missing contact fields from A3.
2. `CommunicationPreference` (`userId`, `channel`, `optedIn: boolean`) — checked by Unit 40's send functions before dispatching (a real gate, not just a UI toggle with no effect).
3. `Newsletter` (`title`, `body`, `sentAt?`) — reuses Unit 20's announcement fan-out mechanism with a distinct template key, not a parallel send pipeline.
4. Birthday automation: a daily cron (Unit 14's pattern) checking `Student.dob`/`Staff` birthdays, sending via Unit 40's real channels, gated by `CommunicationPreference` (Open Question 2 — confirm the opt-in default with the user).

## Out of scope

A full preference-center UI beyond a simple per-channel toggle list (no granular per-message-type preferences).

## Definition of done / checks

- Preference opt-out correctly suppresses a send in Unit 40's dispatch functions (tested with a mock provider, matching Unit 40's own test pattern).
- Newsletter reaches the intended audience via the existing fan-out.
- Birthday cron fires correctly on the right date.
- `progress-tracker.md` updated, with the birthday-automation default-on/off decision explicitly recorded as confirmed with the user, not assumed.

## Next unit

**69 — Platform Extras (Security Audit, SSO, Webhooks, Help, Feedback, Dashboards, Branding UI).**

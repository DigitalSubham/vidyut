# Unit 40 — Real Notification Providers (SMS/WhatsApp/Push/Email) + Inbox + Templates/DLT

Read every worker processor that currently logs `(stub)` (`fees-reminder-send.ts`, `students-absence-alert.ts`, `announcement-fanout.ts`) first. This is the single most-flagged gap across every prior unit's honest disclosures — the queue/log/wallet-debit pipeline is real and tested throughout; the actual provider call has never been wired.

## Open Questions

1. **This unit is blocked on real accounts that don't exist yet**, same as Unit 31's EAS gap. **Recommendation, matching Unit 31's own precedent**: build the real provider-calling code, gated behind env vars (`MSG91_API_KEY`, `GUPSHUP_*`, `FCM_SERVER_KEY`, `SES_*`), falling back to the existing stub behavior (clearly logged as stubbed, not silently pretending success) when those aren't configured — never fake a real send. **The user must obtain these accounts before this unit's providers can be verified end-to-end**; flag this explicitly rather than claiming completion.
2. **DLT template registration is a legal/telecom-compliance process** (India's TRAI DLT regime), not something engineering can complete alone — templates must be pre-approved with an operator before they can send. **Recommendation:** build a `NotificationTemplate` model + admin screen to *record* the DLT-approved template IDs once the user has them registered; this unit can't self-certify DLT compliance.
3. **In-app inbox** — a genuinely new UI surface. **Recommendation:** a simple `/notifications` list screen (parent + web admin) reading `NotificationLog` filtered to the caller's own `toUserId`, mark-as-read via a new `readAt` column — reuses existing data, no new backend model beyond one column.
4. **General "send later" scheduling** — today only the fee-reminder cron (Unit 14) uses BullMQ's repeat-job feature; there's no way for staff to schedule an arbitrary one-off announcement/circular for a future time. **Recommendation:** `Announcement.scheduledFor?` (nullable) — if set, the fan-out job is enqueued with a BullMQ delay instead of immediately, reusing the existing fan-out processor unchanged; not a new scheduling engine.

## Goal

Real SMS/WhatsApp/push/email sending wherever credentials are configured (with an honest stub fallback otherwise), a template registry, an in-app inbox, and generic scheduled sends.

## Scope

1. `sendSms(phone, templateKey, vars)` / `sendWhatsapp(...)` / `sendPush(userId, ...)` / `sendEmail(...)` — thin provider adapters in `apps/worker/src/providers/`, each gated on its own env var, called from the existing worker processors in place of `console.log`.
2. `NotificationTemplate` model (`templateKey`, `channel`, `dltId?`, `body`) — a lookup the send functions consult instead of hardcoded strings.
3. `NotificationLog.readAt` + `GET /me/notifications`, `PATCH /me/notifications/:id/read`.
4. Web/mobile: a notifications inbox screen.
5. `Announcement.scheduledFor?` (Open Question 4) — a delayed BullMQ enqueue instead of the immediate fan-out Unit 20 always does today.

## Out of scope

Rich HTML email templates (plain text/simple templates are enough for transactional mail); WhatsApp interactive messages/buttons (template messages only, matching what DLT approval typically covers first); a template-authoring WYSIWYG (a plain text field with `{{variable}}` placeholders is enough).

## Definition of done / checks

- With no provider env vars set (this repo's real current state), every send path behaves exactly as today — a clearly-logged stub, never a false success.
- With a test/sandbox provider credential (if the user provides one), a real message is confirmed delivered.
- Inbox shows a user's own notifications only (self-scope test).
- **Explicitly flagged**: DLT template approval and real provider account setup are the user's to complete; this unit's own tests can only prove the stub-fallback path and the plumbing, not a live send, until those exist.
- `progress-tracker.md` updated.

## Next unit

**41 — Admissions Depth.**

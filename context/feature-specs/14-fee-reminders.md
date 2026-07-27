# Unit 14 — Fee Reminders

Read `AGENTS.md`, `data-model.md` (§10, §11, §13), `rbac.md`, `api-conventions.md`, `code-standards.md`, `feature-catalog.md` (§B1) first.

## Open Questions

- `data-model.md` §13 gives `WalletTxn{...}` with the fields literally elided — no schema at all, unlike every other model in the doc. **Recommendation:** a minimal ledger row — `WalletTxn{ id, tenantId, type(WalletTxnType{CREDIT,DEBIT}), amount(paise), reason, referenceId?, createdAt }`, no RLS (same as `SmsWallet` — Unit 05's decision: platform-managed config, plain `tenantId`-filtered queries).
- No document gives an actual per-SMS/WhatsApp cost to deduct from `SmsWallet`. **Recommendation:** a configurable rate (`SMS_COST_PAISE` env var) defaulting to a placeholder (e.g. 20 paise), same pattern as Unit 13's `PAYMENT_PLATFORM_FEE_BPS` — real pricing is decided later, the deduction mechanism exists now. If the wallet balance is insufficient, the reminder is skipped (not sent, not deducted) and logged as `FAILED` rather than letting the balance go negative.
- No document gives an exact reminder cadence (how many days before/after a due date). **Recommendation:** a simple, hardcoded-but-documented default — remind once 3 days before `dueDate`, and once every 7 days after the invoice becomes overdue — with a `NotificationLog` check preventing a duplicate reminder for the same invoice within the same day. A per-tenant configurable cadence is deferred (config-over-code, but not this unit's scope to build the settings UI for it).
- `NotificationLog` (`data-model.md` §11) doesn't exist yet — it belongs conceptually to Unit 20 (Notifications & Announcements), which hasn't been built. **Recommendation:** this unit creates it (first consumer), matching the precedent of Unit 06 creating `TeacherAssignment` before Unit 09 needed it. Unit 20 reuses the same model for its own notification types.
- The actual SMS/WhatsApp provider (MSG91 vs Gupshup) is still an open decision tracked in `progress-tracker.md` since Unit 03. This unit keeps using the existing stub-send pattern (`sendOtpSms`-style `console.log`) — no real provider integration yet.

## Goal

Scheduled fee-due reminders to guardians via a nightly cron job, deducting from the tenant's SMS wallet and logging every attempt.

## Scope

1. **Models** (additions per the Open Questions above): `NotificationLog` + enums `NotifChannel`, `NotifStatus` (`data-model.md` §11, RLS per the established pattern); `WalletTxn` + enum `WalletTxnType` (§13, no RLS — same as `SmsWallet`).
2. **Cron job** (`apps/worker`, BullMQ repeatable job, daily): for every `ACTIVE` tenant with the `fees` module enabled, scans each branch's `Invoice`s for ones due within 3 days or overdue (per the cadence in Open Questions), resolves each student's primary/`canPay` guardians (`StudentGuardian`), and enqueues one `fee.reminder.send` job per (invoice, guardian) — deferring the actual send off the cron tick itself, same fan-out pattern as every other background job in this codebase.
3. **`fee.reminder.send` processor** (`apps/worker`): checks `SmsWallet.balancePaise` ≥ `SMS_COST_PAISE`; if sufficient, sends (stub), deducts the cost (`WalletTxn` + `SmsWallet.balancePaise` decrement), and writes `NotificationLog` (`status = SENT`); if insufficient, writes `NotificationLog` (`status = FAILED`) without deducting.
4. `POST /api/v1/fees/reminders/run` — a manual trigger (for testing/on-demand use, not just waiting for the nightly cron), gated by `notification.send`. Same underlying scan-and-enqueue logic as the cron tick, scoped to the caller's tenant only.
5. `GET /api/v1/notifications` (filters: studentId, channel, status) — gated by `fee.view`.
6. **i18n:** all validation/error strings via i18n keys.

## Out of scope

Real SMS/WhatsApp/push provider integration (still a stub), a per-tenant configurable reminder cadence UI, push/email channels (no device-token/email infra exists yet), Unit 20's general-purpose announcements (this unit only sends fee reminders, not arbitrary notifications).

## Definition of done / checks

- The cron tick (triggered manually in tests, not by waiting a real day) correctly identifies invoices due-soon/overdue and enqueues exactly one reminder per (invoice, eligible guardian).
- A reminder with sufficient wallet balance sends (stub), deducts the correct amount, and logs `SENT`; insufficient balance skips the send and logs `FAILED` without deducting.
- Re-running the scan the same day doesn't send a duplicate reminder for the same invoice (checked via `NotificationLog`).
- Tenant-isolation test: cross-tenant `NotificationLog`/`WalletTxn` queries return zero rows both via RLS (for `NotificationLog`) and via a deliberately unscoped query.
- RBAC test: `notification.send` gates the manual trigger; `fee.view` gates the log read.
- Lint + typecheck + tests pass; `progress-tracker.md` updated (14 → done; **Milestone 2 complete** → 15 current).

## Next unit

**15 — Attendance (API + Web)** (Milestone 3 begins).

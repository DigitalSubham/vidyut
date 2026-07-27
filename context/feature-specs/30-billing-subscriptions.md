# Unit 30 — Billing & Subscriptions

Read `AGENTS.md`, `data-model.md` (§13), `plans-entitlements.md`, `context/feature-specs/05-superadmin-tenants-plans.md` first. `Plan`/`Subscription`/`SmsWallet`/`ModuleToggle` already exist (Unit 05) — this unit is what was missing: **actually billing the school** (Vidyut's own revenue), SMS wallet top-ups, usage metering, and platform-fee revenue visibility.

## Open Questions

1. **No record of what Vidyut has actually charged a school.** `Subscription` tracks plan/status/period but there's no invoice/payment record for the school's own annual fee — `data-model.md` §13 doesn't name one either. **Recommendation:** add `PlatformInvoice{ id, tenantId, subscriptionId, amount, status(PENDING/PAID/OVERDUE), dueDate, paidAt?, invoiceNo }` — a small, additive model, deliberately named `Platform*` to avoid any confusion with the tenant-facing `Invoice` (Unit 12, fees a school charges *its* parents) already in the schema.
2. **SMS wallet has no top-up path.** Unit 14 debits `SmsWallet.balancePaise`; nothing credits it except the seed script. **Recommendation:** `POST /api/v1/platform/tenants/:id/wallet/recharge` (super-admin-only, manual for v1 — a school calls/emails Vidyut to top up, matching how this business actually collects SMS pass-through revenue per `plans-entitlements.md` rule 5; a self-serve recharge flow is deferred until real demand shows up) — creates a `WalletTxn(type: CREDIT)` (Unit 14's model, already built) and increments the balance.
3. **Platform-fee revenue reporting.** Unit 13 already computes `Payment.platformFeeAmount` per online payment but nothing aggregates it across tenants for Vidyut's own revenue visibility. **Recommendation:** one super-admin report endpoint summing it — reuses existing data, no new revenue-tracking model.
4. **Usage metering beyond limits.** Unit 05 already enforces plan limits (`assertWithinLimit`); "usage metering" here just means *showing* a tenant's current usage against their limits, which Unit 05's usage endpoint may already partially cover. **Recommendation:** confirm/extend Unit 05's existing `GET /platform/tenants/:id/usage` rather than building a parallel metering system — check that endpoint's current fields before adding new ones.

## Goal

Vidyut's own revenue operations: bill schools for their subscription, let them recharge their SMS wallet, and give the super-admin visibility into both subscription and platform-fee revenue.

## Scope

1. **Model**: `PlatformInvoice` per Open Question 1 (not tenant-RLS'd — platform-managed, same posture as `Plan`/`Subscription`).
2. **`POST /api/v1/platform/tenants/:id/invoices`** — super-admin creates a `PlatformInvoice` for a subscription period (manual for v1, matching Unit 05's already-manual provisioning flow — no automated recurring-billing engine yet, that's real payment-gateway-on-Vidyut's-own-account infra not justified until there are enough paying schools to need automation).
3. **`PATCH /api/v1/platform/tenants/:id/invoices/:invoiceId`** — mark `PAID`/`OVERDUE` (manual reconciliation, same reasoning as above).
4. **`POST /api/v1/platform/tenants/:id/wallet/recharge`** per Open Question 2.
5. **`GET /api/v1/platform/revenue/summary`** — subscription revenue (sum of `PAID` `PlatformInvoice`s) + platform-fee revenue (sum of `Payment.platformFeeAmount` across tenants) for a given period.
6. **Super-admin web screens** (`apps/web-app`'s existing super-admin surface, Unit 05): invoice list/create/mark-paid, wallet recharge form, revenue summary dashboard.

## Out of scope

Automated recurring billing / a payment gateway on Vidyut's own account (Open Question 2/manual-for-v1 reasoning applies here too — a real "Vidyut charges schools via Razorpay automatically" flow is deferred until proven necessary), self-serve SMS wallet recharge by the school itself (deferred per Open Question 2), dunning/reminder emails for overdue platform invoices (a smaller follow-on, not blocking this unit).

## Definition of done / checks

- A super-admin can create a `PlatformInvoice`, mark it paid, and see it reflected in the revenue summary.
- A wallet recharge correctly credits `SmsWallet.balancePaise` and writes a `WalletTxn(CREDIT)` row — verified against Unit 14's existing debit path still working correctly afterward.
- `GET /revenue/summary` numbers are traceable to real underlying rows (a direct correctness check).
- Auth test: every endpoint here requires the platform JWT (Unit 05's separate guard), not a tenant JWT.
- Lint + typecheck + tests pass; `progress-tracker.md` updated (30 → done, 31 current).

## Next unit

**31 — White-Label App Pipeline.**

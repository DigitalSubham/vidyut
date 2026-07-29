# Unit 38 — Fee Reconciliation & Receipt Corrections

Read Unit 12/13's payment/receipt code (`apps/api/src/modules/payments/`) first. Closes two confirmed B1 gaps: matching gateway/bank settlements to receipts, and an audited receipt cancellation/correction flow.

## Open Questions

1. **What "reconciliation" means without a real bank-statement feed.** A full bank-statement-import-and-auto-match engine is real fintech infra this stage doesn't justify. **Recommendation:** scope it to what's actually reconcilable today — Razorpay's own settlement webhook/report already ties every `Payment.gatewayOrderId` to a real settlement; this unit builds `GET /fees/reconciliation?date=` showing online payments **not yet marked reconciled** vs. counter (cash/cheque) payments needing manual daily tally — a staff-driven checklist, not an automated bank-feed matcher. Counter-cash reconciliation is inherently manual (there's no API for a cash drawer); this unit's job is surfacing the list to check off, not automating the tally itself.
2. **Receipt cancellation semantics.** `Receipt` already has `cancelledAt`/`cancelReason` columns (Unit 12) that nothing ever writes to. **Recommendation:** `PATCH /receipts/:id/cancel` — sets those fields, requires a reason, requires `fee.refund`-equivalent approval permission (reuse, don't invent a new permission), writes an `AuditLog` row, and **does not** reverse the underlying `Payment`/`Invoice` status automatically — a cancelled receipt with a still-successful payment is exactly the state that needs a human to look at it (matches the RefundRequest's own human-approval-gated pattern from Unit 13).

## Goal

A daily reconciliation checklist for the accountant, and an audited way to cancel a wrongly-issued receipt.

## Scope

1. `GET /fees/reconciliation?branchId=&date=` — lists that day's payments split by mode, flagging online payments with no matching Razorpay settlement reference yet.
2. `PATCH /receipts/:id/cancel` per Open Question 2.
3. Web: a Reconciliation tab under Fees (Unit 27's shell), a "Cancel" action on the receipt detail view.

## Out of scope

Automated bank-statement import/matching (Open Question 1); reversing `Payment`/`Invoice` status on cancellation (a human decides that separately, via the existing refund flow if money needs to move).

## Definition of done / checks

- A day's payments correctly split online/counter; an online payment lacking a settlement reference is flagged.
- Cancelling a receipt requires a reason, is audited, and is idempotent (cancelling twice doesn't error oddly).
- RBAC + branch-scope + tenant-isolation tests.
- `progress-tracker.md` updated.

## Next unit

**39 — DPDP Consent, Retention & Delete.**

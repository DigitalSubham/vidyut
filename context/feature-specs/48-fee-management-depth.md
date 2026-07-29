# Unit 48 — Fee Management Depth (Cheque/PDC Tracking, Misc)

Read `apps/api/src/modules/fees/`, `payments/` first. The smallest remaining B1 gap — most of fee management is already built (Units 11–14, 30, 38).

## Open Questions

1. **Multi-currency** — feature-catalog.md itself tags this "(rarely needed)" and P3. **Recommendation: skip entirely** unless the user has an actual international-fee scenario; this is the single lowest-value remaining row in the whole catalog and building it would be pure speculation.

## Goal

Cheque/PDC (post-dated cheque) tracking — the one real remaining gap in fee collection depth.

## Scope

1. `ChequePayment` (`paymentId`, `chequeNo`, `bankName`, `dueDate`, `status: PENDING|CLEARED|BOUNCED`) — attaches to an existing `Payment(mode: CHEQUE)` row rather than replacing it.
2. `PATCH /payments/:id/cheque-status` — mark cleared/bounced; a bounce reopens the linked `Invoice` (reuses Unit 12's existing invoice-status transition logic, doesn't reinvent it).
3. `GET /fees/reports/cheques?status=PENDING` — a due-for-clearing list.

## Out of scope

Multi-currency (Open Question 1).

## Definition of done / checks

- A cheque payment tracks through pending → cleared (or bounced, reopening the invoice) correctly, tested against a real fixture.
- `progress-tracker.md` updated.

## Next unit

**49 — Messaging & Engagement.**

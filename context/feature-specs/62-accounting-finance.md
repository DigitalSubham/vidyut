# Unit 62 — Accounting & Finance (B2, full On-Demand module)

Same On-Demand caveat as Unit 57 — this is real, substantial scope (a general ledger is effectively its own product) and should genuinely wait for confirmed demand more than most other units in this batch.

## Open Questions

1. **Build vs. integrate.** A school likely already uses (or should use) Tally/Zoho Books for real statutory accounting — building a parallel general ledger inside this ERP risks becoming the record of truth for something with real legal/audit weight, duplicating effort a dedicated accounting product already does well. **Recommendation: lead with the Tally/Zoho export integration (already named in the catalog), not a from-scratch ledger.** Only build income/expense tracking + a simple cash book natively if the user confirms schools specifically want to avoid a second accounting tool — flag this as a real build-vs-buy decision for the user, not an engineering default.

## Goal

Resolve Open Question 1 with the user first. If native ledger is confirmed: income/expense tracking, chart of accounts, cash/day/bank books, vendor payables, bank reconciliation, GST handling. If export-first is confirmed: a clean Tally/Zoho Books export of this system's existing fee-collection data (Unit 12) plus a simple expense-entry log to complete the picture.

## Scope (export-first path, the recommended default)

1. `Expense` (`headId`, `amount`, `vendorName?`, `date`, `note`) — a simple log, not a full payables workflow.
2. `GET /accounting/export/tally?from=&to=` — a Tally-XML (or Zoho Books CSV) formatted export of `Payment`/`Invoice`/`Expense` data for the period.
3. GST invoice fields on `Invoice` if the user confirms GST applies to this fee category (many Indian school fees are GST-exempt — confirm, don't assume).

## Out of scope

A full general ledger/chart-of-accounts/trial-balance/financial-statements engine (Open Question 1's non-default path) unless explicitly confirmed; payroll-linked accounting (Unit 63's territory).

## Definition of done / checks

- Export-first path: a real Tally/Zoho import of the exported file succeeds (verified against the actual target tool's import, not just format-shape assumptions).
- `progress-tracker.md` updated, and the build-vs-buy decision explicitly recorded as a founder call, not an engineering default.

## Next unit

**63 — Payroll & Salary.**

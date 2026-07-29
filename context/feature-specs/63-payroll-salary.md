# Unit 63 — Payroll & Salary (B3, full On-Demand module)

Same On-Demand caveat as Unit 57 — payroll has real statutory-compliance weight (PF/ESI/TDS/PT calculations change with Indian tax law) and is a strong candidate to stay export-to-a-real-payroll-tool rather than being rebuilt in-house, similar to Unit 62's reasoning.

## Open Questions

1. **Same build-vs-buy question as Unit 62.** PF/ESI/TDS/PT statutory calculations are a real compliance surface with penalties for getting wrong — a dedicated payroll tool (Paybooks, named in the catalog) already handles this correctly and stays updated with law changes; this codebase re-implementing it is a real liability if it drifts out of compliance. **Recommendation: build salary-structure data + a Paybooks-format export, not a from-scratch statutory calculator** — flag this to the user explicitly as a compliance-risk decision, not an engineering default.

## Goal

Salary structure per staff member, attendance/leave-linked gross computation, and export to a real payroll tool for statutory processing.

## Scope

1. `SalaryStructure` (`staffId`, `basic`, `hra`, `allowances: Json`, `deductions: Json`) — the inputs, not the statutory output.
2. `GET /payroll/export?month=&year=` — gross pay computed from `SalaryStructure` + Unit 09's existing `LeaveRequest`/attendance data (unpaid-leave days reduce gross), formatted for import into Paybooks or similar.
3. Payslip generation **only after** statutory net-pay is computed externally and re-imported (or entered back manually) — this unit doesn't compute statutory deductions itself (Open Question 1).

## Out of scope

Native PF/ESI/TDS/PT calculation (Open Question 1's non-default path, a real compliance liability if wrong); salary disbursement/bank NEFT file generation (depends on which payroll tool is chosen — its own export format, not this codebase's concern).

## Definition of done / checks

- Salary structure CRUDs correctly; the export computes correct gross pay against a real attendance/leave fixture.
- `progress-tracker.md` updated, and the compliance-risk build-vs-buy decision explicitly flagged to the user.

## Next unit

**64 — Inventory, Assets & Procurement.**

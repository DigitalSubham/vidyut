# Unit 55 — Analytics & Reporting (Part F, non-AI)

Read `apps/api/src/modules/dashboard/` (Unit 28) + Unit 53's extension first. Predictive analytics (fee-default/at-risk prediction) is explicitly **excluded** per the user's "leave AI things for now" instruction — it's Part G-adjacent even though listed in Part F.

## Open Questions

1. **Custom report builder** — a real "pick any field, any filter" builder is a meaningfully large UI/query-engine effort (dynamic query construction against RLS'd tables safely is a real security surface, not just a UI problem). **Recommendation:** start with a fixed set of parameterized reports (the ones already named across this catalog: attendance, fees, exam/result, admission, staff), each its own safe, hand-written query — not a generic builder. Revisit a true builder only if schools specifically ask for fields beyond what's offered.
2. **UDISE+ export** — needs the actual UDISE+ file format spec (a real Indian government reporting format) to build against correctly. **Flag to user**: this needs the real format documentation sourced before implementation, not guessed.

## Goal

A fixed set of standard reports, general export, scheduled report email, and a cross-module KPI/MIS summary — everything in Part F except predictive analytics and custom report building.

## Scope

1. `GET /reports/{attendance|fees|exams|admissions|staff}?branchId=&from=&to=` — five parameterized report endpoints, each returning structured JSON + a CSV export variant (`?format=csv`).
2. `GET /reports/kpi-summary` — merges Unit 28's dashboard numbers with the five reports' headline figures into one MIS view.
3. `POST /reports/schedule` — `{ reportType, cadence: WEEKLY|MONTHLY, recipientEmail }`, a BullMQ repeatable job (Unit 14's cron pattern) that emails the CSV (blocked on Unit 40's real email provider — build the scheduling machinery now, the actual send is gated the same way).
4. UDISE+ export — deferred until the real format spec is sourced (Open Question 2).

## Out of scope

A generic custom report builder (Open Question 1); predictive/AI analytics (explicitly excluded from this batch); board-reporting uploads (needs a real CBSE portal spec, same reasoning as UDISE+).

## Definition of done / checks

- All five standard reports return correct data (recomputation-check tests, matching Unit 28's style) and export to CSV correctly.
- Scheduled report job enqueues on the right cadence (tested via BullMQ repeat-job inspection, not a real month-long wait).
- `progress-tracker.md` updated, and UDISE+/board-reporting explicitly flagged as blocked on sourcing the real format spec.

## Next unit

**56 — Super-Admin Console Depth.**

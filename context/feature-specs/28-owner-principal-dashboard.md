# Unit 28 — Owner/Principal Dashboard

Read `AGENTS.md`, `rbac.md` (`dashboard.owner`/`dashboard.principal`), `feature-catalog.md` first. Builds on Unit 27's shell; a KPI surface, not a CRUD module.

## Open Questions

1. **No aggregation endpoints exist yet.** Every number this dashboard needs (collection %, dues, attendance %, admissions funnel) currently requires assembling several existing list endpoints client-side, which is slow and duplicates business logic (e.g., "collection %" already has a formula inside Unit 12's fee reports). **Recommendation:** one small `GET /api/v1/dashboard/summary?branchId=` endpoint that reuses each module's existing service functions internally (Unit 12's `feeReports`, Unit 15's `getDefaulters`/register logic, Unit 10's admissions funnel counts) and returns one combined payload — a thin aggregator, not new business logic; every number it returns must be traceable to an existing, already-tested calculation.
2. **Real-time vs. periodic refresh.** A live dashboard could poll or use websockets; neither exists in this stack yet. **Recommendation:** plain client-side polling (e.g., refetch every 60s or on manual refresh) — a websocket layer is real infra work not justified by a dashboard that updates on human timescales (fee collection, attendance), not sub-second events.

## Goal

A single-screen KPI dashboard for OWNER/PRINCIPAL: collection %, dues, attendance %, admissions funnel — the numbers a school owner actually checks daily.

## Scope

1. **`GET /api/v1/dashboard/summary?branchId=`** — gated `dashboard.owner`/`dashboard.principal` (`rbac.md`: OWNER only for `dashboard.owner`, OWNER+PRINCIPAL for `dashboard.principal` — the endpoint itself just requires either, response is otherwise identical, no per-role field differences to invent). Aggregates: this month's collection % (paid/total invoiced), total dues (Unit 12), today's attendance % (Unit 15), this month's admissions funnel counts (Unit 10: enquiries → applications → converted).
2. **Web screen** (`apps/web-app`, Unit 27's shell): stat cards + one simple chart per KPI (reuse `packages/ui` primitives, no new charting library beyond what Unit 01 already chose).
3. **i18n:** every label via i18n keys.

## Out of scope

Custom/configurable dashboards (`feature-catalog.md` marks "advanced/custom analytics" as on-demand, not core), drill-down detail views beyond linking out to the relevant Unit 27 module screen (e.g., clicking "dues" navigates to the fees module's existing defaulter list, not a new detail view built here), real-time push updates (Open Question 2).

## Definition of done / checks

- `GET /dashboard/summary` returns numbers that match manually re-computing them from the underlying modules (a direct correctness check, not just "the endpoint responds").
- RBAC test: OWNER/PRINCIPAL pass, ADMIN/ACCOUNTANT/TEACHER denied.
- Branch-scope test: a PRINCIPAL on Branch A denied Branch B's summary.
- Lint + typecheck + tests pass; `progress-tracker.md` updated (28 → done, 29 current).

## Next unit

**29 — Public Site + Online Admission + Branded PWA.**

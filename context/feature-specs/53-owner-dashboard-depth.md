# Unit 53 — Owner Dashboard Depth (Enrollment Trends, Staff Metrics)

Read `apps/api/src/modules/dashboard/` (Unit 28) first. A small unit — extends an existing, proven aggregator with two more metrics.

## Open Questions

None real — both metrics are straightforward aggregations over data that already exists (`Enrollment`, `Staff`, `LeaveRequest`).

## Goal

Add enrollment trend (admissions over time) and staff metrics (headcount, leave-utilization) to the existing dashboard summary.

## Scope

1. `GET /dashboard/summary` extended with `enrollmentTrend: { month, count }[]` (last 12 months of new `Enrollment` rows) and `staffMetrics: { headcount, onLeaveToday }`.
2. Web: two more stat cards/a small chart on the existing dashboard page (Unit 28's precedent).

## Out of scope

A dedicated principal-specific dashboard variant (the catalog's "Principal dashboard" row — same data, same screen, role-gated identically to today's owner/principal shared access, not a separate UI).

## Definition of done / checks

- Both new metrics compute correctly against a real seeded fixture (exact-number recomputation check, matching Unit 28's own test style).
- `progress-tracker.md` updated.

## Next unit

**54 — Public Site Depth.**

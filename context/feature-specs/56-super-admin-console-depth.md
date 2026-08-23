# Unit 56 — Super-Admin Console Depth

Read `apps/api/src/modules/platform/` (Units 05, 30) first.

## Open Questions

1. **Support/ticket console** — **Resolved: adopted the spec's own recommendation.** A real `SupportTicket` (`tenantId`, `subject`, `body`, `status`, `priority`, `response`) with tenant-side create/list and platform-side cross-tenant list/respond — no SLA automation, no categorization engine.
2. **Reseller/partner management** — **Still blocked, not built.** No commission-model decision (flat %, tiered, per-plan) was made this session — a business-terms question, not something to guess at. `Partner`/`Commission` remain unmodeled.
3. **Monitoring dashboard** — **Resolved: adopted the spec's own recommendation.** `GET /platform/health-summary` returns real DB/Redis reachability (same checks as `/ready`), real BullMQ queue depth (`getQueueCounts`), and an in-process rolling 15-minute 5xx counter (new `core/error-counter.ts`, ticked from the existing `structuredLogging` middleware) — not a real Sentry API integration, avoiding the second credential dependency the spec explicitly flagged.

## Goal

Global cross-tenant announcements, a basic support console, a monitoring summary view, and (if confirmed) reseller/partner management.

## Scope

1. `GlobalAnnouncement` (`title`, `body`, `targetPlanKeys?: PlanKey[]`) + fan-out to every matching tenant's `Announcement` (reuses Unit 20's model, created by the platform on the tenant's behalf).
2. `SupportTicket` (Open Question 1) + list/respond endpoints, web screen.
3. `GET /platform/health-summary` (Open Question 3) + a super-admin dashboard widget.
4. `Partner`/`Commission` (Open Question 2) — **only after the user confirms the commission model**; otherwise this item stays unbuilt and flagged.

## Out of scope

A full support-ticket SLA/escalation engine; real Sentry API integration (the summary reads structured logs, not Sentry directly, to avoid a second credential dependency).

## Definition of done / checks

- A global announcement reaches every matching tenant's announcement feed.
- Support tickets create/list/respond correctly, tenant-scoped from the tenant's side, cross-tenant-visible from the super-admin side (a deliberate, audited exception to normal RLS isolation — log every super-admin read of ticket content the same way impersonation is logged).
- `progress-tracker.md` updated; reseller/partner explicitly flagged as blocked on a real commission-model decision if not confirmed.

## Next unit

**57 — Transport Management** (first of the fully On-Demand modules).

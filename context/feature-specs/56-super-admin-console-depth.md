# Unit 56 — Super-Admin Console Depth

Read `apps/api/src/modules/platform/` (Units 05, 30) first.

## Open Questions

1. **Support/ticket console** — a real ticketing system (SLA tracking, categorization) is a substantial product in itself. **Recommendation:** v1 = a simple `SupportTicket` (`tenantId`, `subject`, `body`, `status`, `priority`) + list/respond, no SLA automation — enough for early-stage support volume, not a Zendesk clone.
2. **Reseller/partner management** — no reseller program exists yet as a business model decision. **Flag to user**: confirm the commission structure (flat %, tiered, per-plan) before modeling `Partner`/`Commission` — this is a business-terms question, not an engineering guess.
3. **Monitoring dashboard** — Unit 35 already wired Sentry + structured logs; this unit is the *super-admin-facing UI* over that data, not new instrumentation. **Recommendation:** a simple `GET /platform/health-summary` proxying recent error counts from logs (not Sentry's own API — that needs its own credential/SDK the super-admin console would then depend on) + BullMQ queue depth (already inspectable via the existing jobs status endpoint).

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

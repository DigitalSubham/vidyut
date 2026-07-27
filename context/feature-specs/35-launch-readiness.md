# Unit 35 — Launch Readiness

Read `AGENTS.md`, `build-approach.md` §5's own definition-of-done checklist, `prerequisites.md` first. The final unit — an operational checklist pass, not new product code, closing out `build-approach.md`'s "Ship this whole list before selling" goal.

## Open Questions

1. **What "done" means for a checklist unit.** Unlike every prior unit, there's no single Zod schema or endpoint to point at as evidence. **Recommendation:** each checklist item below needs a concrete, verifiable artifact (a script that ran, a dashboard URL, a passing CI run) — not a checked box on faith. If an item can't be verified in this environment (e.g., real Sentry alerting, real staging deploy), say so explicitly and hand it to the user, matching this session's established honesty pattern (e.g., Unit 15b/16/24's verification-gap disclosures) rather than claiming it's done.
2. **Seed/demo tenant scope.** The existing seed script (Unit 02) seeds a bare tenant/branch/session; by Unit 35 there are 20+ modules with real data shapes. **Recommendation:** extend the seed script to populate one realistic demo tenant across every module built (a few classes/sections/students/staff, a term of attendance/marks/report cards, a few invoices/payments, an announcement, a certificate, a timetable) — this is the tenant sales demos and the user's own manual testing will actually use, so it should look like a real, lived-in school, not three placeholder rows.

## Goal

Everything needed to actually launch: a rich seed/demo tenant, observability (Sentry + structured logs), CI/CD, a staging→prod path, and a final launch checklist matching `build-approach.md` §5.

## Scope

1. **Demo tenant seed** (Open Question 2) — extends `packages/db/prisma/seed.ts`.
2. **Sentry integration** — `apps/api`/`apps/worker`/`apps/web-app` error reporting, tenant-tagged per `architecture-context.md`'s own observability note (never leak cross-tenant data into a shared Sentry project's issue titles/breadcrumbs — scrub tenant-identifying fields or use per-tenant tagging consistently).
3. **Structured logging** — a consistent log shape (request id, tenant id, route) across `apps/api`/`apps/worker`, reusing Unit 04's existing `X-Request-Id` middleware.
4. **CI/CD** — GitHub Actions: lint, typecheck, test (incl. the Unit 34 isolation/RBAC checks), build, and a deploy step to staging (per `AGENTS.md`'s locked AWS decision — ECS/Fargate).
5. **Staging → prod runbook** — a documented, followable path (not automated blue/green — that's more infra than a single school SaaS launch needs yet).
6. **Final launch checklist** — a literal checklist in `progress-tracker.md` or a dedicated doc, cross-referencing `build-approach.md` §5's own criteria (a full exam→report-card cycle demoed, fee collection demoed, offline attendance demoed, tenant isolation verified, backups verified per Unit 34).

## Out of scope

Load testing at real scale (no paying-school traffic pattern exists yet to test against realistically), a multi-region/DR setup (`architecture-context.md`'s scalability plan already stages this for later, not launch), a public status page / SLA infrastructure (Enterprise-tier commitment, not needed for the first cohort of schools).

## Definition of done / checks

- The seed script produces a demo tenant that's actually usable for a live sales demo across every built module — verified by walking through it manually, not just "the script runs without error."
- Sentry captures a deliberately-triggered test error from each app (`api`/`worker`/`web-app`) and it's visible in the Sentry project.
- CI runs lint+typecheck+test (including Unit 34's checks) on every PR and blocks merge on failure — verified with a deliberately-failing test PR.
- The staging→prod runbook is followed once, for real, to deploy to staging — not just written.
- The final launch checklist in `progress-tracker.md` is filled in with real evidence (links, command output, screenshots) per item, and any item that couldn't be verified in this environment is explicitly flagged to the user rather than silently marked done.
- `progress-tracker.md` updated (35 → done, **Milestone 9 complete, v1 "Complete Core" build finished**).

## Next unit

None — this is the last unit of the v1 "Complete Core" build plan (`build-approach.md`). On-Demand modules (transport, library, hostel, payroll, etc.) are built only when a paying school asks, per `build-approach.md` §6's trigger rule.

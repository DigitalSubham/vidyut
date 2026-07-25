# School ERP — Project Home

Multi-tenant School ERP SaaS. Entry market **Patna → Patna periphery → major Bihar cities → wider Bihar**.
This folder is the project's home base. All research, planning, and (later) product/design/code artifacts live here.

**Last updated:** 23 July 2026

---

## Current status

**Phase: Ready to build.** Market research complete (verdict: proceed with repricing + narrowed ICP). Product, architecture, mobile white-label, and build approach all decided and documented. The **complete build plan (37 units)** is in `context/progress-tracker.md`, with Unit 01 spec ready. Stack is **server-based** (Express Node API in containers behind a reverse proxy · Next.js web · PostgreSQL+Prisma+RLS · JWT · React Native/Expo · Redis + BullMQ worker), monorepo, multi-tenant, Hindi-first, complete-core-before-selling.

**To start building:** open `AGENTS.md`, then `context/progress-tracker.md` → Unit 01 (`context/feature-specs/01-design-system.md`). Run Phase-0 customer interviews (`docs/market-research/CUSTOMER_DISCOVERY_PLAN.md`) in parallel.

---

## Folder index

```
schoolErp/
├── README.md                     ← you are here (human overview)
├── AGENTS.md                     ← CANONICAL AI build guide (agents read this first)
├── CLAUDE.md                     ← imports AGENTS.md + quick pointers & critical rules
├── context/                      ← ALL build docs live here (spec-driven build context)
│   ├── project-overview.md       ← product scope, users, flows
│   ├── architecture-context.md   ← ★ FULL architecture: system design + mobile white-label + invariants
│   ├── data-model.md             ← ★ buildable schema: entities, relations, enums, RLS, multi-branch
│   ├── rbac.md                   ← roles + permission matrix
│   ├── plans-entitlements.md     ← plan → modules/limits/app_type/price (billing + feature flags)
│   ├── api-conventions.md        ← REST conventions: envelope, errors, auth, pagination, pipeline
│   ├── feature-catalog.md        ← every feature: module-level (per-role, phase-tagged) + MSP list + granular sub-feature appendix
│   ├── build-approach.md         ← complete-CORE-before-selling: v1 scope line vs on-demand modules, build order, launch checklist
│   ├── brand.md                  ← brand (Vidyut): name, palette, logo, tone
│   ├── ui-context.md             ← design system, tokens, theme (light, Hindi-first)
│   ├── code-standards.md         ← coding conventions
│   ├── ai-workflow-rules.md      ← how to scope/sequence work
│   ├── prerequisites.md          ← ★ readiness tracker: locked decisions, accounts, long-lead items, setup checklist
│   ├── progress-tracker.md       ← ★ THE COMPLETE BUILD PLAN + live progress (37 units)
│   └── feature-specs/            ← one spec per build unit (01–05 ready)
└── docs/
    └── market-research/          ← completed feasibility study (8 files)
        ├── BIHAR_MARKET_FEASIBILITY.md   ← START HERE: exec summary, TAM/SAM/SOM, verdict, risks, go/no-go
        ├── PATNA_SCHOOL_PROSPECTS.md     ← prospecting method, area map, priority scoring
        ├── BIHAR_COMPETITOR_ANALYSIS.md  ← national + local competitors, feature & price matrix
        ├── CUSTOMER_DISCOVERY_PLAN.md    ← personas, interview scripts, surveys, onboarding/support/churn
        ├── PRICING_AND_UNIT_ECONOMICS.md ← packages, unit economics, break-even, scenarios
        ├── PATNA_GO_TO_MARKET_PLAN.md    ← sales process, channels, partnerships, pilot, seasonality
        ├── BIHAR_EXPANSION_PLAN.md       ← city scorecard, expansion sequence, 3-yr forecast
        └── SOURCES.md                    ← all citations grouped by topic
```

**Read order for a newcomer:** `docs/market-research/BIHAR_MARKET_FEASIBILITY.md` → `PRICING_AND_UNIT_ECONOMICS.md` → `PATNA_GO_TO_MARKET_PLAN.md` → `context/feature-catalog.md` → `context/build-approach.md` → `context/architecture-context.md` (Part 1 system architecture, Part 2 mobile white-label).

---

## Key decisions locked so far

| Decision | Current position | Confidence |
|---|---|---|
| First market | Patna urban core (Kankarbagh, Boring Rd, Bailey Rd, Ashiana, Rajapur) | Medium — confirm by census |
| First customer (ICP) | Owner-run English-medium private, 200–800 students, CBSE/aspiring, on Excel+WhatsApp | Medium |
| Pricing model | Annual, tiered by student band, + setup fee + pass-through SMS. **Not** flat ₹299/mo | High (economics) |
| Flagship price | Standard ₹15,000–22,000/yr | Medium — test in pilot |
| MSP scope | Students+import, fees, attendance+alerts, exams/report cards, parent comms, parent & teacher apps, web admin, Hindi UI, migration | Medium-High |
| Go-to-market | Founder-led direct sales + referrals + paid pilot | High |
| Architecture | Modular monolith, multi-tenant shared-schema + Postgres RLS (`withTenant` per-txn); hybrid isolation later | High |
| Tech stack | **Server-based**: **Express + TypeScript** API (always-on Node, containerized, behind Nginx/Caddy) · **Next.js** web (all) · **PostgreSQL + Prisma + RLS** (pooled) · **JWT** auth · React Native+Expo · Redis+BullMQ worker · S3-compat · Turborepo monorepo | High |
| Build approach | **Complete CORE before selling**, then on-demand modules (transport/library/hostel/payroll/inventory/AI). See `context/build-approach.md` | High |
| Mobile | Offline-first for attendance/marks; Hindi/Hinglish first-class | High |
| Web apps | Monorepo; 2 Next.js apps (public site SSR; admin+super-admin client-rendered) sharing packages | High |
| Mobile app | **Single role-based app** (parent + teacher/staff + student roles in one), React Native/Expo; school resolved at login | High |
| App delivery (dual-mode) | BOTH by plan: shared themed app (Starter/Standard) + dedicated branded store app (Pro/Enterprise add-on). One codebase, `TENANT_MODE` switch | High |
| App publishing | Play first under our account → decentralised as we scale; EAS build/submit + OTA; branded PWA for day-1; iOS later under school accounts | Medium-High — validate Play review on 2–3 apps |

---

## Open questions to resolve in Phase-0 (field validation)

- [ ] Real count of ICP-fit schools per Patna area (physical/desk census)
- [ ] Actual willingness-to-pay at ₹15k+/yr (behavioural test, not survey)
- [ ] True onboarding time on messy real Excel data
- [ ] Teacher/clerk daily adoption rate
- [ ] Local-vendor real pricing & install base (ethical quote requests)
- [ ] Which report-card formats are non-negotiable

---

## Next steps

1. **Phase-0 validation** — ~30 owner/principal interviews (Mom-Test scripts in `CUSTOMER_DISCOVERY_PLAN.md`), 3–5 field days for the Patna census, ethical competitor demo/quote requests.
2. **Build the prospect CRM** — spreadsheet from the column spec in `PATNA_SCHOOL_PROSPECTS.md §4`.
3. **Define the MSP + prototype** — enough to demo fees → receipt → parent alert → report card.
4. **Run a paid 5–10 school pilot** — convert on the Go/No-Go scorecard (`BIHAR_MARKET_FEASIBILITY.md §9`).
5. **Scale to first 25 → 100** only if the scorecard clears.

---

## Suggested future structure (as the project grows)

```
schoolErp/
├── context/        all build docs (architecture, features, plan, standards) + feature-specs/
├── docs/           market-research/ (research); add design/ (wireframes) later
├── apps/           web-site · web-app · mobile · api · worker (when build starts)
├── packages/       shared types · validation · api-client · ui · config
└── prisma/         schema + migrations + RLS policies
```

*Add folders as needed — nothing here is locked. Update this README's status line and the decisions table whenever something changes.*

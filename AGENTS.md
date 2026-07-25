# AGENTS.md — School ERP (SaaS) · Canonical AI Build Guide

> Single source of truth for any AI/dev agent in this repo. Read this first, then the relevant file in `context/`. Do **not** infer product behavior from scratch — build against the specs in `context/` and `docs/`.

---

## 1. What we're building

A **multi-tenant School ERP SaaS** for private schools, launching in **Patna → Bihar**. Three surfaces over one backend:

- **School web app** (admin/principal/accountant/staff) + **Super-admin console** (we, the SaaS owner).
- **Public marketing/admission site.**
- **One mobile app** (React Native) used by **parents, teachers/staff, and students** via role-based login.

**Who pays and why:** owner-run private schools (200–800 students) buy it to **collect fees faster, cut manual work, and keep parents informed**. Market, pricing, and go-to-market are in `docs/market-research/`. The product feature universe is in `context/feature-catalog.md`.

**Differentiators (never lose these):** reliability · **local + Hindi/Hinglish** · fair pricing · free data migration · **per-school branded apps** (a selling point).

---

## 2. Golden rules (read every time)

1. **Spec-driven.** Build one unit at a time against `context/feature-specs/`. If a requirement is missing/ambiguous, add it as an Open Question in `context/progress-tracker.md` before coding — don't invent.
2. **Complete CORE before selling, then on-demand.** Build the v1 "complete core" (see `context/build-approach.md`), not every module. Defer transport/library/hostel/payroll/inventory/AI until a paying school needs them.
3. **Multi-tenant, always.** Every tenant-owned row has `tenant_id`. **All DB access goes through the `withTenant()` helper** (sets Postgres RLS context per transaction). Never query outside it. A missing tenant scope is a data-leak bug.
4. **Hindi/Hinglish is first-class.** i18n from day one — UI + SMS/WhatsApp templates. Never ship English-only.
5. **Offline-tolerant mobile.** Attendance & marks must work offline and sync. Assume unreliable Bihar connectivity.
6. **Config over code.** Report cards, receipts, fee structures, roles, branding, module access = per-tenant **data/config**. Never per-school custom code (it kills margin).
7. **Money is integer paise.** Never floats. Every fee mutation is ledgered + audited.
   - **Apply the external coding skills** (`coding-skills.md`): React Native code → react-native-best-practices; Next.js/React → vercel-react-best-practices; UI → frontend-design.
8. **Security by default.** JWT + RBAC + RLS; validate all input with Zod at boundaries; audit sensitive actions; least privilege.
9. **Keep it modular.** Server-based (always-on containers); business logic stays framework-agnostic and jobs sit behind an interface, so hosting/runner choices never leak into core code (see §4).
10. **Update `context/progress-tracker.md`** after every completed unit. Progress must reflect reality, not intent.

---

## 3. Tech stack (LOCKED — server-based)

| Layer | Choice |
|---|---|
| Monorepo | **pnpm workspaces + Turborepo**; shared packages: `types`, `validation` (Zod), `api-client`, `ui`, `config` |
| Language | **TypeScript** everywhere, strict mode |
| Backend API | **Express + TypeScript**, always-on **Node process** (`app.listen()`), containerized (Docker) |
| Deployment | **Server-based on AWS** — ECS/Fargate containers behind an **ALB** (reverse proxy) + **RDS** Postgres + **ElastiCache** Redis + **S3** + **SES**; region **ap-south-1 (Mumbai)** |
| Auth | **JWT** access+refresh (rotation); **OTP** for parents, email+password + **2FA** for staff; **argon2** hashing |
| Database | **PostgreSQL + Prisma**; multi-tenant **shared schema + `tenant_id` + RLS** via `withTenant()` |
| DB connection pool | Prisma connection pool per instance; **PgBouncer** in front of Postgres at scale |
| Cache / queue | **Redis** (cache, rate-limit, job queue) |
| Background jobs | **BullMQ** persistent worker behind a `jobs` interface — notifications, PDFs (report cards/receipts via Puppeteer), imports, fee reminders (cron), academic-year rollover, EAS app-builds |
| Storage | **S3-compatible (Cloudflare R2 / S3)** — PDFs, docs, media |
| Web | **Next.js (App Router, TS)** — 2 apps: `web-site` (public, SSR/SEO) + `web-app` (school admin + super-admin, client-rendered route groups) |
| Web UI | Tailwind + shadcn/ui · TanStack Query · react-hook-form + Zod |
| Mobile | **React Native + Expo (TS)** — one role-based app; **EAS Build/Submit + OTA**; dual delivery (shared themed + dedicated per-school); offline via WatermelonDB/SQLite |
| Validation | **Zod** (shared front + back) |
| i18n | **i18next** (Hindi / English / Hinglish) |
| Notifications | FCM (push) · MSG91/Gupshup (SMS+WhatsApp, DLT) · SES (email) |
| Payments | Razorpay (UPI-first) + our platform fee |
| Observability | Sentry + structured logs (tenant-tagged) |
| CI/CD | GitHub Actions (lint, test, **tenant-isolation tests**, build, deploy) |

Full detail in `context/architecture-context.md`.

---

## 4. Deployment (server-based)

Always-on, containerized services — no serverless.
- **API** runs as a long-lived Node process (`app.listen()`) in a Docker container; scale by running more replicas behind the reverse proxy.
- **Worker** is a separate always-on container running the BullMQ jobs; jobs go through a small `jobs` interface (enqueue/process) so callers never depend on the queue directly.
- **Web** (Next.js) runs as Node servers (containers) or on a Node host; **Postgres + Redis** are managed services; a **reverse proxy (Nginx/Caddy)** handles TLS, routing, and rate-limits.
- **DB connections**: standard Prisma pool per instance; add **PgBouncer** in front of Postgres at scale. RLS tenant context is still set **per transaction** via `withTenant()` (`SET LOCAL`).
- **Keep logic framework-agnostic** and jobs behind the interface — clean modularity, not tied to any one host.

---

## 5. Repo structure (target)

```
/ (monorepo — pnpm + turborepo)
├── apps/
│   ├── api/            Express + TS API (always-on Node server)
│   ├── web-site/       Next.js public site + online admission (SSR)
│   ├── web-app/        Next.js school admin + super-admin (route groups)
│   ├── mobile/         React Native + Expo (single role-based app)
│   └── worker/         BullMQ job worker (notifications, PDFs, imports, reminders, rollover, app-builds)
├── packages/
│   ├── types/          shared TS types/DTOs
│   ├── validation/     shared Zod schemas
│   ├── api-client/     typed client generated from OpenAPI
│   ├── ui/             shared UI primitives (where sensible)
│   └── config/         eslint/tsconfig/tailwind shared config
├── prisma/             schema (multi-file) + migrations + RLS policies
├── context/            AI build context — specs, standards, architecture, feature catalog, build approach, progress — READ THESE
├── docs/market-research/  market, pricing, GTM, competitor & customer research
├── AGENTS.md           ← this file
└── CLAUDE.md           imports AGENTS.md + quick pointers
```

---

## 6. Where everything lives

**Build context (read before coding) — all in `context/`:**
- `project-overview.md` — product scope, users, core flows.
- `architecture-context.md` — full architecture: system design + mobile per-school white-label + invariants.
- `data-model.md` — buildable Prisma/Postgres schema: entities, fields, relations, enums, RLS, multi-branch.
- `rbac.md` — roles + permission matrix.
- `plans-entitlements.md` — plan → modules/limits/app_type/price (billing + feature flags).
- `api-conventions.md` — REST conventions: envelope, errors, auth flows, pagination, idempotency, pipeline.
- `feature-catalog.md` — every feature (module-level) + granular sub-feature appendix, role- and phase-tagged.
- `build-approach.md` — v1 complete-core scope line vs on-demand modules.
- `brand.md` — brand (Vidyut): name, palette, logo, tone.
- `coding-skills.md` — external skills to apply while coding (RN best-practices, Vercel React best-practices, frontend-design).
- `prerequisites.md` — readiness tracker: decisions, accounts, long-lead items, setup checklist.
- `code-standards.md` — coding conventions.
- `ai-workflow-rules.md` — how to scope and sequence work.
- `ui-context.md` — design system, theme, tokens, components.
- `progress-tracker.md` — **the plan + live progress** (ordered build units).
- `feature-specs/NN-*.md` — one spec per build unit.

**Reference research:**
- `docs/market-research/*` — market, pricing, GTM, competitors, personas.

---

## 7. Workflow (per build unit)

1. Pick the next unit from `context/progress-tracker.md`.
2. Read its `context/feature-specs/NN-*.md` (create/refine it if thin).
3. Implement the **smallest verifiable increment**; don't mix unrelated boundaries (UI + jobs + multiple APIs in one step = split it).
4. Enforce: input validated (Zod), tenant-scoped (`withTenant`), auth+RBAC checked, money as paise, audited where sensitive, i18n strings not hardcoded.
5. Verify end to end within the unit's scope; run lint + typecheck + tests (incl. tenant-isolation).
6. Update `context/progress-tracker.md` (Completed + any Open Questions/decisions).

**Definition of Done (per unit):** works end to end in scope · no architecture invariant violated · tenant-isolated · typed + validated · progress-tracker updated.

---

## 8. Non-negotiable invariants

1. No DB query outside `withTenant()`. RLS is the safety net, not the only check.
2. Long-running / fan-out work (notifications, PDFs, imports, rollovers, app-builds) runs as **background jobs** (BullMQ worker), never in a request handler.
3. Auth + tenant + RBAC enforced at every mutation boundary.
4. Metadata in Postgres; large artifacts (PDFs/media) in object storage — store only the URL/key in the DB.
5. All user-facing strings go through i18n (Hindi/English).
6. Money as integer paise; fee changes ledgered + audited.
7. Do not modify generated `components/ui/*` (shadcn) — put app logic in app-level components.

---

*Server-based, Hindi-first, tenant-isolated, complete-core-before-selling. When in doubt, prefer the smallest correct increment and update the progress tracker.*

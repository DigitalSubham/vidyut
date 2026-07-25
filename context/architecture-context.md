# Architecture Context — School ERP (SaaS)

> The complete, authoritative architecture for the project — combined into one document. **Part 1** is the system architecture; **Part 2** is the mobile publishing / per-school white-label strategy; **Invariants** are at the end. Full build scope: `build-approach.md` · feature universe: `feature-catalog.md`.

---

# School ERP — System Architecture

**Prepared:** July 2026 · Updated with locked technical decisions · Companion: Part 2 (mobile white-label) below · `build-approach.md`
**Audience:** founder + first engineers.

> **Build philosophy (locked):** we build the **complete core product** before selling (not a bare MVP), then add optional modules on demand. See `build-approach.md` for the exact scope line. The architecture below is sized to support that: a modular monolith that can hold the full core and grow to 1,000+ schools without a rewrite.

> **Cost constraint (from the business plan):** blended cloud cost must stay **under ₹1,500/school/year** (see `../docs/market-research/PRICING_AND_UNIT_ECONOMICS.md`). Decisions favour low per-tenant cost, small-team operability, offline-tolerant mobile, and Hindi-first UX.

---

## 0. Locked decisions (single source of truth)

| Area | Decision |
|---|---|
| Backend | **Node.js + Express + TypeScript** |
| Deployment | **Server-based on AWS** — containerized always-on services on **ECS/Fargate** behind an **ALB** (reverse proxy); Express as a normal Node process (`app.listen()`); BullMQ as a persistent worker; region **ap-south-1 (Mumbai)** |
| Multi-branch | **v1** — school groups / multiple branches under one owner (`branch_id` first-class), consolidated view |
| Database | **PostgreSQL** (with Row-Level Security for tenant isolation) |
| ORM / DB access | **Prisma** (type-safe, migrations) |
| DB connection pool | **Prisma connection pool** per instance; **PgBouncer** in front of Postgres at scale |
| Auth | **JWT** (access + refresh w/ rotation); OTP for parents, password + 2FA for staff |
| Web (all) | **Next.js (TypeScript)** — public site + school admin + super-admin |
| Web app count | **2 Next.js apps**: `web-site` (public, SSR) and `web-app` (admin + super-admin, client-rendered route groups) |
| Mobile | **React Native + Expo (TypeScript)** — **one single, role-based app** (parent + staff + student roles in one app), school resolved by login |
| App delivery | **Dual-mode by plan**: shared themed app (Starter/Standard) + dedicated branded per-school app (Pro/Enterprise). Same codebase, `TENANT_MODE` switch (see Part 2 below) |
| Mobile builds | **Expo EAS Build/Submit** + **EAS OTA Update**; Google Play first |
| Monorepo | **pnpm workspaces + Turborepo**; shared `types` / `api-client` / `ui` / `config` packages |
| Cache / queue | **Redis** + **BullMQ** workers |
| Storage | **S3-compatible** (Cloudflare R2 / AWS S3) |
| Validation | **Zod** (shared front + back) |
| Architecture shape | **Modular monolith** (not microservices) |
| Tenancy | **Multi-tenant, shared schema + `tenant_id` + Postgres RLS**; hybrid isolation for large tenants later |

---

## 1. Architecture Principles

1. **Modular monolith, not microservices.** One deployable Express API, cleanly split into domain modules. A small team ships and debugs a monolith far faster; microservices add ops cost you can't afford early. Keep module boundaries clean so you *can* split later.
2. **Build the complete core before selling.** An ERP is operationally all-or-nothing — a school runs its whole year on it. So v1 is a coherent, complete-enough product (not a thin MVP), with genuinely optional modules deferred to on-demand. The architecture must therefore hold the full core cleanly from day one.
3. **Multi-tenant, shared-schema with row-level isolation.** Lowest cost per school; one codebase serves all tenants; stronger isolation for large tenants later.
4. **Mobile is offline-tolerant.** Bihar connectivity is unreliable — attendance and marks must work offline and sync.
5. **Hindi/Hinglish is first-class** — i18n from day one, including SMS/WhatsApp templates.
6. **API-first.** Web, the mobile app, and super-admin all consume the same versioned REST API. No logic in clients that isn't in the API.
7. **Config over code.** Report-card formats, receipts, fee structures, roles, module toggles, branding = per-tenant **data/config**, never per-school custom code.
8. **Secure by default.** Tenant isolation enforced at the data layer (RLS); every request carries tenant context; everything sensitive is audited.
9. **TypeScript everywhere** with **shared types** across backend, web, and mobile — the biggest bug-reducer for a small team.

---

## 2. High-Level System Diagram

```
                        ┌─────────────────────────────────────────────┐
   CLIENTS              │  Single role-based Mobile App (RN/Expo) 📱   │
                        │   → roles: parent · teacher/staff · student  │
                        │   → modes: shared themed OR dedicated brand  │
                        │  School Web Admin (Next.js) 🖥️               │
                        │  Super-Admin Console (Next.js) ⚙️            │
                        │  Public School Site (Next.js SSR) 🌐         │
                        └───────────────┬─────────────────────────────┘
                                        │ HTTPS · REST/JSON · JWT
                                        ▼
                        ┌─────────────────────────────────────────────┐
                        │     AWS ALB (reverse proxy) · TLS · WAF     │
                        │     rate-limit · routing                    │
                        └───────────────┬─────────────────────────────┘
                                        ▼
        ┌───────────────────────────────────────────────────────────────────┐
        │        BACKEND — Express + TypeScript (Modular Monolith)           │
        │  Auth/JWT │ Tenant-ctx+RBAC │ Students │ Admissions │ Fees │ Attend.│
        │  Exams/ReportCards │ Timetable │ Comms │ Staff/Leave │ Certificates │
        │  Reporting/Dashboards │ Billing/Subscriptions │ Integrations │ Audit │
        │  (+ on-demand: Transport, Library, Hostel, Payroll, Inventory…)     │
        └───┬───────────────┬───────────────┬───────────────┬──────────────┘
            ▼               ▼               ▼               ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐
     │ PostgreSQL │  │   Redis    │  │ S3-compat  │  │  BullMQ Workers       │
     │ (RLS,      │  │ cache +    │  │ storage    │  │  notifications, PDFs, │
     │ tenant_id) │  │ queue      │  │ (R2/S3)    │  │  imports, reminders,  │
     │  via Prisma│  │            │  │            │  │  EAS app-build jobs   │
     └────────────┘  └────────────┘  └────────────┘  └──────────────────────┘
                                        │
                                        ▼  external services
   Razorpay (payments) · MSG91/Gupshup (SMS+WhatsApp) · FCM (push) ·
   SES (email) · Expo EAS (app build/submit/OTA) · Puppeteer (PDF) · Tally export
```

---

## 3. Multi-Tenancy Strategy (most important decision)

**Model: single Postgres database, shared schema, `tenant_id` on every tenant-owned table, enforced by Row-Level Security (RLS).** Industry-recommended low-cost start; one migration path; stronger isolation later for big tenants.

### How it works with Express + Prisma
- Every tenant-scoped table has `tenant_id` (+ `branch_id` for multi-branch groups).
- On each request, an **Express tenant-context middleware** resolves the tenant from the JWT.
- **RLS gotcha (important for your stack):** RLS reads a Postgres session variable (`app.tenant_id`). With connection pooling you must set it **per transaction**, not per connection. So wrap every tenant DB call in a helper that opens a transaction, runs `SET LOCAL app.tenant_id = $tenant`, then executes the Prisma queries. Standardise this in one `withTenant(tenantId, fn)` utility and use it everywhere — never query outside it.
- RLS policies enforce `tenant_id = current_setting('app.tenant_id')` on read/write, so even a missing `WHERE` can't leak across schools (defense in depth; still scope in code too).

### Isolation discipline (non-negotiable)
- Automated tests asserting cross-tenant queries return nothing.
- Code-review checklist: "is this query inside `withTenant`?"
- Super-admin impersonation is explicit, time-boxed, and audited.

### Growth path (hybrid — later, only if needed)
- A large school/group with compliance needs → promote to a **dedicated schema/database**, routed by a tenant resolver. Same code; only the connection resolver changes.

### Multi-branch
- A school group = one tenant (owner) with multiple `branch_id`s; consolidated owner dashboard aggregates across branches; users scoped to branch(es).

**Trade-off:** shared schema means a bad deploy affects all tenants and per-tenant restore is more work. Mitigate with staged rollouts, strong backups, and per-tenant export tooling. The cost/operability win at your scale outweighs it.

---

## 4. Technology Stack (full)

| Layer | Choice | Notes |
|---|---|---|
| Language | **TypeScript** (backend + web + mobile) | Shared types via monorepo |
| Backend framework | **Express** | Unopinionated → impose strict module structure (see §5) + validation |
| ORM | **Prisma** | Migrations, type-safe queries; RLS via `withTenant` helper |
| Database | **PostgreSQL** | RLS, JSONB (custom fields), reliability |
| Validation | **Zod** | Shared request/response schemas front + back |
| Auth | **JWT** access+refresh (rotation); OTP (parents), password+2FA (staff); **argon2** hashing | httpOnly cookies (web) / secure store (mobile) |
| Cache / sessions / broker | **Redis** | Caching, rate limits, BullMQ |
| Async workers | **BullMQ** | Notifications, PDF/report gen, imports, fee reminders, **EAS build jobs** |
| Object storage | **S3-compatible (R2 / S3)** | Docs, report-card PDFs, media; R2 = no egress fees |
| PDF generation | **Puppeteer** (HTML→PDF) | Report cards, receipts, certificates |
| Search | **Postgres full-text** → OpenSearch later | Avoid extra infra early |
| Realtime | **Socket.IO** (later, for chat/live) | Only when messaging ships |
| Web framework | **Next.js (App Router, TS)** | 2 apps: `web-site` (SSR/SEO) + `web-app` (admin+super-admin, client-rendered) |
| Web data / forms / UI | **TanStack Query** · **react-hook-form + Zod** · **Tailwind + shadcn/ui** | Standard productivity stack |
| Mobile | **React Native + Expo (TS)** — one role-based app | Roles inside; school via login; dual delivery mode |
| Mobile data / offline / state | **TanStack Query** · **WatermelonDB/SQLite** (offline) · **Zustand** | Offline attendance/marks |
| Mobile builds | **Expo EAS Build/Submit + EAS OTA Update** | White-label pipeline (see mobile strategy) |
| Payments | **Razorpay** (UPI-first) | + platform-fee revenue line |
| SMS + WhatsApp | **MSG91 / Gupshup** (DLT-compliant) | Pass-through wallet |
| Push | **Firebase Cloud Messaging** | Free |
| Email | **Amazon SES** | Cheap transactional |
| Monorepo | **pnpm workspaces + Turborepo** | Shared `types`/`api-client`/`ui`/`config` |
| API style | **REST + OpenAPI/Swagger**, versioned `/v1` | Consumed by web + mobile + future partners |
| CI/CD | **GitHub Actions** | Lint, test, tenant-isolation tests, build, deploy |
| Hosting | **AWS (server-based)** — ECS/Fargate + **RDS** Postgres + **ElastiCache** Redis + **S3** + **SES** + CloudFront; ap-south-1 | Always-on; India providers (Razorpay, SMS/WhatsApp) alongside |
| Reverse proxy / LB | **AWS ALB** (+ ACM TLS) | TLS, routing, rate limits |
| Observability | **Sentry** + **pino** logs + uptime/metrics | Per-tenant tagged |
| Secrets | Cloud secrets manager / dotenv-vault | Never in code |
| i18n | **i18next** (Hindi / English / Hinglish) | UI + notification templates |
| Testing | **Vitest/Jest** + **Supertest** (API) + **Playwright** (E2E) | Include tenant-isolation + critical-flow tests |

---

## 5. Backend Module Structure (Express + TypeScript)

Express is unopinionated, so **impose structure**. Organize by **domain modules**, each with routes / controller / service / repository, over a shared core. One module never touches another module's tables directly — only via its service.

```
/apps/api/src
  /core          → tenant-context middleware, RBAC, auth/JWT, config, audit, i18n, error handling
  /db            → Prisma client, withTenant() helper, migrations
  /modules
    /students     /admissions   /parents     /staff (records + leave)
    /academics    (sessions, classes, sections, subjects, timetable)
    /attendance   /exams (marks + report cards)  /homework
    /fees         /certificates  /communication  /reporting  /dashboard
    # on-demand (built when a paying school needs them):
    /transport    /library   /hostel   /payroll   /accounting   /inventory   /frontoffice
  /platform
    /billing-subscriptions   (plans, invoices, wallet, metering, platform fee)
    /tenant-management       (provisioning, module/feature toggles, white-label)
    /app-build               (EAS build/submit orchestration for dedicated apps)
    /integrations            (razorpay, msg91/gupshup, fcm, ses, tally)
  /jobs          → BullMQ queues + workers (notifications, report-gen, imports, reminders, rollover, app-builds)
  /shared        → utils, guards, middleware, DTOs (Zod), types
```

**Rules:** all DB access goes through `withTenant()`; every route validates input with Zod; every response typed via shared `types` package; money as integer paise; sensitive mutations write to audit log.

---

## 6. Data Model — Core Entities (overview)

Every tenant-owned table carries `tenant_id` (+ `branch_id` where relevant), timestamps, soft-delete, audit hooks.

```
Tenant (School/Group) ──< Branch ──< AcademicSession
Tenant ──< User ──< Role ──< Permission            (RBAC; roles: owner/principal/admin/accountant/teacher/parent/student…)
Branch ──< Class ──< Section ──< Enrollment >── Student ──< Guardian
Student ──< FeeAssignment >── FeeStructure ──< FeeHead
Student ──< Invoice ──< Payment ──< Receipt         (fees ledger, integer paise)
Student ──< AttendanceRecord                         (date, status, marked_by)
Class/Section ──< Exam ──< MarksEntry >── Student ──> ReportCard
Section ──< TimetablePeriod >── Subject >── TeacherAssignment
Tenant ──< NotificationLog (channel, template, status)
Tenant ──< AuditLog (actor, action, entity, before/after)
--- Platform (not per-school data) ---
Plan ──< Subscription >── Tenant ; Subscription ──< PlatformInvoice ; Wallet(SMS)
FeatureFlag/ModuleToggle per Tenant ; AppBuild (tenant, mode, store status, version)
```

**Notes:** custom fields via JSONB; report-card/receipt templates stored as config per tenant (rendered by Puppeteer); academic-year rollover copies structures + promotes enrollments while preserving history (a top churn point — build and test carefully).

---

## 7. API Design

- **REST + JSON, versioned** (`/api/v1`). OpenAPI/Swagger auto-docs → generate the shared `api-client`.
- **Auth:** JWT access (short-lived) + refresh (rotation). Parent = phone OTP; staff = email/password + 2FA. Tenant + role + branch in token claims.
- **Every request pipeline:** reverse-proxy rate-limit → auth middleware → **tenant-context (`withTenant`)** → RBAC guard → Zod validation → handler. RLS is the last line of defense.
- **RBAC:** permission strings (`fees.collect`, `marks.enter`, `student.edit`); roles are bundles; per-tenant customizable.
- **Idempotency keys** on payments and imports; **pagination/filter/sort** standardized; heavy reports run async (job → notify when ready).
- **Webhooks** (later) for payment confirmations and partner integrations.

---

## 8. Offline-First Mobile Strategy (Bihar-critical)

Teacher attendance and marks must work with no/poor internet:
- **Local store** (WatermelonDB/SQLite) holds today's rosters + pending writes.
- **Optimistic UI:** mark now → save locally → sync when online.
- **Sync engine:** background sync, idempotent client-generated IDs, conflict rules (last-write-wins for attendance; server-authoritative + lock for marks).
- **Delta sync:** pull only changed rosters/config to save data.
- **SMS fallback** for critical alerts (absence, fees) if push fails.
- Parent app mostly online but caches last-known results/fees/notices.

---

## 9. Security, Privacy & Compliance

- **Tenant isolation:** RLS + `withTenant` + automated cross-tenant tests (the #1 security property).
- **Encryption:** TLS in transit; at-rest for DB + object storage; secrets in a manager.
- **AuthN/Z:** OTP + JWT (rotation); 2FA for admin/owner; least-privilege RBAC; session revocation.
- **Audit logs:** fee edits, marks changes, exports, impersonation.
- **DPDP Act (India):** consent for parent comms; retention policy; **data export + delete on request** (also a sales trust signal + accurate Play Data-Safety declaration).
- **Backups & DR:** automated daily Postgres backups + PITR; periodic restore drills; object-storage versioning; per-tenant export tooling; documented runbook.
- **Payments:** never store card data; gateway tokenization; reconcile via webhooks; idempotency.
- **Hardening:** helmet, CORS, per-tenant rate limits, input validation, dependency + secret scanning in CI.

---

## 10. Scalability Plan (staged)

| Stage | Schools | Posture |
|---|---|---|
| **Launch** | 1–20 (pilots) | Single API container + worker + managed Postgres + Redis + storage, one region. Focus: correctness, offline sync, isolation tests. |
| **Growth** | 20–150 | 2–3 API replicas behind the reverse proxy, read replica for reports, worker scaled, caching hot reads, CDN for assets, CI/CD, monitoring/alerting. |
| **Scale** | 150–1,000 | Autoscaling API, Postgres scale + read replicas + partition big tables (attendance/notifications by tenant/date), OpenSearch, queue autoscale, solid usage metering. |
| **Enterprise/hybrid** | large tenants | Promote big schools/groups to dedicated schema/DB via tenant router; extract heaviest module (notifications/reporting) to its own service only if a proven bottleneck. |

**Bottlenecks to watch:** notification fan-out (queue + provider batching), PDF/report generation (async + cache), attendance write bursts at school-start (batch + queue), big-table growth (partition + archive old sessions), **EAS build queue** at onboarding spikes.

---

## 11. DevOps, Environments & Quality

- **Environments:** local → staging → production. Never test on real tenant data. Maintain a **seed/demo tenant** for sales demos.
- **CI/CD (GitHub Actions):** lint, unit tests, **tenant-isolation tests**, build, migrate, deploy; staged/canary rollouts (shared schema = a bad deploy hits everyone).
- **Migrations (Prisma):** versioned, backward-compatible, reviewed; expand-then-contract for zero-downtime.
- **Testing:** unit (services), integration (API + RLS), E2E (fee collection, attendance→alert, report card), load-test school-start bursts.
- **Observability:** Sentry, structured logs with `tenant_id`, uptime alerts, queue monitoring.
- **Feature flags / module toggles:** ship dark; enable per plan/tenant (also gates shared-vs-dedicated app mode).
- **Runbooks:** incident response, per-tenant restore, key rotation, EAS build failures.

---

## 12. Cost Model (ties to unit economics)

| Item | Early (≤50) | Scale (500+) | Note |
|---|---|---|---|
| API hosting | low (shared) | autoscaled | shared across tenants |
| Managed Postgres | 1 instance | + read replicas | biggest fixed cost early |
| Redis | small | managed | cache + queue |
| Object storage | minimal | grows w/ docs | R2 = no egress |
| Push (FCM) | free | free | — |
| SMS/WhatsApp | **pass-through wallet** | pass-through | not our cost |
| Payments | pass-through (+ our platform fee = revenue) | revenue | — |
| EAS builds | per dedicated-app build | per build | bundle into white-label fee |
| **Blended infra/school/yr** | target **< ₹1,500** | target **< ₹1,000** | must hold for margins |

---

## 13. Build Sequence (see `build-approach.md` for full scope)

We build the **complete core** before selling, but in a sensible internal dependency order:

1. **Foundation:** monorepo (Turborepo), Express+TS skeleton, Postgres + Prisma + RLS `withTenant`, JWT/OTP auth, RBAC, i18n (Hindi), Zod, config, audit, backups, Redis/BullMQ, super-admin tenant provisioning + module toggles, notifications engine.
2. **Core academics:** sessions/classes/sections/subjects, students + import, staff + leave, admissions.
3. **Fees** (deep): heads/structures/concessions/fines → collection → receipts → dues/defaulters → ledger → reports → online payment.
4. **Attendance** (offline teacher app) + parent alerts.
5. **Exams + report cards** (deep, board formats) + publish.
6. **Communication** (push/SMS/WhatsApp, announcements) + certificates/TC/ID.
7. **Mobile app** (single role-based; shared mode) + **web admin** + **owner dashboard**.
8. **Super-admin + white-label pipeline** (EAS build/submit, dedicated-app mode, billing).
9. **Harden:** offline sync, isolation tests, backup/restore drill, academic-year rollover, PWA fallback.
10. **Launch** the complete core → then **on-demand modules** (transport, library, hostel, payroll, accounting, inventory, AI) as paying schools require.

---

## 14. Anti-Patterns to Avoid

- ❌ **Microservices on day one** — ops cost you can't fund at 100 schools.
- ❌ **Per-school custom code/branches** — kills margin; use config/templates.
- ❌ **DB queries outside `withTenant` / relying only on app filters** — one bug = cross-school data leak.
- ❌ **Building literally every module before launch** — build the *complete core*, defer truly optional modules (transport/library/hostel/payroll/inventory/AI) to on-demand. (See `build-approach.md`.)
- ❌ **Ignoring offline** — teachers in Bihar abandon apps that need constant internet.
- ❌ **English-only UI** — Hindi/Hinglish is a core differentiator.
- ❌ **Money as floats** — use integer paise.
- ❌ **Weak academic-year rollover** — the classic ERP churn trigger; design + test early.
- ❌ **No data export** — export is both a trust signal and a DPDP requirement.
- ❌ **Setting RLS tenant per-connection instead of per-transaction** — breaks under pooling; always `SET LOCAL` inside `withTenant`.

---

*Conservative and cost-aware to fit the unit economics in `../docs/market-research/PRICING_AND_UNIT_ECONOMICS.md`. Revisit microservice extraction, hybrid tenancy, and managed-cloud upgrades only when real load or a real enterprise customer demands them.*


---

# Mobile Publishing & Per-School White-Label App Strategy

**Prepared:** July 2026 · Part 2 of this architecture document (system architecture is Part 1 above)
**Decision locked by founder:** each onboarded school gets its **own branded app** (same features, school-specific UI/branding), generated from our platform and published to the stores (Play Store first, iOS later). This is a **primary selling point**, not an afterthought.

This document is the finalized plan to do that **without drowning in maintenance or getting suspended** — grounded in Google's official white-label guidance, the Expo EAS build toolchain, and the fact that this model is already proven in our market.

**Evidence labels:** `[Verified]` (official/authoritative) · `[Market]` (observed competitor behaviour) · `[Recommendation]` · `[Field]` (validate before betting on it).

---

## 1. The model is proven in our exact market

- **Lotus Solutions, India** — a Patna/Bihar school-software provider (listed as "Lotus – Online School Software" on Techjockey) — publishes **many individual school apps under one Google Play developer account**, tagline *"Providers of School Management Software."* `[Market]` This is precisely the model you're choosing, running in your backyard.
  - *Honest limit:* the Play developer page renders its app grid via JavaScript, so a plain fetch couldn't enumerate their full app list. The developer profile is confirmed; the per-app details should be captured in a live teardown `[Field]`.
- **White-label per-school apps are an established Indian EdTech model.** Vendors like Proctur, School ERP India and others advertise white-label apps; the market reportedly has **500+ institutes with their own branded iOS/Android apps**, typically ready in **7–10 working days**. `[Market]`

**Conclusion:** the strategy is viable and differentiating. The work is in doing it *compliantly and automatically*.

---

## 2. The one thing that changed my recommendation: Google's 2025 white-label guidance

Google now publishes **"Best Practices for White Label Developers"** and tightened enforcement hard: in 2025 it **rejected ~1.75M apps and banned 80,000+ developer accounts.** `[Verified]`

The critical update: **Google's 2025 guidance advises DECENTRALISED developer accounts — a separate developer profile per client app.** Centralised models (many similar apps under one account) are explicitly flagged as **higher risk for repetitive-content violations and mass suspension.** `[Verified]`

**Why this matters to you:** publishing all school apps under your *one* account (the Lotus approach) works today, but it concentrates risk — if that single account is ever flagged, **every school's app goes down at once.** That's an existential operational risk for a company whose *product* is the app.

So the strategy below is **phased**: move fast under one account early, but architect from day one to shift to per-school accounts as you scale — and definitely for iOS.

---

## 3. Account strategy — the core decision

| Model | How | Pros | Cons | When |
|---|---|---|---|---|
| **A. Centralised** (all apps under YOUR Play account) | You own one Google Play account (₹2k one-time); publish every school app under it | Fastest; no school involvement; you control everything; cheapest per school | Google flags as repetitive-content risk; **single point of failure — one suspension kills all apps**; against 2025 guidance | **Early pilot / first ~20–50 schools**, with strong differentiation + account hygiene |
| **B. Decentralised** (each app under the SCHOOL's own Play account) | School creates a Google Play account (₹2k one-time) or you create one per school; you publish via delegated access | Aligns with Google 2025 guidance; isolates risk (one suspension ≠ all down); "the school truly owns its app" is a **stronger sales pitch** | More onboarding friction; manage many accounts/credentials; ₹2k per school | **The target model as you scale; mandatory for iOS (Apple 4.3)** |
| **C. Hybrid** (recommended) | Start centralised for speed; move steady/high-value schools to their own accounts; decentralised for iOS from the start | Speed now + safety later; upsell "your own account" in premium tier | Two flows to support | **`[Recommendation]`** |

**Recommendation:** **Hybrid, decentralised-leaning.** Launch on Play under your own account to move fast and prove the pipeline, but (a) enforce the compliance checklist below rigorously, and (b) build the pipeline so switching a school to its *own* account is a config change, not a rewrite. Make **"your school's own developer account + app"** a premium tier — it's both safer for you and a better pitch.

---

## 3A. Dual distribution mode — BOTH shared and dedicated, chosen by plan `[Recommendation — locked]`

The product offers **two ways** a school's users get the app, selected by the **plan the school purchases**. Both are the **same codebase** — only the *distribution wrapper* differs. This is a productization + packaging decision, not two products.

### The two modes
| | **Shared themed app** | **Dedicated branded app** |
|---|---|---|
| In store as | Our brand (one Parent app + one Staff app for all schools) | The school's own name/icon/listing |
| How it learns its tenant | User enters **school code** / opens invite deep link at login | Tenant key **baked into the build** |
| Branding | **Runtime dynamic theme** (logo/colors fetched after login) | Baked store identity + runtime theme |
| Onboarding speed | **Instant** (no store work) | Store build + review (PWA covers day 1) |
| Cost to us | ~0 marginal | Build + account + review effort |
| Sold in | Starter / Standard (included) | Pro add-on / Enterprise / "Branded App" add-on |

### One codebase, one switch
- A single config flag **`TENANT_MODE = 'multi' | 'single'`**:
  - `multi` → shared app: prompt for school code / resolve tenant at login.
  - `single` → dedicated build: tenant key compiled in; skip the school-picker.
- **Everything else is identical:** backend, feature modules (plan-gated), business logic, UI, and the OTA update stream.
- **Prerequisite:** build the **runtime dynamic-theming engine first** (so the shared app can look like any school). Once that exists, a dedicated app = same app + baked store identity + tenant key. You are **not** maintaining two apps.

### Plan → app-delivery mapping
| Plan | App delivery | `app_type` |
|---|---|---|
| Starter | Shared themed app | `shared` |
| Standard | Shared themed app | `shared` |
| Pro | Dedicated branded app (optional add-on) | `shared` or `dedicated` |
| Enterprise / Branded-App add-on | Dedicated branded app in store | `dedicated` |

### Onboarding branch logic (super-admin driven)
```
onboard(school, plan):
  create tenant + enable plan modules
  if plan.app_type == 'shared':
      activate tenant → send parents invite to SHARED app (live immediately)
  else:  # 'dedicated'
      provision branded PWA (instant, day-1 access)
      trigger EAS Build/Submit pipeline (branded native app → store review)
      track build/version status in admin panel
```

### Pricing tie-in
- **Shared** = included in Starter/Standard, near-zero marginal cost.
- **Dedicated** = **white-label setup fee + Pro/Enterprise tier or add-on** (covers build/account/review effort). See `../docs/market-research/PRICING_AND_UNIT_ECONOMICS.md` — add a "Branded App" line item.

> Net effect: **every** school gets a real app experience; schools that want **their own app in the store** buy up. One codebase powers both, so the second mode is a packaging/pipeline effort, not a second build project.

---

## 4. Google Play compliance checklist (non-negotiable per app)

From Google's official white-label best practices `[Verified]`. Every generated school app must have:

- ✅ **Unique app title** = the school's name (not "SchoolERP #47").
- ✅ **Unique icon** = the school's logo.
- ✅ **Unique screenshots** = that school's actual branded UI/content.
- ✅ **Unique description** = written about *that* school (no copy-paste boilerplate across apps; no keyword stuffing).
- ✅ **Distinct functionality/value** = real, working login with that school's data — not an empty shell.
- ✅ **Fully functional before submission** = every visible feature works (broken screens = rejection).
- ✅ **Unique applicationId** (e.g., `com.yourco.school.<schoolslug>`).
- ✅ **Valid privacy policy URL** + accurate **Data Safety** declaration (you handle student data — declare it honestly; also a DPDP compliance need).
- ✅ **Clean account hygiene** = accurate developer info, responsive to policy notices, no dormant/broken apps left lying around.

> The failure mode is a "sea of identical apps." Each app looking and reading like a distinct school product is what keeps you on the right side of the Repetitive Content policy. Automate the *generation* of unique listings, don't reuse one listing.

---

## 5. Technical build pipeline (the engine)

**Principle:** one codebase, compiled N ways from per-tenant config. Verified against Expo's white-label/multi-variant docs. `[Verified]`

### 5.1 Codebase
- **React Native + Expo**, in the monorepo, shared with the web via `api-client` / `types` / business-logic packages.
- **Dynamic config: `app.config.js`** (not static `app.json`) so each build's identity is generated programmatically.
- **Per-tenant values via environment variables** injected at build time: app name, `applicationId`/bundle id, icon, splash, color theme, and the **tenant key** (which school's data this app points to).
- **`eas.json` build profiles** manage the white-label variants; each variant = a school.
- Each variant needs a **unique Android applicationId / iOS bundle identifier** (required for separate store listings + simultaneous installs).

### 5.2 The app is a thin branded shell
- All data, features, and enabled modules come from the **multi-tenant backend at runtime** (the app authenticates with its baked-in tenant key). Branding beyond store identity can *also* be server-driven, so most changes never need a rebuild.
- **What's baked into a build:** store identity (name, bundle id, icon/splash) + tenant key + base theme.
- **What's runtime (no rebuild):** enabled modules, feature flags, content, most theming.

### 5.3 Automated build & submit, driven from the super-admin panel
1. SaaS-owner onboards a school → enters name, logo, colors, chooses account (yours vs school's).
2. System generates the tenant config + store-listing assets (unique title/description/screenshots).
3. Triggers **EAS Build** (Android AAB now; iOS later) via API/CI.
4. **EAS Submit** uploads to Google Play (draft → review) with the generated listing.
5. Build/version/review status tracked **per tenant** in the admin panel.
6. On approval → app live; parent invite SMS carries the store link/deep link.

### 5.4 Updates — the maintenance-killer
- **EAS Update (OTA):** JavaScript/UI/most feature changes push **over-the-air to every school app instantly**, bypassing store review. This is what makes hundreds of apps maintainable — one push updates all. `[Verified: Expo OTA]`
- **Rebuild + resubmit only for native changes** (new native module, SDK/Expo upgrade) — infrequent. When needed, the pipeline rebuilds all variants in a queue.

| Change | Mechanism | Store review? | Reach |
|---|---|---|---|
| Branding / enabled modules / config | Backend | No | Instant |
| JS / UI / feature logic | EAS OTA Update | No | All apps, instant |
| Native module / SDK upgrade | EAS rebuild + resubmit | Yes (rare) | Per app |
| New school | Pipeline build + submit | Yes (once) | That school |

### 5.5 Credentials & secrets
- Store per-account Google Play service-account keys (and later Apple App Store Connect API keys) in a **secrets vault**.
- For decentralised accounts, capture the school's Play account access during onboarding.

---

## 6. Instant day-1 access: branded PWA fallback

Store review takes time (hours–days on Play; longer on iOS). Your sales motion needs **same-day go-live**. So:

- On onboarding, immediately provision a **branded installable PWA** (per-school URL, themed, add-to-home-screen). Parents get "the school's app" instantly while the native build is in review.
- Keep the PWA as a permanent lightweight option for schools/parents on low-end devices or where a store app isn't needed.
- The PWA reuses the web codebase + shared packages — near-zero extra cost.

---

## 7. Risk register (specific to per-school apps)

| Risk | P | I | Early warning | Mitigation |
|---|---|---|---|---|
| **Single account suspension takes down ALL apps** | M | **Critical** | Policy warning email; one app flagged | Compliance checklist; move to decentralised accounts as you scale; keep account hygiene spotless; don't put all eggs in one account long-term |
| Repetitive-content rejection | M | H | Rejections on submit | Unique listing/icon/screenshots/description per app; real functionality; test with 2–3 apps first `[Field]` |
| Store review delay slows onboarding | H | M | App not live for days | PWA fallback live day 1; submit early in sales cycle |
| Update fragmentation (schools on old versions) | M | M | Version spread in dashboard | OTA for most updates (all apps at once); forced-update flag; version dashboard |
| Native-update resubmission burden | M | M | Many rebuilds queued | Minimise native changes; batch; automate EAS rebuild-all |
| Credential/account management overhead | M | M | Manual account juggling | Vault + admin-panel automation; standardise onboarding step |
| iOS 4.3 rejection (future) | H (iOS) | H | Apple rejects reskins | Publish under each school's own Apple account; unique listings; validate early |
| Cost per app vs ARPU | M | M | Publishing effort > margin | Automate fully; price white-label into a tier; PWA for low tiers |
| Data Safety / DPDP non-declaration | L | H | Play policy notice | Accurate Data Safety form + privacy policy per app |

---

## 8. Cost per school app `[Estimated]`

| Item | Centralised | Decentralised |
|---|---|---|
| Google Play account | ₹2k one-time (shared) | ₹2k one-time per school (school pays) |
| EAS Build minutes | per build (small) | per build (small) |
| Engineering | ~0 (automated) after pipeline built | ~0 after pipeline built |
| Ongoing updates | OTA = ~0 marginal | OTA = ~0 marginal |
| iOS (later) | Apple ₹8k/yr per account | Apple ₹8k/yr per school account |

Bundle the account + setup effort into a **white-label setup fee** (see `../docs/market-research/PRICING_AND_UNIT_ECONOMICS.md`); OTA keeps ongoing cost near zero, which is what makes the model survive at ₹15–22k ARPU.

---

## 9. Lotus Solutions — reference teardown (to complete in Phase-0) `[Field]`

Confirmed: Patna-linked school-software provider publishing multiple school apps under one Play developer account. To validate in a live teardown during competitor demos:
- How many apps, and are listings genuinely differentiated (icons/screenshots/descriptions)?
- One shared app vs truly separate builds? Parent + teacher split?
- Ratings/reviews and common complaints (support, reliability, updates).
- Pricing and whether white-label app is bundled or an add-on.
- Whether they've had visible suspensions/gaps (search their app history).

Use findings to sharpen both product and the compliance approach.

---

## 10. Final recommendation

1. **Go per-school branded apps — it's a real differentiator and proven in Bihar (Lotus).**
2. **Start on Google Play under your own account** to move fast, **but treat the compliance checklist as mandatory** (unique listing + real functionality per app).
3. **Architect the pipeline for decentralised accounts from day one** (config-driven), and **migrate to per-school accounts as you scale** — Google's 2025 guidance and single-point-of-failure risk both push this way. Make "your own developer account + app" a **premium upsell**.
4. **One Expo codebase → app.config.js + env vars → EAS Build/Submit from the admin panel → EAS OTA for updates.** This is what keeps hundreds of apps maintainable.
5. **Ship a branded PWA on day 1** so onboarding isn't blocked by store review.
6. **Defer iOS**; when you add it, publish under each school's own Apple account to survive Guideline 4.3.
7. **Validate early:** build 2–3 real school apps, push them through Play review, and confirm no repetitive-content flag **before** promising it to every school. `[Field]`

> Bottom line: your instinct is backed by the market — but do it **compliantly (unique listings), automatically (EAS + OTA), and with account isolation as you grow (decentralised)**, or the very thing that's your selling point becomes your single biggest operational risk.

---

*Grounded in Google Play's official white-label best practices, Expo EAS documentation, and observed Indian competitor behaviour. See `../docs/market-research/SOURCES.md` (Mobile/White-label section) for links.*


---

## Invariants

1. No DB access outside `withTenant()`; every tenant row carries `tenant_id`.
2. Long-running work runs as background jobs (BullMQ worker), not in request handlers.
3. Auth + tenant + RBAC enforced at every mutation boundary.
4. Metadata in Postgres; large artifacts in object storage (store key only).
5. Money as integer paise; fee changes ledgered + audited.
6. All user-facing strings via i18n (Hindi/English).
7. Config over code — no per-school custom code; use per-tenant config/templates.
8. RLS tenant context set per-transaction (`SET LOCAL`), never per-connection (breaks under pooling).

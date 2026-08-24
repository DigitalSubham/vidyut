# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

**Start here:** the canonical project guide is **`AGENTS.md`** (imported above) — what we're building (Vidyut, a multi-tenant School ERP SaaS for Bihar private schools), the locked stack, the golden rules, and the per-unit build workflow. Then read the relevant file in `context/`.

## Build context (read before coding)

- **The plan + live progress** → `context/progress-tracker.md` (Units 1–35 = v1 "Complete Core", done; Units 36–69 in progress one at a time; Unit 41 deliberately skipped pending business input).
- Per-unit specs → `context/feature-specs/NN-*.md`. Never invent behavior — if a spec is thin or missing, add an Open Question to the tracker first.
- Architecture / schema / conventions → `context/architecture-context.md` · `data-model.md` · `api-conventions.md` · `rbac.md` · `plans-entitlements.md` · `code-standards.md` · `ui-context.md`.
- Market/GTM research → `docs/market-research/`.

## Commands

```bash
pnpm install                 # pnpm 11, Node >=20 (CI uses 22)
docker compose up -d postgres redis minio   # local infra (Postgres 16, Redis 7, MinIO)
```

Turborepo tasks from the root (`pnpm dev|build|lint|typecheck`) fan out to every workspace. Per-app:

```bash
pnpm --filter @vidyut/api dev        # Express API on :4000 (tsx watch)
pnpm --filter @vidyut/web-app dev    # Next.js admin + super-admin on :3000
pnpm --filter @vidyut/web-site dev   # Next.js public site on :3001
pnpm --filter @vidyut/worker dev     # BullMQ worker
pnpm --filter @vidyut/mobile start   # Expo
```

Database (Prisma lives in `packages/db`, multi-file schema at `prisma/schema/`):

```bash
pnpm --filter @vidyut/db db:migrate:dev
pnpm --filter @vidyut/db db:generate
pnpm --filter @vidyut/db db:seed
```

Tests (vitest; `apps/api` holds the bulk of them, plus `packages/db`). They hit a real Postgres — set `TEST_DATABASE_URL` in `apps/api/.env` (test setup copies it over `DATABASE_URL`). `fileParallelism` is off, so the suite is serial.

```bash
pnpm --filter @vidyut/api test                          # full suite
pnpm --filter @vidyut/api test test/fees.test.ts        # one file
pnpm --filter @vidyut/api test -t "creates an invoice"  # one test by name
```

OpenAPI + typed client:

```bash
pnpm --filter @vidyut/api openapi:export   # writes openapi.json from zod-to-openapi registrations
pnpm --filter @vidyut/api-client generate  # regenerates packages/api-client/src/schema.ts
```

CI (`.github/workflows/ci.yml`) runs migrate deploy → lint → typecheck → `@vidyut/api` tests (which include the static tenant-isolation and RBAC-coverage checks). Note `lint` only exists in the Next.js apps; the API/worker are covered by typecheck + tests.

## Architecture

**Monorepo:** `apps/{api,worker,web-app,web-site,mobile}` + `packages/{db,types,validation,api-client,ui,config}`. Workspace deps are `@vidyut/*` with `workspace:*`; source is consumed directly (`main` points at `src/index.ts`), so there is no build step between packages.

**Tenancy is the core invariant.** `withTenant(tenantId, tx => …)` in `packages/db/src/with-tenant.ts` opens a Prisma transaction and does `set_config('app.tenant_id', …, true)` so the Postgres RLS context is per-transaction (`SET LOCAL`) and never leaks across pooled connections. Every tenant-owned table is read/written through it. The bare `prisma` singleton is only legal for platform-managed models (tenant, platformUser, plan, subscription, moduleToggle, smsWallet, appBuild, platformInvoice, walletTxn) — enforced by `apps/api/src/core/checks/tenant-scope-check.ts`, run as `test/isolation-static.test.ts`. If you add a platform-level table, that allowlist is what you update.

**API layering.** `apps/api/src/app.ts` mounts ~70 feature routers; each `src/modules/<domain>/` is `routes.ts` (Express router + guards) → `controller.ts` (req/res + envelope) → `service.ts` (business logic, `withTenant`). Cross-cutting infra lives in `src/core/`: guards (`auth-guard`, `tenant-context`, `branch-scope`, `require-permission`, `require-self`, `validate`), `envelope.ts` (`ok`/`created`/`list`/`noContent`/`asyncHandler` + error handler), plus config, logger, rate-limit, redis, storage, entitlements, openapi, sentry.

Middleware order is fixed (`context/api-conventions.md`): request-id → rate-limit (global, in `app.ts`) → auth → tenant-context → branch-scope → RBAC permission → Zod validate → handler. New routes follow the same chain; `studentsRouter` is the reference example. Zod schemas are imported from `@vidyut/validation`, never defined inline in a route.

**Jobs.** Anything long-running or fan-out (notifications, PDFs, imports, reminders, rollover, EAS app-builds) is enqueued via `apps/api/src/core/jobs.ts` (`enqueue(name, payload)`), never done in a request handler. Callers never touch the BullMQ queue directly. Processors live in `apps/worker/src/processors/`, external integrations in `apps/worker/src/providers/`.

**Web app.** `apps/web-app/app/(school)/…` is the school-facing admin surface, `app/super-admin/…` the SaaS console; shadcn components in `components/ui/` are generated — do not edit them, put app logic in app-level components. i18n JSON lives in `apps/web-app/locales/{en,hi}/` and `apps/mobile/src/locales/{en,hi}/`; every user-facing string goes through i18next.

## Working rules that bite in this repo

- No Prisma call outside `withTenant()` for tenant data — the static check will fail CI.
- Money is integer paise everywhere; fee mutations are ledgered + audited.
- Never ship an English-only string.
- Update `context/progress-tracker.md` at the end of each unit (Completed + Open Questions) — it is the shared source of truth for what actually exists.

# Unit 04 — API Skeleton + Jobs Infra

Read `AGENTS.md`, `api-conventions.md`, `architecture-context.md` first.

## Goal
A production-shaped Express app (always-on Node server) with the full middleware pipeline, consistent responses, OpenAPI, and the **Redis + BullMQ** background-jobs infrastructure behind a `jobs` interface — so every later module plugs in cleanly.

## Scope
1. **Express app** (`apps/api`): `app.listen()` entry; structured `src/core` (config, error handler, `X-Request-Id`, i18n) + `src/modules` layout per `code-standards.md`.
2. **Middleware pipeline** (from `api-conventions.md`): request-id → rate-limit (Redis) → auth → tenant-context → branch-scope → RBAC → Zod validate → handler. Central **error handler** producing the standard `{ error: { code, message, fields? } }` envelope + status map. helmet + CORS allow-list.
3. **Response helpers**: `ok(data)`, `list(data, meta)`, `created(data)`, `noContent()`.
4. **OpenAPI/Swagger** generation + serve `/api/v1/docs`; wire generation of `packages/api-client`.
5. **Jobs infra**: Redis connection; **BullMQ** queue(s); a **`jobs` interface** (`enqueue(name, payload, opts)`) used by callers; the **worker** app (`apps/worker`) that processes jobs. Implement **one end-to-end job** (e.g., a no-op/email-stub) to prove enqueue→process→status. Long endpoints return `202 { jobId }`; `GET /jobs/:id` returns status.
6. **Object storage**: S3 client wrapper (signed upload/download URLs) — used later for PDFs/docs.
7. **Health**: `GET /health` (liveness) + `GET /ready` (DB/Redis check).
8. **Dockerfiles** for `api` + `worker`; extend docker-compose (Postgres + Redis + api + worker) for local dev.

## Out of scope
Domain modules; super-admin console (Unit 05); real notification providers (stub behind the jobs/notification interface).

## Definition of done / checks
- API boots; `/health` + `/ready` green; `/api/v1/docs` serves OpenAPI.
- A protected sample route exercises the full pipeline (auth→tenant→RBAC→Zod) and returns the standard envelope; errors return the standard error shape + correct status.
- Rate-limit returns `429` with `Retry-After`.
- The sample **job** enqueues and the worker processes it; `202 + jobId` + `GET /jobs/:id` works.
- `docker-compose up` runs api+worker+Postgres+Redis locally.
- Tests: pipeline (200/400/401/403/429), job round-trip, health.
- `progress-tracker.md` updated (04 → done, 05 current).

## Next unit
**05 — Super-Admin: Tenants & Plans.**

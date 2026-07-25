# Code Standards — School ERP

## General

- Keep modules small and single-purpose; name files after responsibility, not technology.
- Fix root causes — no workaround layering.
- Don't mix unrelated concerns in one route/component/service.
- Respect boundaries and invariants in `architecture-context.md`.

## TypeScript

- Strict mode everywhere. Avoid `any`; use explicit interfaces/narrow types.
- Share types/DTOs via `packages/types`; share Zod schemas via `packages/validation`.
- Validate all external input at boundaries (API requests, job payloads, imports) with Zod before trusting it.

## Backend (Express + TS)

- Route handlers are **thin**: validate (Zod) → auth + tenant + RBAC guards → call a module service → return a consistent response shape. No business logic in handlers.
- **All DB access via `withTenant(tenantId, fn)`** (sets RLS context per transaction). Never use the raw Prisma client for tenant data.
- Long-running/fan-out work (notifications, PDFs, imports, rollover, app-builds) → enqueue a **background job**, never inline in a request.
- Module structure: `routes → controller → service → repository`. One module never touches another module's tables directly — go through its service.
- Money as **integer paise**. Every fee mutation writes a ledger entry + audit log.
- Idempotency keys on payments and imports.

## Background jobs (BullMQ worker)

- Enqueue through the shared `jobs` interface — callers never import the queue directly.
- Job handlers live in `apps/worker`; keep them stateless, idempotent, and resilient (retries + backoff).
- Validate job payloads with Zod before processing.
- Access DB inside jobs through the same tenant-scoped `withTenant()` helper.
- Scheduled jobs (e.g., fee reminders) use cron; use idempotency keys to avoid duplicate sends.

## Next.js (web)

- App Router. Default to Server Components; add `"use client"` only for interactivity/hooks/real-time.
- Keep route handlers/server actions focused; push logic to shared modules or the API.
- Data fetching via TanStack Query; forms via react-hook-form + Zod.
- `web-app` = admin + super-admin as route groups with role/tenant guards; `web-site` = public SSR.

## Mobile (React Native + Expo)

- One codebase, role-based navigation resolved after login; `TENANT_MODE` switch for shared vs dedicated.
- Attendance/marks must work offline (local store + optimistic UI + idempotent sync). Small payloads/delta sync for low bandwidth.
- All strings via i18n; Hindi/Hinglish default-capable.

## Styling & UI

- Tailwind + shadcn/ui. Use design tokens from `ui-context.md` / `globals.css` — no hardcoded hex or raw color classes.
- Do **not** modify generated `components/ui/*` (shadcn). Put app logic in app-level components.
- Mobile-first, high-contrast, large tap targets, low-literacy-friendly (icons + Hindi labels).

## Data & Storage

- Metadata/relationships/ledgers → PostgreSQL via Prisma.
- Generated PDFs/media/docs → object storage (R2/Blob); DB stores only the key/URL.
- Don't store large blobs in the DB.

## Security

- Enforce auth + tenant + RBAC before any mutation. Least privilege.
- Hash passwords with argon2; JWT refresh rotation; throttle OTP (Redis).
- Audit sensitive actions (fee edits, marks changes, exports, impersonation).
- DPDP: consent for comms, data export/delete on request, accurate Play Data-Safety.

## i18n

- No hardcoded user-facing strings — all via i18next keys. Provide Hindi + English; support Hinglish where natural. SMS/WhatsApp templates are localized + DLT-approved.

## File Organization (monorepo)

- `apps/api/src/modules/*` — domain modules (routes/controller/service/repository).
- `apps/api/src/core/*` — tenant context, RBAC, auth, config, audit, i18n, errors.
- `apps/api/src/db/*` — Prisma client + `withTenant` helper.
- `trigger/*` — durable jobs.
- `packages/*` — shared types, validation, api-client, ui, config.
- `prisma/*` — schema + migrations + RLS policies.

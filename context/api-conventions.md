# API Conventions — Vidyut

Rules for the Express REST API. All endpoints follow these. Referenced by every backend unit. See `code-standards.md`, `data-model.md`, `rbac.md`.

## Base & versioning
- Base path: **`/api/v1`**. Breaking changes → `/api/v2` (old kept during migration).
- JSON only (`Content-Type: application/json`), UTF-8.
- Every response carries **`X-Request-Id`** (generate if absent) for tracing/logs/Sentry.

## Response envelope
- **Success** (2xx):
  - Single: `{ "data": <object> }`
  - List: `{ "data": [ ... ], "meta": { "page", "pageSize", "total", "totalPages" } }`
  - No content: `204` empty body.
- **Error** (non-2xx): `{ "error": { "code": "<CODE>", "message": "<human msg>", "fields"?: { "<field>": "<msg>" } } }`

## HTTP status usage
`200` ok · `201` created · `204` deleted/no-content · `400` validation · `401` unauthenticated · `403` forbidden (permission/branch/tenant) · `404` not found · `409` conflict (duplicate/state) · `422` semantic error · `429` rate-limited (+ `Retry-After`) · `500` internal.

## Error codes (stable strings, in `packages/types`)
`VALIDATION_ERROR` · `UNAUTHENTICATED` · `FORBIDDEN` · `NOT_FOUND` · `CONFLICT` · `RATE_LIMITED` · `TENANT_SUSPENDED` · `MODULE_DISABLED` · `LIMIT_EXCEEDED` · `PAYMENT_ERROR` · `INTERNAL`.

## Validation
- **Zod** at the boundary (body, query, params) before any logic. Failure → `400 VALIDATION_ERROR` with `fields`.
- Schemas live in `packages/validation`; request+response types shared via `packages/types`.

## Pagination / filtering / sorting
- `?page` (default 1), `?pageSize` (default 20, **max 100**). Return `meta` as above.
- Sort: `?sort=field:asc|desc` (whitelist fields per endpoint).
- Filter: explicit query params per endpoint (e.g., `?classId=…&status=ACTIVE`); no arbitrary query injection.

## Auth (JWT)
- **Access token**: Bearer in `Authorization` header; short-lived (~15 min). Claims: `sub` (userId), `tenantId`, `roles[]`, `branchIds[]`, `type:"access"`.
- **Refresh token**: long-lived (~30 days), **rotating**; stored **hashed** server-side; revocable. `POST /auth/refresh` issues a new pair.
- **Parent (OTP):** `POST /auth/otp/request { phone }` → sends OTP (throttled); `POST /auth/otp/verify { phone, code }` → tokens.
- **Staff (password + 2FA):** `POST /auth/login { email, password }` → if 2FA on, returns `{ challenge }`; `POST /auth/2fa/verify { challenge, code }` → tokens. Passwords hashed with **argon2**.
- **Logout:** `POST /auth/logout` revokes the refresh token.
- **Super-admin** uses a separate auth context (platform), never `withTenant`.

## Request pipeline (every protected route)
`X-Request-Id` → **rate-limit** → **auth** (verify JWT) → **tenant-context** (`withTenant` from `tenantId` claim) → **branch scope** (user's `branchIds`) → **RBAC** (permission check, `rbac.md`) → **Zod validate** → handler → typed response.

## Tenancy, modules, limits (enforced by middleware)
- Suspended tenant → `403 TENANT_SUSPENDED`.
- Disabled module (`ModuleToggle`) → `403 MODULE_DISABLED` (feature also hidden in UI).
- Over plan limit (students/users/branches/storage) → `403 LIMIT_EXCEEDED` + upgrade hint.

## Idempotency & concurrency
- **`Idempotency-Key`** header required on **payments** and **imports**; server dedupes.
- Money fields are integer **paise**; date/time **ISO 8601 UTC**; IDs are `cuid` strings.
- Optimistic concurrency via `updatedAt` where needed; conflicts → `409`.

## Async / long work
- Long/fan-out operations (imports, PDFs, bulk notifications) return **`202 Accepted`** with a `jobId`; client polls `GET /jobs/:id` or receives a notification. Never block the request thread.

## Docs & client
- **OpenAPI/Swagger** generated from routes; the typed **`packages/api-client`** is generated from it and consumed by web + mobile.

## Security
- HTTPS only; `helmet`, CORS allow-list, per-tenant + per-IP rate limits, input validation everywhere.
- 5xx errors → Sentry with `X-Request-Id` + `tenantId` (never log secrets/PII bodies).
- Audit sensitive mutations (`AuditLog`): fees, marks, exports, impersonation.

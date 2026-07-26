# Unit 07 — Students + Bulk Import

Read `AGENTS.md`, `data-model.md` (§5), `rbac.md`, `api-conventions.md`, `code-standards.md`, `architecture-context.md` (§4, jobs) first.

## Open Questions

- `admissionNo` is specified as "unique per branch" but `data-model.md` doesn't define a generation scheme, and the feature catalog only says "auto-generated, configurable format." **Recommendation (proceeding on this basis):** auto-generate a simple sequential number per branch (zero-padded, no configurable prefix/format yet) at creation time, with manual override allowed. A configurable-numbering-format setting is deferred to a later settings/admin unit.
- This unit's own `progress-tracker.md` line says "adm/roll no., **ID basics**." Reading this as the identifying profile fields already on `Student` (admissionNo, rollNo, photoUrl) — **not** ID *card* generation/templates, which is explicitly Unit 21 (Certificates & IDs). Proceeding on that reading.

## Goal

Student records — CRUD plus enrollment into a class/section/session — and a background-job-driven Excel bulk import. The first "real" tenant-owned domain data most schools touch.

## Scope

1. **Models** (`data-model.md` §5): `Student`, `Enrollment` + enums `StudentStatus`, `EnrollmentStatus`. Branch-scoped; RLS per the established pattern.
2. `POST /api/v1/students` — creates a `Student` + an initial `Enrollment` atomically (classId/sectionId required; sessionId defaults to the branch's current session). Zod-validated; `admissionNo` auto-generated per the Open Question above unless supplied.
3. `GET /api/v1/students`, `GET /api/v1/students/:id` — paginated per `api-conventions.md`; filters: classId, sectionId, status, search by name/admissionNo.
4. `PATCH /api/v1/students/:id` (profile fields, status transitions). `DELETE /api/v1/students/:id` is a soft delete (`deletedAt`), gated by `student.delete` (OWNER only).
5. **Bulk import** (background job, per Unit 04's jobs interface): client requests a signed upload URL (`getUploadUrl`), uploads the Excel file directly to object storage, then `POST /api/v1/students/import { fileKey }` enqueues a `students.import` job and returns `202 { jobId }`. The worker parses rows, validates each row through the same Zod schema as single-create, rejects rows whose `admissionNo` already exists in the branch, creates Student+Enrollment per valid row, and stores a per-row result summary (success/error) retrievable via the existing `GET /api/v1/jobs/:id`.
6. **RBAC:** `student.view` (broad — OWNER/PRINCIPAL/ADMIN/ACCOUNTANT/TEACHER) for reads; `student.edit` / `student.import` (OWNER/PRINCIPAL/ADMIN) for mutations/import; `student.delete` (OWNER only).
7. **i18n:** all validation/error strings, including the import job's per-row error messages, via i18n keys.

## Out of scope

Guardian linking (Unit 08 — student creation here doesn't require a guardian), ID **card** generation (Unit 21), fee assignment (Unit 11+), promotion/rollover (Unit 33), document-vault uploads (feature-catalog P1/P2).

## Definition of done / checks

- Student CRUD + enrollment works end to end, tenant + branch isolated.
- Bulk import: enqueue → worker processes a real Excel file with a mix of valid/invalid rows → `202 + jobId` → `GET /jobs/:id` shows accurate success/error counts (a genuine round trip, not mocked).
- Tenant-isolation test: cross-tenant student queries return zero rows both via RLS and via a deliberately unscoped query.
- RBAC test: allowed roles pass, disallowed get `403 FORBIDDEN` (incl. `student.delete` restricted to OWNER).
- Branch-scope test: a TEACHER on Branch A denied Branch B's students.
- Lint + typecheck + tests pass; `progress-tracker.md` updated (07 → done, 08 current).

## Next unit

**08 — Parents/Guardians.**

# Unit 19 — Report Cards

Read `AGENTS.md`, `data-model.md` (§9), `rbac.md`, `api-conventions.md`, `code-standards.md` first. Builds directly on Unit 17's `Exam` and Unit 18's `MarksEntry`.

## Open Questions

1. **`ReportCardTemplate.layout(Json)` shape is undefined.** No document specifies what a template layout actually contains (header fields, grade table columns, signature blocks, etc.) — that's a real design-system-adjacent feature (`ui-context.md` doesn't cover print layouts either). **Recommendation:** follow Unit 12's own receipt-PDF precedent exactly (`context/progress-tracker.md`'s Unit 12 entry: "no PDF infra or tenant-configurable template system exists yet" — stubbed) — `layout` is stored as an opaque `Json` blob (school name/board only interpreted, rest passed through unvalidated), and `ReportCard` generation is a **stub job** (`console.log`, no real Puppeteer render, no `pdfUrl` populated) exactly like `receipt.generate`. Real rendering is deferred to whichever later pass actually builds the PDF pipeline — this unit's job is the data model + workflow (generate → review → publish), not pixel-perfect PDFs.
2. **`ReportCard.examId?/termId`** — `data-model.md` writes this as if "term" might be a separate concept from `Exam`. No `Term` model exists anywhere in the schema; `Exam` already models terms via `ExamType` (`HALF_YEARLY`, `ANNUAL`, etc.). **Recommendation:** no new model — `ReportCard.examId` is required and always points at one `Exam`; "termId" in the doc reads as a stale alternate name for the same field, not a second concept.
3. **Publish audience.** "Publish to parents" (build-approach.md) implies parent-visibility gating exists somewhere, but Unit 08's guardian self-scope endpoints (`GET /guardians/me/children`) don't yet expose report cards. **Recommendation:** this unit ships `publishedAt` as the gate (`null` = not visible to parents) and the actual parent-facing read endpoint — deferred to whichever unit builds the parent app's real surface (Unit 24/25) — is out of scope here; this unit's own definition of done is `publishedAt` being set correctly and enforceable, not a parent UI.

## Goal

Configurable report-card templates and the generate → publish workflow, sitting on top of Unit 18's `MarksEntry`.

## Scope

1. **Models** (`data-model.md` §9): `ReportCardTemplate{ id, tenantId, branchId?, name, board(Board), layout(Json) }` (branchId nullable = tenant-wide default template) and `ReportCard{ id, tenantId, branchId, sessionId, studentId, examId, pdfUrl?, publishedAt? }`. Branch-scoped (except the template's optional tenant-wide row), RLS per the established pattern.
2. `POST/GET/PATCH/DELETE /api/v1/report-card-templates` — gated `reportcard.generate` (OWNER/PRINCIPAL/ADMIN) for mutations, broad reads.
3. `POST /api/v1/report-cards/generate` — `{ examId, templateId, studentIds? }` (omit `studentIds` = every enrolled student for the exam's classes); enqueues one `reportcard.generate` job per student (background, per AGENTS.md's fan-out rule), each creating/upserting a `ReportCard` row per Open Question 1's stub. Gated `reportcard.generate`.
4. `GET /api/v1/report-cards?examId=` — list with generation status (`pdfUrl` populated or not, `publishedAt` set or not).
5. `PATCH /api/v1/report-cards/:id/publish` — sets `publishedAt = now()`, gated `reportcard.publish` (OWNER/PRINCIPAL only, narrower than generate).
6. **RBAC:** `reportcard.generate` (OWNER/PRINCIPAL/ADMIN) for template CRUD + triggering generation; `reportcard.publish` (OWNER/PRINCIPAL) for the narrower publish step.
7. **i18n:** all validation/error strings via i18n keys.

## Out of scope

Real Puppeteer PDF rendering + `pdfUrl` population (deferred per Open Question 1 — same posture as Unit 12's receipts), a parent-facing "view my child's report card" endpoint (Open Question 3 — later mobile/parent unit), board-specific layout validation, bulk-print/download-all.

## Definition of done / checks

- Template CRUD + generate (stub) + publish workflow works end to end, tenant + branch isolated.
- Generating creates one `ReportCard` row per targeted student, each processed via a background job (never inline in the request handler).
- Publishing sets `publishedAt`; an unpublished `ReportCard` is distinguishable from a published one in the list response.
- Tenant-isolation test: cross-tenant template/report-card queries return zero rows both via RLS and via a deliberately unscoped query.
- RBAC test: `reportcard.generate` roles pass on template CRUD + generate trigger, others denied; `reportcard.publish` narrower than `reportcard.generate` (an ADMIN who can generate cannot publish).
- Branch-scope test: an ADMIN on Branch A denied Branch B's report cards.
- Lint + typecheck + tests pass; `progress-tracker.md` updated (19 → done, **Milestone 4 complete**, 20 current).

## Next unit

**20 — Notifications & Announcements.**

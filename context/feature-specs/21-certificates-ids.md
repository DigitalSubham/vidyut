# Unit 21 — Certificates & IDs

Read `AGENTS.md`, `data-model.md` (§11), `rbac.md`, `api-conventions.md`, `code-standards.md` first.

## Open Questions

1. **`CertificateType` enum doesn't cover "IDs."** `data-model.md`'s enum is `{TC, BONAFIDE, CHARACTER, CONDUCT, CUSTOM}`, but this unit's own title and `build-approach.md`'s Milestone 5 scope line ("Certificates: TC, bonafide, character, **ID/admit cards**") both name ID cards and admit cards as in-scope. **Recommendation:** extend the enum with `ID_CARD` and `ADMIT_CARD` — this is a small, additive deviation from the bare doc sketch (same posture as Unit 15's `regularizedById`/Unit 20's `createdById`), not a new model; an ID/admit card is structurally identical to a certificate (a numbered, issued, per-student document), just a different `type`.
2. **Sequential numbering.** No format is specified for `Certificate.number`. **Recommendation:** reuse the established generator pattern (`nextAdmissionNo`/`nextInvoiceNumber`/`nextReceiptNumber` in `packages/db`) — `nextCertificateNumber(tx, branchId, type)`, sequential **per branch per type** (a TC register and a bonafide register are numbered independently, matching how real school registers work), format `"{TYPE}-{branchCode}-{seq}"`.
3. **PDF generation.** Same gap as Unit 19's report cards and Unit 12's receipts. **Recommendation:** identical stub-job posture — `certificate.generate` is a background job (`console.log`, no real Puppeteer render), `pdfUrl` stays unpopulated until a real PDF pipeline exists. Consistent, not a new decision.

## Goal

Issue numbered certificates (TC/bonafide/character/conduct/ID/admit cards) with an issue register, per Milestone 5's "Certificates" scope line.

## Scope

1. **Model** (`data-model.md` §11): `Certificate{ id, tenantId, branchId, studentId, type(CertificateType), number, pdfUrl?, issuedAt, issuedById }` (`issuedById` added — the issuer, needed for the register, mirrors Unit 20's `createdById`). `CertificateType` extended per Open Question 1: `{TC, BONAFIDE, CHARACTER, CONDUCT, ID_CARD, ADMIT_CARD, CUSTOM}`. Branch-scoped, RLS per the established pattern.
2. `POST /api/v1/certificates` — `{ studentId, type, customTitle? }` (`customTitle` only meaningful when `type = CUSTOM`); assigns `number` via `nextCertificateNumber` (Open Question 2), sets `issuedAt = now()`, enqueues the stub PDF job. Gated `certificate.issue`.
3. `GET /api/v1/certificates?studentId=&type=` — the issue register/log, gated `certificate.issue` (a register is itself sensitive — who got what document when — not open to every staff role).
4. **`apps/worker/src/processors/certificate-generate.ts`** — stub job per Open Question 3.
5. **RBAC:** `certificate.issue` (OWNER/PRINCIPAL/ADMIN per `rbac.md`) gates issuance and the register read.
6. **i18n:** all validation/error strings via i18n keys.

## Out of scope

Real PDF rendering (Open Question 3, same stub posture as Units 12/19), a custom certificate-template builder (`feature-catalog.md` names this `[P2]`, later on-demand work), digital signature/e-sign (`[P3]`), re-issuing/voiding a certificate (a v1 register is append-only — corrections are a manual process outside this API for now).

## Definition of done / checks

- Certificate issuance + register read works end to end, tenant + branch isolated.
- `number` is unique and sequential per `(branchId, type)` — verified by issuing two of the same type back to back.
- Issuing enqueues a background PDF job (never inline in the request handler).
- Tenant-isolation test: cross-tenant certificate queries return zero rows both via RLS and via a deliberately unscoped query.
- RBAC test: `certificate.issue` roles (OWNER/PRINCIPAL/ADMIN) pass; TEACHER/ACCOUNTANT denied on both issue and register read.
- Branch-scope test: an ADMIN on Branch A denied issuing against Branch B's student.
- Lint + typecheck + tests pass; `progress-tracker.md` updated (21 → done, **Milestone 5 complete**, 22 current).

## Next unit

**22 — Timetable.**

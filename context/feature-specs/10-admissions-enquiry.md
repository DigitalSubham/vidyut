# Unit 10 — Admissions/Enquiry

Read `AGENTS.md`, `data-model.md` (§6), `rbac.md`, `api-conventions.md`, `code-standards.md`, `architecture-context.md` (repo structure — `apps/web-site`) first.

## Open Questions

- The unit's own scope line mentions an "online admission form," but that's a **public, unauthenticated** parent self-apply form — which belongs on `apps/web-site` (the public marketing/admission site), an app that doesn't exist until Unit 29 (Milestone 7). **Recommendation (proceeding on this basis):** this unit builds the full `Enquiry`/`Application` backend + a **staff-facing** admin UI in `apps/web-app` (front desk logs walk-in/phone enquiries and applications, reviews them, converts to student); the actual public self-apply form is deferred to Unit 29, when `web-site` exists to host it. The backend API is written so Unit 29 can point a public form at it later without changes.
- `Application` in `data-model.md` §6 has no `studentId` back-reference, so a converted application has no durable link to the `Student` it produced. **Recommendation:** add a nullable `Application.studentId`, set once on conversion — a small, justified addition (same category as Unit 03's `RefreshToken`), not a new invented feature. Flagging rather than silently adding, since it's a schema change beyond the sketch.
- `Application.regFeeInvoiceId?` references an `Invoice`, which doesn't exist until Fees (Unit 11+). **Recommendation:** omit this column for now and add it via migration when Unit 12 introduces `Invoice`; registration-fee collection at apply-time is explicitly out of scope until then.

## Goal

Enquiry → application → convert-to-student pipeline for the admissions front desk.

## Scope

1. **Models** (`data-model.md` §6, plus the `Application.studentId` addition above): `Enquiry`, `Application` + enums `EnquiryStage`, `ApplicationStatus`. Branch-scoped; RLS per the established pattern.
2. `POST/GET/PATCH /api/v1/enquiries` (childName, guardianName, phone, source, stage, assignedToId, followUpAt) — stage transitions NEW→CONTACTED→VISITED→APPLIED→ADMITTED→LOST. Gated by `admission.manage`.
3. `POST/GET/PATCH /api/v1/applications` (enquiryId?, formData Json, classAppliedId, status) — gated by `admission.manage`. `formData` is an opaque, Zod-validated-as-JSON blob (config-over-code, per invariant #6: the actual form fields are school-configurable, not hardcoded); v1 ships one fixed minimal shape — child name, DOB, guardian contact, prior school.
4. `POST /api/v1/applications/:id/convert` — creates `Student` + `Enrollment` (reusing Unit 07's creation logic, not a duplicate implementation), sets `Application.status = CONFIRMED` and `Application.studentId`. Gated by `admission.manage`.
5. **i18n:** all validation/error strings, plus stage/status labels, via i18n keys.

## Out of scope

Public self-apply form (deferred to Unit 29, see Open Questions), registration-fee collection (deferred to post-Unit 12, see Open Questions), entrance test/interview scheduling, merit lists/seat allotment (feature-catalog P2).

## Definition of done / checks

- Enquiry → application → convert-to-student works end to end through the staff admin UI, tenant + branch isolated.
- Converting an application creates a real, correctly-enrolled `Student` (reusing Unit 07's path).
- Tenant-isolation test: cross-tenant enquiry/application queries return zero rows both via RLS and via a deliberately unscoped query.
- RBAC test: `admission.manage` roles (OWNER/PRINCIPAL/ADMIN) pass; TEACHER/ACCOUNTANT get `403 FORBIDDEN`.
- Branch-scope test: an ADMIN on Branch A denied Branch B's enquiries.
- Lint + typecheck + tests pass; `progress-tracker.md` updated (10 → done; **Milestone 1 complete** → Unit 11 current).

## Next unit

**11 — Fee Setup** (Milestone 2 begins).

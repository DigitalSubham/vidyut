# Unit 50 — Certificates Depth (Custom Builder, Bulk IDs, DMS, e-Sign)

Read `apps/api/src/modules/certificates/` (Unit 21) + Unit 42's `Certificate.staffId` schema change first (this unit depends on that landing first, since ID cards span both students and staff).

## Open Questions

1. **Custom certificate builder — resolved, built as recommended.** `CertificateTemplate` stores a plain-text/simple-HTML `body` with `{{studentName}}`/`{{className}}`/`{{issueDate}}`/etc. placeholder tokens, substituted by a pure `renderCertificateTemplate()` function at generation time — not a drag-and-drop designer. Revisit only if a paying school explicitly asks for visual layout control.
2. **e-Sign — resolved, built as recommended, gated stub.** `POST /certificates/:id/request-signature` sets `signatureStatus=REQUESTED` and enqueues a `certificate.esign-request` job; the worker adapter checks `ESIGN_API_KEY`/`ESIGN_PROVIDER_URL` exactly like Unit 40's SMS/WhatsApp adapters — no credentials exist in this environment, so it logs a clearly-labeled stub and leaves the request pending (never fakes `SIGNED`). `POST /certificates/esign-webhook` (shared-secret-checked, unauthenticated route since it's the provider calling us) is the real completion path once a provider is actually wired up.
3. **UI scope — web only.** Certificate templates, bulk ID generation, and the DMS document list are office/admin tasks (OWNER/ADMIN/PRINCIPAL) with no mobile self-service angle — no mobile screens this unit.

## Goal

A template-driven certificate builder, bulk ID card printing with QR/photo, a document management store, and (gated) e-sign.

## Scope

1. `CertificateTemplate` (Open Question 1) — token-based, reused for TC/Bonafide/ID cards alike.
2. `POST /certificates/bulk-ids?sectionId=` — generates one ID card per enrolled student in a section, each with a QR code (encodes `Student.id` + `admissionNo`) and photo, in one PDF batch job.
3. `Document` model (`ownerType: STUDENT|STAFF`, `ownerId`, `key`, `label`, `tags: string[]`) — the DMS Unit 07/42's ad-hoc document fields were deliberately kept simple; this is the actual central store, and Unit 07/42's fields could migrate to reference it later (not required for this unit).
4. e-sign integration point (Open Question 2), gated on provider credentials.

## Out of scope

A visual template designer (Open Question 1); a specific e-sign provider's full API surface beyond "request a signature, receive a webhook."

## Definition of done / checks

- A template with tokens renders correctly for a real student's data.
- Bulk ID generation produces one correctly-populated PDF per student in a section.
- Documents upload/tag/retrieve correctly, scoped to the right tenant/owner.
- `progress-tracker.md` updated.

## Next unit

**51 — Web Admin Panel: Remaining Modules.**

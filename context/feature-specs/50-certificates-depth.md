# Unit 50 — Certificates Depth (Custom Builder, Bulk IDs, DMS, e-Sign)

Read `apps/api/src/modules/certificates/` (Unit 21) + Unit 42's `Certificate.staffId` schema change first (this unit depends on that landing first, since ID cards span both students and staff).

## Open Questions

1. **Custom certificate builder** — a full WYSIWYG template designer is a real, substantial UI effort. **Recommendation:** v1 = a small set of placeholder tokens (`{{studentName}}`, `{{className}}`, `{{issueDate}}`, etc.) an OWNER fills into a plain-text/simple-HTML template stored on `ReportCardTemplate`-like model, rendered at PDF-generation time — not a drag-and-drop designer. Confirm this is enough before investing in a real visual builder.
2. **e-Sign** — needs a real e-sign provider (DigiSigner/Zoho Sign, named in the catalog) and a paid account. **Recommendation:** build the integration point (a "request signature" button that calls out to a provider webhook) gated on credentials, same honest-stub posture as Units 31/40 — don't fake a signed PDF.

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

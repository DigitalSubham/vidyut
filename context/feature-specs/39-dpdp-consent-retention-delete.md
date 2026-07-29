# Unit 39 — DPDP Consent, Retention & Delete-on-Request

Read Unit 34's `GET /me/data-export` (`apps/api/src/modules/me/`) first — export is done; this unit is the other three DPDP pillars.

## Open Questions

1. **Consent capture** — DPDP requires informed consent for processing a minor's data (most students are minors; the "data principal" is legally the parent/guardian). **Recommendation:** a single consent checkbox at guardian-invite time (Unit 08's existing invite flow) + a `Guardian.consentedAt` timestamp — not a granular per-purpose consent matrix, which is legally more thorough than a Bihar private school realistically needs at this stage and is genuinely a legal-review item, not an engineering guess. **Flag to the user: this needs real legal sign-off on the consent text before shipping, not just an engineering implementation.**
2. **Retention policy** — DPDP requires data not be kept longer than necessary. **Recommendation:** don't auto-delete anything (a school's own record-keeping obligations under education law likely *require* retaining alumni records for years — auto-deletion could violate a different law). Instead: a documented retention policy statement (in `context/dpdp-policy.md`, not code) + the *mechanism* to act on a delete request when one comes in (Open Question 3), which is the actually-actionable engineering piece.
3. **Delete-on-request** — a real, hard-delete capability, distinct from the existing soft-delete (`deletedAt`) convention used everywhere. **Recommendation:** `POST /me/data-delete-request` (self-scoped, same resolver as the export endpoint) creates a `DataDeletionRequest` record for OWNER review (never auto-executes — deleting a student's attendance/marks/fee history has real business-record implications the school, not the parent, must ultimately authorize) + `POST /platform/tenants/:id/data-deletion-requests/:id/execute` for the OWNER to actually purge after reviewing.

## Goal

Real consent capture at invite time, a documented retention policy, and a request→review→execute delete pipeline (not automatic, not fake).

## Scope

1. `Guardian.consentedAt` field + a consent checkbox in Unit 08's invite flow.
2. `context/dpdp-policy.md` — the retention statement (new doc, not code).
3. `DataDeletionRequest` model + `POST /me/data-delete-request` (self-scoped) + OWNER review/execute endpoints.
4. Web: a "Data requests" screen for OWNER to review pending deletion requests.

## Out of scope

Granular per-purpose consent; automatic time-based deletion; deleting across a legally-mandated retention window (school leaving-certificate records etc. — flagged to the user as a legal question, not assumed).

## Definition of done / checks

- Consent is captured and stored at invite time.
- A delete request is created, reviewable, and only purges data on explicit OWNER execution — never automatically.
- Tenant-isolation + self-scope tests.
- **Explicitly flagged to the user**: the consent text and retention windows need real legal review before this is DPDP-compliant in practice — this unit builds the mechanism, not the legal sign-off.
- `progress-tracker.md` updated.

## Next unit

**40 — Real Notification Providers.**

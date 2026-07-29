# DPDP Policy — Consent, Retention & Deletion (Unit 39)

> **⚠️ This document is an engineering starting point, not a legal opinion.** The consent text, the retention windows below, and the overall approach need real legal review (India's Digital Personal Data Protection Act, 2023, plus any Bihar/education-sector-specific record-keeping rules) before this is DPDP-compliant in practice. Do not treat anything here as sign-off.

## What this covers

Three of the four DPDP pillars this product needs:

1. **Data export** — done (Unit 34, `GET /me/data-export`).
2. **Consent capture** — this unit.
3. **Retention policy** — this document.
4. **Delete-on-request** — this unit.

## Consent capture

Most students are minors; the "data principal" under DPDP is legally the parent/guardian, not the child. `POST /guardians/:id/invite` now requires an explicit `consent: true` in the request body before a guardian's login is created — this sets `Guardian.consentedAt`.

**What this is:** a single yes/no checkbox at invite time, not a granular per-purpose consent matrix.

**What this is not:** legally reviewed consent language. The checkbox currently has no bound legal text — the web UI needs a real, lawyer-approved consent statement (what data is collected, for what purpose, how it's used, how to withdraw) before this checkbox means anything legally. **Flagged explicitly: get real legal text before relying on this for compliance.**

## Retention policy

DPDP requires data not be kept longer than necessary for the purpose it was collected for. This product does **not** auto-delete anything, for a specific reason: a school's own record-keeping obligations under Indian education law (state education board rules, RTE Act requirements, board affiliation conditions) likely *require* retaining student academic records — attendance, marks, report cards, transfer/leaving certificates — for years after a student leaves, sometimes indefinitely. Auto-deleting on a DPDP timer could put the school in violation of a *different* law.

**Working policy (needs legal confirmation):**

| Data category | Retention approach |
|---|---|
| Active student academic/attendance/fee records | Kept for the duration of enrollment + a school-decided post-leaving period (commonly 5–7 years for board/audit purposes — **confirm the actual number with the school's own record-keeping policy, not assumed**). |
| Alumni core academic records (marks, certificates issued) | Long-term retention likely required by board affiliation rules — **do not auto-delete**. |
| Guardian contact details (phone/email not tied to an active enrollment) | Reasonable candidate for deletion on request once no student relationship remains — see Delete-on-request below. |
| Login credentials / session data | Deleted or deactivated when a user requests deletion or an account is no longer needed. |
| Payment/financial records | Subject to separate financial record-keeping law (typically longer retention than DPDP alone would require) — **do not delete without confirming this doesn't violate tax/audit obligations**. |

## Delete-on-request

Since blanket auto-deletion isn't safe, deletion is a **request → human review → explicit execute** pipeline, never automatic:

1. Any user can call `POST /me/data-delete-request` (self-scoped) to create a `DataDeletionRequest`.
2. An OWNER reviews it — `GET /data-deletion-requests` lists pending requests, `PATCH /data-deletion-requests/:id/reject` rejects one with a required note.
3. Only an OWNER can `POST /data-deletion-requests/:id/execute` — and even then, execution is deliberately narrow: it anonymizes the requester's own directly-identifying fields (name, phone, email, password) on their `User` row and any linked `Guardian` row. **It does not delete the student's academic/attendance/fee history** — those remain under the school's own record-keeping obligations, matching the retention table above.

This is the actionable engineering piece. What it is *not*: a determination of when it's legally correct to reject a deletion request, or a guarantee that the anonymize-only approach satisfies DPDP's "right to erasure" for every case — that determination needs legal review, particularly for a guardian whose only child has fully left the school with no ongoing academic record dependency.

## Open items requiring real (non-engineering) decisions

- [ ] Legal review of the consent checkbox's bound text.
- [ ] Confirmed retention windows per data category (the table above is a reasonable engineering default, not a legal number).
- [ ] Confirmation that anonymize-in-place (rather than full row deletion) satisfies DPDP's erasure requirement for a guardian with no remaining active student relationship.
- [ ] A designated Data Protection Officer / grievance contact, if required at this school's scale under the Act.

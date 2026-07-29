# Unit 41 — Admissions Depth (CRM Funnel Completion)

Read `apps/api/src/modules/admissions/` (Unit 10) first. Fills out A2's remaining ❌ rows on top of the existing Enquiry→Application→Student pipeline.

## Open Questions

1. **Registration/application fee at apply time** — this is genuinely just Unit 13's online-payment flow triggered from the public admission form (Unit 29) instead of an existing invoice. **Recommendation:** reuse `createStubOrder`/webhook verbatim; the "invoice" is a one-off `FeeHead(type: ADMISSION)` charge tied to the `Application`, not the student (no `Student` exists yet at apply time) — needs `Application.regFeePaymentId` (nullable), not a new payment model.
2. **Entrance test/interview scheduling and merit list** — real scope questions for the school, not engineering guesses: does every applicant get a slot, or only shortlisted ones? Is merit rank computed from a test score, an interview score, or both? **Flag to user**: this needs a real school's actual admission process described before building a rigid workflow around a guessed one — recommend building the data model (slot, score fields) and a manual staff-driven ranking view first, not an automated merit algorithm.

## Goal

Complete the admission funnel: pay-to-apply, schedule tests/interviews, rank and offer seats, and nudge stalled leads.

## Scope

1. `Application.regFeePaymentId` + public payment step on the admission form.
2. `ApplicationSlot` (test/interview date+time) + staff scheduling endpoint.
3. `Application.score` (manual entry) + a ranked list view (sort by score, no auto-ranking algorithm — Open Question 2).
4. Offer letter: a simple templated PDF (stub job, same posture as every other PDF in this codebase) triggered on `Application.status = OFFERED`.
5. Document checklist: a `requiredDocs: string[]` on `Application` + a staff checkbox UI to track what's been collected.
6. Enquiry follow-up reminders: reuse Unit 14's cron-scan pattern against `Enquiry.followUpAt`.

## Out of scope

An automated ranking/scoring algorithm (Open Question 2); a payment-gateway-integrated waitlist auto-promotion; RTE/quota-seat logic (a real, Bihar-specific regulatory question to confirm with the user before encoding it).

## Definition of done / checks

- A public applicant can pay a registration fee at apply time; staff can schedule a slot, record a score, generate an offer, and convert to student.
- Enquiry follow-up reminders fire on schedule (worker test).
- Tenant-isolation + RBAC tests.
- `progress-tracker.md` updated.

## Next unit

**42 — Staff HR Depth.**

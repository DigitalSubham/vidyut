# Unit 69 — Platform Extras

The catch-all for everything else found missing on re-audit: security depth, SSO, webhooks, help/onboarding, feedback capture, per-role dashboards, white-label branding admin UI, and a shared template library. Each item here is independent of the others — implement in any order, or drop any that don't matter to the user.

## Open Questions

1. **Password policy** — what's actually required (minimum length exists via Zod's `.min(8)`, Unit 03)? Is a complexity requirement (mixed case/numbers/symbols) or a rotation policy wanted? **Recommendation:** confirm a real policy with the user — a stricter policy than needed just adds support friction (users who can't set a memorable password); a weaker one is a real security gap. Don't guess.
2. **SSO** — Google/Microsoft sign-in for staff needs an OAuth app registration (a real account setup step, same category as every other gated-external-account item in this batch).
3. **Webhooks/developer API** — no partner/integrator has asked for this yet. **Recommendation:** build only if/when a specific large-school or partner integration actually requests it (`build-approach.md` §6's own trigger rule applies here more than almost anywhere else in this batch).
4. **White-label branding admin UI** — Unit 31 made the mobile app's identity technically parameterizable; this unit is the missing super-admin screen to actually *set* those parameters (logo upload, color picker, domain) per tenant.

## Goal

A real, confirmed password policy; optional Google/Microsoft SSO for staff; an audit-logged security review; in-app onboarding tours; a feedback capture point; per-role (teacher/accountant) dashboard views; and the white-label branding admin screen.

## Scope

1. Password policy: confirm with user (Open Question 1), encode as a Zod refinement in `auth.ts` (Unit 03's existing schema file).
2. `GET /auth/login/google` / `/microsoft` OAuth flow (Open Question 2) — additive to the existing email+password login, not a replacement.
3. Security audit: a documented pass reviewing JWT expiry times, refresh-token rotation (already built, Unit 03), rate-limit thresholds (Unit 04) against real production traffic assumptions — a review, not new code, unless it finds a real gap.
4. `OnboardingTour` — a simple client-side state flag per user (`hasSeenTour: boolean` on `User`) + a scripted tooltip sequence in the web app (no backend content-management needed, tour steps are hardcoded in the frontend).
5. `FeedbackSubmission` (`userId`, `category`, `body`) + a simple list view for the super-admin (reuses Unit 56's support-ticket pattern, could even be the same model with a `type: FEEDBACK` tag rather than a parallel one).
6. `GET /dashboard/teacher-summary`, `GET /dashboard/accountant-summary` — role-specific slices of data already computed elsewhere (a teacher's own attendance-marked %, homework posted count; an accountant's own collection-today figure) — thin, reuses Unit 28/53's existing aggregation logic, not new business logic.
7. White-label branding admin screen: `PATCH /platform/tenants/:id/branding` (`logoUrl`, `primaryColor`, `customDomain?`) + a super-admin UI form (Open Question 4).
8. Shared cross-tenant template library: `GET /platform/templates/{report-cards|receipts|certificates}` — a super-admin-curated set of default `ReportCardTemplate`/certificate-template rows (Units 19/50) a new tenant can clone from at onboarding, instead of starting from a blank template. Reuses the existing template models; this is just a "seed from a shared library" action, not a new templating engine.
9. Webhooks/developer API (Open Question 3) — **only build if the trigger condition is actually met**; otherwise this item stays explicitly deferred, same as every other On-Demand item in this batch.

## Out of scope

A generic developer-API/webhook platform without a real partner request (Open Question 3); a rich, CMS-driven onboarding-tour content system (hardcoded steps are enough).

## Definition of done / checks

- Password policy enforced per the confirmed decision; SSO login works against a real Google/Microsoft test app (once the user provides one).
- Teacher/accountant dashboard slices return correct, real numbers.
- Branding fields save and are readable by Unit 31's app-config pipeline.
- `progress-tracker.md` updated — **this closes the full re-audited gap list from the previous spec-writing pass.** Placement/career management (H-bis) remains explicitly out of scope — it's primarily a higher-ed feature, minor even in the original catalog's own assessment for K-12, and no spec is written for it in this batch.

## Decisions made during build

- Open Question 1 (password policy): **the user explicitly confirmed length-only, no complexity requirement, no rotation policy** — the existing `z.string().min(8)` (Unit 03) already implements this, no code change needed. Documented in `context/security-audit-unit69.md`.
- Open Question 2 (SSO): **deferred** — needs a real Google/Microsoft OAuth app registration, a real account-setup step this session cannot self-certify (same category as every other gated-integration deferral: Unit 13's Razorpay, Unit 50's e-sign, Unit 57's fuel-card, etc.).
- Open Question 3 (webhooks/developer API): **deferred** — no partner/integrator has asked for this yet, per the spec's own trigger rule and `build-approach.md` §6.
- Open Question 4 (branding UI): built — `PATCH /platform/tenants/:id/branding` + a super-admin form on the existing tenant detail page.
- Scope #3 (security audit): a review pass, no gaps found — `context/security-audit-unit69.md` documents JWT expiry (15min access / 30d refresh), refresh-token rotation-on-use, and rate-limit thresholds (300 req/min/IP), all already correctly built in earlier units.
- Scope #6 (dashboard slices): backend only, no dedicated new web page — `GET /dashboard/teacher-summary`/`accountant-summary` self-scope via the caller's own `Staff` row; the natural home for these is the existing mobile Teacher/Parent app screens (`apps/mobile/src/screens/TeacherHomeScreen.tsx`), not a new web-admin page, since teachers/accountants primarily use the app day-to-day.
- Scope #8 (shared cross-tenant template library): **not built this pass** — it needs real curated report-card/certificate template content to seed from, which doesn't exist yet; this is a content-authoring task, not a code gap. Flagged rather than building an empty seeding endpoint with nothing to seed.

## Next unit

None remaining in this batch. Full remaining-catalog coverage (excluding Part G/AI) is now spec-complete across Units 36–69, with placement/career management (H-bis) the one deliberately-unspecced row, flagged here rather than silently dropped.

# Unit 29 — Public Site + Online Admission + Branded PWA

Read `AGENTS.md` §5 (repo structure — `apps/web-site`), `architecture-context.md` §6 (branded PWA fallback), `brand.md` first. `apps/web-site` doesn't exist yet — this unit scaffolds it, unlike every prior unit which extended an existing app.

## Open Questions

1. **Per-tenant public site vs. one shared marketing site.** "Public school site" could mean Vidyut's own marketing site, or a per-school public page (a normal SaaS school-website feature). `feature-catalog.md`'s phrasing ("Public Site + Online Admission") and the branded-PWA-fallback context (`architecture-context.md`'s white-label doc, §6) both point at **per-school** public pages, not Vidyut's own marketing. **Recommendation:** `apps/web-site` is a per-tenant SSR site — `schoolCode`-resolved (reusing Unit 15b's `GET /tenants/resolve/:schoolCode`) or a custom-domain mapping (a `Branch`/`Tenant` field for a CNAME, a small additive field, not built until a real tenant asks for a custom domain) — rendering that school's public info + an online admission form. Vidyut's own marketing site is a separate, un-spec'd concern (not part of the product's own multi-tenant app), out of scope here.
2. **What does a "branded PWA fallback" actually need beyond a normal PWA manifest?** `architecture-context.md`'s white-label doc frames this as "instant day-1 access" before a school's dedicated native app is built/approved. **Recommendation:** a standard installable PWA (manifest.json + service worker, Next.js's built-in PWA support) pointing at the same tenant-resolved content as the public site/admission form plus a login link into the existing OTP flow — not a parallel app, just the public site made installable with the tenant's branding (name/logo/colors from `Tenant`/`Branch`, no new schema).
3. **Online admission form → `Application` linkage.** Unit 10 already built `Enquiry`/`Application` with a staff-facing admissions module; this unit needs the *public*, unauthenticated submission path. **Recommendation:** `POST /api/v1/public/admissions/:schoolCode` (no auth, rate-limited harder than normal endpoints — public forms are a spam target) creates an `Enquiry` directly (not an `Application` — staff still convert enquiry → application per Unit 10's existing flow, this form is just the public intake).

## Goal

A per-tenant public site + online admission intake form + installable branded PWA — the "day-1 branded presence" every new school gets before (or instead of) a dedicated native app.

## Scope

1. **`apps/web-site`** (new Next.js app, SSR): scaffold per AGENTS.md §5's repo structure, sharing `packages/ui`/`packages/config` like `apps/web-app`.
2. **Tenant resolution**: `schoolCode` or custom-domain → tenant, reusing Unit 15b's resolver.
3. **Public pages**: school info (name, logo, board, branches — all already on `Tenant`/`Branch`), rendered from existing data, no new content-management schema (a school's "about us" text etc. is genuinely out of scope until a real CMS need is validated — `feature-catalog.md` marks "blog/CMS" on-demand).
4. **`POST /api/v1/public/admissions/:schoolCode`** (Open Question 3) — no auth, aggressive rate-limiting (reuse Unit 04's rate-limit middleware with a stricter public-endpoint config), creates an `Enquiry`.
5. **PWA manifest + service worker** (Open Question 2), tenant-branded.
6. **i18n:** Hindi/English for every public-facing string (this is often a parent's very first touchpoint with the school's system).

## Out of scope

Vidyut's own marketing site (Open Question 1), a real CMS for school content, custom-domain infrastructure beyond the data field (DNS/SSL provisioning is ops work for whenever a real tenant asks), blog/news sections.

## Definition of done / checks

- A school's public page renders correctly for a real seeded tenant via `schoolCode`.
- The admission form creates a real `Enquiry` row visible in the existing staff-facing admissions module (Unit 10) — end-to-end, not just a 201 response.
- The public admission endpoint is rate-limited more strictly than authenticated endpoints — verified with a burst-request test.
- The PWA installs and shows the correct tenant branding (name/logo/colors) — verified in a browser's install prompt, not just manifest JSON correctness.
- Lint + typecheck + tests pass; `progress-tracker.md` updated (29 → done, **Milestone 7 complete**, 30 current).

## Next unit

**30 — Billing & Subscriptions** (first unit of Milestone 8 — White-Label & Billing).

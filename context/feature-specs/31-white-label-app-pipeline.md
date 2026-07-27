# Unit 31 — White-Label App Pipeline

Read `AGENTS.md`, `architecture-context.md`'s white-label doc (Part 2, §3A/§5), `brand.md`, `prerequisites.md` first. `AppBuild` + the `appbuild.stub` job already exist (Unit 05) — this unit replaces the stub with the real EAS Build/Submit pipeline.

## Open Questions

1. **Real EAS builds need real Apple/Google developer accounts and credentials per tenant (dedicated mode) or one shared account (shared mode).** `architecture-context.md`'s own doc (§3A "dual distribution mode") already locked this decision — shared themed app (one Vidyut-owned store listing, tenant selects their school via `schoolCode` after install) for Starter/Standard, dedicated per-school build (its own store listing, its own credentials) as a Pro/Enterprise add-on. **Recommendation:** implement shared mode first (no new store listing needed — Unit 15b's app already *is* the shared app; this unit's shared-mode work is really just the theming/branding-switch-on-login already implicit in `schoolCode` resolution, largely done). Dedicated-mode's real EAS-triggered build-and-submit is the unit's actual new work, gated behind confirming `prerequisites.md`'s account/credential checklist is done for at least one pilot tenant before writing code against real Apple/Google APIs.
2. **Credential storage.** Per-tenant Apple/Google signing credentials are highly sensitive. **Recommendation:** never store raw credentials in Postgres — use EAS's own managed credential storage (their standard flow) referenced by `AppBuild.buildRef`, matching `architecture-context.md`'s own §5.5 ("Credentials & secrets") guidance.
3. **OTA updates.** `expo-updates` (already a natural fit for the Unit 15b Expo shell) needs a per-tenant or shared update channel strategy. **Recommendation:** one shared OTA channel for shared-mode tenants (a JS-only bugfix reaches everyone at once, matching how the shared app already behaves), a per-tenant channel for dedicated-mode tenants (so one school's custom native module additions, if any, don't leak into others' updates).

## Goal

Real EAS Build/Submit triggered from the super-admin panel for dedicated-mode tenants, plus OTA update delivery — replacing Unit 05's `appbuild.stub` no-op.

## Scope

1. **`apps/worker/src/processors/appbuild-generate.ts`** replaces the stub: calls EAS Build API (via their SDK/CLI programmatically), polls/updates `AppBuild.storeStatus` through `PENDING → BUILDING → SUBMITTED → LIVE` (or `FAILED`), stores EAS's own build ID as `AppBuild.buildRef`.
2. **Super-admin trigger**: `POST /api/v1/platform/tenants/:id/app-builds` (already exists per Unit 05 — confirm it enqueues the real job now, not the stub) + a status-polling screen in the super-admin web UI.
3. **OTA channel wiring** per Open Question 3 — `expo-updates` config in `apps/mobile`, channel selection based on the tenant's `appType`.
4. **Google Play compliance checklist** (`architecture-context.md`'s own non-negotiable list) — verified against the actual submitted build, not assumed.

## Out of scope

A fully automated, zero-touch pipeline (a human still reviews/approves each dedicated build before store submission — real app-store review always has a human-judgment step, not worth automating away prematurely), iOS-specific complexities beyond what EAS itself handles, multiple dedicated apps running simultaneously in this unit's tests (one pilot tenant's dedicated build is enough to prove the pipeline).

## Definition of done / checks

- A real (not stubbed) EAS build completes for at least one test/pilot tenant in dedicated mode, and `AppBuild.storeStatus` reflects its real progression.
- Credentials are never present in Postgres — verified by inspecting `AppBuild`'s actual stored fields.
- An OTA update reaches a shared-mode tenant's installed app without a new store build.
- `prerequisites.md`'s relevant checklist items are confirmed done, not assumed, before this unit is marked complete.
- `progress-tracker.md` updated (31 → done, **Milestone 8 complete**, 32 current).

## Next unit

**32 — Offline Sync Hardening** (first unit of Milestone 9 — Harden & Launch).

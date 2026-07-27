# Unit 15b — Mobile App Shell (pulled forward from Unit 24)

Read `AGENTS.md`, `architecture-context.md` (§4 stack, §8 offline strategy), `build-approach.md`, `prerequisites.md` (D4, mobile prereqs), `context/data-model.md` §1-2 (Tenant/Branch) first.

## Open Questions

- **`schoolCode` doesn't exist anywhere yet** — no model field, no resolver endpoint. This is the follow-through on the founder decision recorded in `progress-tracker.md` since Unit 03 ("a separate short, human-friendly `schoolCode`... will resolve to a tenant for the mobile shared-app login... replace `tenantSlug`"). **Recommendation:** add `Tenant.schoolCode` (short, e.g. 6-char uppercase alphanumeric, unique, auto-generated at tenant provisioning — Unit 05's `createTenant` gets a small addition — with an admin-facing regenerate/set-custom option deferred), plus a public `GET /api/v1/tenants/resolve/:schoolCode` returning `{ tenantSlug }`. The mobile app resolves `schoolCode → tenantSlug` once at login, then calls the existing OTP endpoints exactly as they are today — `tenantSlug` isn't removed, just no longer typed by hand.
- **External, non-code prerequisites** (`progress-tracker.md`'s own note on this unit): a Google Play Developer account, an EAS/Expo account, and the Vidyut app icon (`brand.md`) are listed as "line up first." **This spec assumes none of these exist yet** — the shell can be built and verified end-to-end via Expo Go / a local dev client without them; only store submission (out of scope until Unit 31) needs them. Flagging so implementation doesn't stall waiting on accounts that aren't actually required yet.
- **Dynamic theming mechanism:** a shared-mode single binary serves every tenant, so branding must be resolved at runtime post-login. `Branch.logoUrl` already exists (Unit 02) — **recommendation:** reuse it rather than inventing a new branding model; the app fetches the logged-in user's branch (already returned via JWT `tenantId` + a branch lookup) and applies `logoUrl` + falls back to Vidyut default colors. A richer per-tenant color/theme config is deferred until a real dedicated-mode customer needs it (Unit 31 territory).

## Goal

A single Expo/React Native app shell — OTP login via `schoolCode`, role-based routing, Hindi/English i18n, and an offline-storage foundation — that Unit 16 (teacher attendance) and later units (parent/student/staff feature screens) build real features into.

## Scope

1. **Backend addition:** `Tenant.schoolCode` (migration + backfill for existing tenants — generate one for the seeded demo tenant too) and `GET /api/v1/tenants/resolve/:schoolCode` (public, rate-limited, returns `404` for an unknown code — no enumeration-safe masking needed here since a school code isn't a secret, unlike a phone/OTP).
2. **`apps/mobile` scaffold:** Expo (TypeScript, Expo Router or React Navigation — pick whichever the current Expo SDK's starter template defaults to, no need to hand-roll navigation), matching `packages/config`'s design tokens where practical for shared visual language with `apps/web-app`.
3. **Auth flow:** school-code entry screen → resolve → phone entry → OTP request/verify (existing `/auth/otp/*` endpoints, unchanged) → tokens stored via `expo-secure-store` (never `AsyncStorage` for tokens).
4. **Role-based routing shell:** after login, route to a role-appropriate placeholder home screen (Parent / Teacher / Staff / Student) based on the JWT's `roles` claim — empty/stub screens this unit, real features land in later units.
5. **i18n:** `i18next` + `expo-localization`, Hindi/English toggle, reusing the same translation-key philosophy as `apps/web-app` (separate translation files, not shared bundles, since the two apps ship independently).
6. **Offline storage foundation:** WatermelonDB (or SQLite directly, per `architecture-context.md`'s stated stack) initialized with an empty/minimal schema — infrastructure only, no real synced tables yet (Unit 16 adds the attendance-roster tables it actually needs).
7. **EAS project config:** `app.config.js` + `eas.json` for **shared mode only** (one app, generic branding) — dedicated/white-label build variants are Unit 31.

## Out of scope

Real offline sync engine + conflict resolution (Unit 32 hardens this; Unit 16 does the minimum needed for attendance), dedicated-mode/white-label builds and store submission (Unit 31), any parent/teacher/student *feature* screens beyond placeholders (Units 16, 24, 25, 26), push notifications (no FCM device-token registration yet), a richer branding/theming config beyond `Branch.logoUrl`.

## Definition of done / checks

- The app runs in Expo Go (or a local dev client) against the real API.
- A real `schoolCode` resolves to the right tenant; an unknown code shows a clear "school not found" state, not a crash.
- OTP login succeeds end-to-end (a genuine request/verify round trip against the running `apps/api`, not mocked), and tokens persist across an app restart (read back from secure storage).
- Each role lands on its own placeholder home screen after login.
- The Hindi/English toggle actually changes displayed strings.
- Backend: `GET /tenants/resolve/:schoolCode` tested for a valid code, an unknown code (`404`), and tenant-isolation (each tenant's code resolves only to itself).
- Lint + typecheck (both `apps/api` for the resolver endpoint and `apps/mobile`) + tests pass; `progress-tracker.md` updated (15b → done, 16 current).

## Next unit

**16 — Teacher Mobile Attendance + Parent Alerts.**

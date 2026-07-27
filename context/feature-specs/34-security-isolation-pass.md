# Unit 34 — Security & Isolation Pass

Read `AGENTS.md` §8 (non-negotiable invariants), `architecture-context.md` §9 (security/privacy/compliance) first. An audit unit, not a new-feature unit — every prior unit already shipped its own tenant-isolation/RBAC/branch-scope tests; this unit verifies the *whole system* holds those invariants together, and closes real gaps (backups, DPDP export) that no single feature unit owned.

## Open Questions

1. **"Tenant-isolation test suite"** could mean re-testing every existing endpoint (redundant — each unit already has its own RLS test) or a smaller set of *cross-cutting* checks that individual unit tests can't catch (e.g., a new endpoint added later forgetting `withTenant()`). **Recommendation:** don't re-test every endpoint again — add one small **static/lint-style check** (a test that walks every service file under `apps/api/src/modules/*/service.ts` and flags any Prisma call not wrapped in `withTenant()` or explicitly allow-listed as a platform table, per AGENTS.md invariant 1) so a *future* unit that forgets `withTenant()` fails CI immediately, rather than only being caught by that unit's own hand-written test (or missed entirely).
2. **RBAC audit** — same reasoning: every unit already tests its own permission gates. **Recommendation:** one consolidated cross-check — for every permission string in `rbac.md`'s matrix, confirm at least one route in the codebase actually enforces it (`requirePermission("...")` present), catching a documented-but-unenforced permission (a real, subtle class of bug distinct from what per-unit tests catch).
3. **Backup/restore drill and DPDP data export** have no prior unit — genuinely new work here, not an audit of existing work. **Recommendation**: a scripted `pg_dump`/restore drill against a real (non-prod) database proving RLS policies survive a restore correctly (a real risk — restoring without re-applying `FORCE ROW LEVEL SECURITY` would silently reopen every tenant's data), and one `GET /api/v1/me/data-export` (self-scoped, reusing Unit 24's resolver) producing a JSON dump of a user's own data for DPDP compliance.

## Goal

Verify the whole system's isolation/RBAC invariants hold end to end (not just per-unit), and close the two genuinely new gaps: backup/restore safety and DPDP data export.

## Scope

1. **Cross-cutting `withTenant()` static check** (Open Question 1) — a repo-level test, not a new endpoint.
2. **RBAC coverage cross-check** (Open Question 2) — a repo-level test comparing `rbac.md`'s matrix against actual `requirePermission()` call sites.
3. **Backup/restore drill** (Open Question 3) — a documented, runnable script + a one-time verified drill (not automated CI, this is an operational rehearsal).
4. **`GET /api/v1/me/data-export`** (Open Question 3) — self-scoped (any authenticated user, their own data only), aggregates the user's own rows across the modules that hold personal data (Student/Guardian/attendance/marks/fees paid — not staff-internal operational data).

## Out of scope

Penetration testing / third-party security audit (a real, valuable thing to eventually pay for, but not something this unit self-certifies), automated continuous backup verification (the drill proves the *process* works; scheduling/monitoring real backups is `prerequisites.md`/ops territory), a full DPDP compliance program beyond the one export endpoint (legal/policy work outside this codebase's scope).

## Definition of done / checks

- The `withTenant()` static check fails when a deliberately-introduced unscoped query is added to a test fixture, and passes on the current, real codebase.
- The RBAC coverage check flags a deliberately-removed `requirePermission()` call in a test fixture, and passes on the current, real codebase.
- The backup/restore drill is actually run once against a non-prod database and its outcome (including a confirmation that RLS still isolates tenants post-restore) is documented in `progress-tracker.md`, not just described.
- `GET /me/data-export` returns real data for a seeded user, correctly scoped to only their own rows — verified against a second user's data being absent.
- `progress-tracker.md` updated (34 → done, 35 current).

## Next unit

**35 — Launch Readiness.**

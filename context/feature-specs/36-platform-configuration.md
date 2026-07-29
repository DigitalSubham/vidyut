# Unit 36 — Platform Configuration (Settings, Branch, User & Role Management)

Read `AGENTS.md`, `rbac.md`, Unit 34's audit findings (`progress-tracker.md`) first. This is the highest-priority remaining unit — it closes three confirmed gaps in what was sold as the "Complete Core": `settings.manage`, `branch.manage`, `user.manage`/`role.manage` are documented permissions with **zero enforcing API**, found by Unit 34's own RBAC coverage check and deliberately left unbuilt at the time (an audit unit isn't the place to build four new modules).

## Open Questions

1. **Settings scope.** "School profile, sessions, numbering, templates" (feature-catalog.md) is broad. **Recommendation:** v1 settings = school profile (name, address, board, logo URL, locale default) + numbering format hints (admission-no prefix, invoice-no prefix — currently hardcoded `ADM-`/`INV-` in the generators) stored on `Tenant`/`Branch`. Report-card/receipt template *editing* is already Unit 19/12's territory (templates exist as data) — this unit is just exposing a settings screen to edit the values already on those models, not building a new template engine.
2. **Branch management** — Unit 06 created branches only via seed/platform-provisioning. **Recommendation:** `POST/PATCH /academic/branches` gated `branch.manage`, OWNER-only per `rbac.md`. Multi-branch schools can add a branch after onboarding without going back to the super-admin.
3. **User & role management** — the biggest of the three. Roles are currently seeded once (`seedDefaultRoles`) and never editable; staff users are created per-module (e.g., `POST /staff`) with no central "invite a staff user, assign role(s), branch(es)" screen or a way to edit a role's permission grid. **Recommendation:** `user.manage` = invite/deactivate a staff `User` + assign `UserRole` rows (reuses Unit 09's `createStaffUser`-equivalent pattern); `role.manage` = CRUD on `Role`/`RolePermission` for **non-system roles only** (`Role.isSystem` stays immutable — the five seeded roles' baseline permission sets shouldn't be editable away by accident, only a school's own custom roles).

## Goal

Give an OWNER a real "Settings" area: edit school profile, add/manage branches, invite staff and assign roles, and create custom roles with a chosen permission subset.

## Scope

1. `Tenant`/`Branch` profile fields (name, address, board, logoUrl) + `PATCH /tenants/me/profile` (gated `settings.manage`).
2. `POST /academic/branches`, `PATCH /academic/branches/:id` (gated `branch.manage`).
3. `POST /users/invite` (staff), `PATCH /users/:id` (deactivate/reactivate, reassign role/branch) — gated `user.manage`.
4. `POST /roles` (custom, non-system only), `PATCH /roles/:id/permissions` — gated `role.manage`, blocked on `Role.isSystem` rows.
5. Web admin UI: a `/settings` area with School Profile, Branches, Staff & Roles tabs, reusing Unit 27's shell/table/form pattern.

## Out of scope

Numbering-*format* customization beyond a prefix string (a full templating DSL for admission numbers is speculative); a permission-grid visual builder beyond a checkbox list; branch deletion (branches are never deleted, only deactivated, matching every other soft-delete convention in this codebase).

## Definition of done / checks

- An OWNER can edit school profile, add a second branch, invite a new ADMIN user, and create a custom role with a subset of permissions — all via the API and the web UI.
- `Role.isSystem` rows reject a permission-edit attempt with a clear error.
- RBAC + branch-scope + tenant-isolation tests, matching every prior unit's pattern.
- `progress-tracker.md` updated.

## Next unit

**37 — Global Search.**

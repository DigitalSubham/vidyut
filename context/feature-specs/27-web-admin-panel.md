# Unit 27 — Web Admin Panel

Read `AGENTS.md`, `ui-context.md`, `feature-catalog.md`, `code-standards.md` first. The biggest gap in the build so far: `apps/web-app` currently only has the super-admin surface (Unit 05) — every school-admin-facing module built since Unit 06 (academic, students, guardians, staff, admissions, fees, attendance, exams, marks, report cards, announcements, certificates, timetable, homework) has **no web UI at all** yet, only API + tests.

## Open Questions

1. **This is really 12+ screens' worth of work, not one unit.** Trying to ship every module's admin UI in one pass risks a shallow, inconsistent result. **Recommendation:** this spec defines the **shell + navigation + shared table/form patterns** and the first three highest-value modules end to end (students, fees/collection, attendance) as the reference implementation; the remaining modules follow the same established pattern as fast-follow passes (each is a small, mechanical repeat of the same CRUD-table + form shape, not a new design problem) — track them as follow-up units (27b, 27c, ...) rather than blocking this unit's completion on all of them.
2. **Role-scoped visibility.** `feature-catalog.md` says "role-scoped surfacing of all core modules" — the sidebar shouldn't show a module the logged-in role has no permission for. **Recommendation:** reuse the existing permission catalog client-side (fetch the caller's effective permissions once at login, same shape as `rbac.md`'s matrix) to filter sidebar nav items — no new backend endpoint needed, `GET /auth/me` (Unit 03, already exists) already returns roles; add permissions to that response if not already present.

## Goal

The school-admin web app shell (route groups, sidebar, shared data-table/form components) plus the first reference modules (students, fees, attendance) wired end to end against the real APIs — the pattern every remaining module follows.

## Scope

1. **App shell**: route groups under `apps/web-app/app/(admin)/`, sidebar nav (role-filtered per Open Question 2), topbar (branch switcher for multi-branch tenants, language switcher — reusing Unit 01's i18n setup).
2. **Shared components** (`packages/ui` where sensible, app-level otherwise per AGENTS.md §8 invariant 7): a data table (sort/paginate/filter, wired to the existing `meta.page/pageSize/total` envelope shape every list endpoint already returns) and a form pattern (react-hook-form + Zod, reusing the exact schemas already exported from `@vidyut/validation` — no duplicate validation logic between web and API).
3. **Students module** (reference implementation): list/search/create/edit, bulk-import trigger (Unit 07's job).
4. **Fees module** (reference implementation): fee structure setup, invoice list, collect-payment form, receipt view.
5. **Attendance module** (reference implementation): daily register grid, defaulter report.
6. **i18n:** every screen string via i18n keys (Hindi/English).

## Out of scope

The remaining modules' UI (guardians, staff, admissions, exams, marks, report cards, announcements, certificates, timetable, homework) — tracked as fast-follow units using this unit's established shell/table/form pattern, not blocking this unit. Owner/Principal dashboard (Unit 28 — a different, KPI-shaped surface, not a CRUD table).

## Definition of done / checks

- The shell renders with role-filtered nav for at least two different roles (e.g., ACCOUNTANT sees fees but not exams; TEACHER sees attendance but not fee collection).
- Students/fees/attendance modules work end to end against the real API (no mocked data) — verified in a browser, not just typecheck (per this repo's UI-change verification rule).
- Lint + typecheck pass; `progress-tracker.md` updated (27 → done, noting explicitly which modules still need fast-follow UI passes, 28 current).

## Next unit

**28 — Owner/Principal Dashboard.**

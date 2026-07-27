# Unit 24 — Mobile: Parent/Student Layers

Read `AGENTS.md`, `architecture-context.md` §8 (offline-first mobile), `rbac.md` rule 5 (self-ownership), `api-conventions.md` first. First unit of Milestone 7. Builds on the Unit 15b shell and every backend unit since (15, 17–23) — this unit's whole job is the **self-scope layer** those units all deferred to "whichever unit builds the real parent/student app surface."

## Open Questions

1. **Does a `STUDENT` role need its own login at all, or is a parent's "view as child" enough?** `rbac.md` lists `STUDENT` as a real self-scoped role, but no `Student.userId` field exists anywhere in the schema — students have never been loggable-in. For Bihar private schools (K-12, many young children), a parent-mediated view covers most real usage; a directly-logged-in student account mainly matters for older (secondary/senior-secondary) students who want their own phone access. **Recommendation:** add `Student.userId String? @unique` (nullable, same pattern as `Guardian.userId`) and reuse the existing OTP flow (`Unit 03`) for student login — but make it **opt-in per student** (a school/parent decides whether a given student gets their own login), not a default every student gets. This is additive schema, not a redesign.
2. **A single generic self-scope resolver, not one bespoke check per endpoint.** Units 19/20/22/23 each deferred their own "parent/student read" to this unit. Re-solving self-scope five separate times would be real duplication. **Recommendation:** one shared helper, `resolveSelfStudentIds(auth): Promise<string[]>` (in `apps/api/src/core/guards/self-scope.ts`, extending Unit 08's existing self-scope resolver) — for a `STUDENT` token, returns `[the linked Student.id]`; for a `PARENT` token, returns every `StudentGuardian.studentId` for that guardian (Unit 08's `GET /guardians/me/children` already computes this list, just not exposed as a reusable function). Every new self-scope endpoint in this unit calls this helper and 403s if the requested `studentId` isn't in the resolved set — one code path, not five.
3. **Which reads actually need a `/me` variant now vs. later.** Not every backend unit's data is equally urgent for a parent/student to see day one. **Recommendation:** ship the four that directly unblock Unit 25's "Parent App" feature list (attendance, report cards, homework, timetable) in this unit; fees/payment self-scope (already partially self-serve via Unit 13's online-payment initiate, which already checks self-or-permission) stays as-is, not duplicated here.

## Goal

The reusable self-scope backend layer (one resolver + four `/me` read endpoints) plus a minimal parent/student mobile home screen proving it end-to-end — the foundation Unit 25 builds the full Parent App experience on top of.

## Scope

1. **`Student.userId`** (nullable, unique) + a student-login variant of Unit 03's OTP flow (same `POST /auth/otp/request` / `verify`, just resolving against `Student.userId` when no `Guardian` matches the phone).
2. **`resolveSelfStudentIds(auth)`** — shared resolver per Open Question 2, used by every endpoint below.
3. `GET /api/v1/me/attendance?studentId=&month=&year=` — reuses Unit 15's register logic, self-scoped.
4. `GET /api/v1/me/report-cards?studentId=` — only `publishedAt`-set `ReportCard` rows (Unit 19's whole reason `publishedAt` exists).
5. `GET /api/v1/me/homework?studentId=` — the student's current section's homework (Unit 23).
6. `GET /api/v1/me/timetable?studentId=` — the student's current section's grid (Unit 22).
7. **Mobile**: a `ParentStudentHomeScreen` in `apps/mobile` replacing the generic `HomeScreen` placeholder for `PARENT`/`STUDENT` roles — a simple list of linked children (parent) or the student's own name, tapping through to read-only attendance/report-card/homework/timetable views using the four endpoints above.
8. **i18n:** all validation/error strings and new screen strings via i18n keys (Hindi/English).

## Out of scope

Fees/online-payment self-scope UI (already exists server-side via Unit 13, real Parent App fee screens are Unit 25), push notification handling on-device (Unit 20 already writes `NotificationLog`; wiring FCM delivery is later infra work), a full-featured parent dashboard (that's Unit 25's job — this unit proves the layer with a minimal screen).

## Definition of done / checks

- A parent can OTP-login and see their linked children; a student with `userId` set can OTP-login and see their own data.
- Each `/me` endpoint 403s when `studentId` isn't in the caller's `resolveSelfStudentIds()` result — verified with a second, unrelated student.
- `GET /me/report-cards` never returns an unpublished `ReportCard` — verified against a mixed published/unpublished fixture.
- Tenant-isolation + branch-scope tests: cross-tenant self-scope requests return zero rows / 403 as appropriate.
- Honest verification-gap disclosure (same posture as 15b/16) if no simulator is attached when this unit is implemented — don't overclaim on-device verification.
- Lint + typecheck + tests pass; `progress-tracker.md` updated (24 → done, 25 current).

## Next unit

**25 — Parent App** (the full feature-rich experience on top of this unit's layer).

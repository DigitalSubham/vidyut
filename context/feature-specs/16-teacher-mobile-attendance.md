# Unit 16 — Teacher Mobile Attendance + Parent Alerts

Read `AGENTS.md`, `architecture-context.md` (§8 offline strategy), `data-model.md` (§8), Unit 15's spec (attendance API), Unit 15b's spec (mobile shell) first.

## Open Questions

- **Absence-alert timing:** immediately per marked-absent record, or batched into an end-of-day digest? **Recommendation:** immediate, one alert per absence — matches the feature's own name ("auto absence alert") and is the simpler increment; a digest mode is a P1 refinement, not this unit.
- **Idempotent client IDs:** Unit 15's `POST /attendance` already accepts an optional client-supplied `id` (added in that unit specifically so this unit wouldn't need to retrofit it). This unit is the actual producer of those IDs — confirming the contract here rather than re-deciding it.

## Goal

Let a teacher mark attendance for their assigned section while offline, sync it once connectivity returns, and automatically alert guardians when a student is marked absent.

## Scope

1. **Mobile (`apps/mobile`):** a roster screen for the teacher's assigned section(s) (via `TeacherAssignment`, Unit 09) — today's students, tap-to-cycle status (`PRESENT`/`ABSENT`/`LATE`/`LEAVE`/`HALF_DAY`). Writes land in the local WatermelonDB store first (optimistic UI), each row carrying a client-generated `id` (cuid) up front.
2. **Sync engine (minimal, this unit's scope only):** background sync pushes pending local records to Unit 15's `POST /api/v1/attendance`, `source: "APP"`, using the client-generated `id`s so a retried sync after a partial failure doesn't duplicate rows (relies entirely on Unit 15's upsert-by-`(studentId, date)` behavior — no new dedup logic needed here). Conflict rule: **last-write-wins** (per `architecture-context.md` §8) — the most recent sync attempt's status wins if the same record was somehow marked twice before syncing.
3. **Absence alert:** when `POST /attendance` (from the mobile sync, or the web path from Unit 15) results in a record with `status = ABSENT`, enqueue a `students.absenceAlert` background job — one per student per day, addressed to that student's `isPrimary`/`canPay` guardians — reusing Unit 14's `NotificationLog` + stub-send infrastructure (not a new notification pipeline).
4. **i18n:** all mobile-visible strings via the existing i18next setup (Unit 15b).

## Out of scope

Delta sync / full conflict-rule hardening beyond last-write-wins (Unit 32), period-wise attendance, an absence-alert digest mode (see Open Questions), any other subject's mobile marking flow, push notifications (still stubbed).

## Definition of done / checks

- A teacher can mark their section's attendance with the device in airplane mode; reconnecting triggers a sync that lands correctly server-side with no duplicate `AttendanceRecord` rows.
- A student marked `ABSENT` (via either the mobile sync or Unit 15's web-facing endpoint) results in exactly one enqueued alert per guardian, verified via a real enqueue→process round trip (not mocked).
- A `TEACHER` not assigned to a section cannot mark it (enforced server-side, already covered by Unit 15 — this unit verifies the mobile flow surfaces that rejection sensibly, not a silent failure).
- Tenant/branch isolation: unchanged from Unit 15 (same endpoint), verified the mobile client can't be tricked into targeting another tenant's data.
- Lint + typecheck (`apps/mobile` + `apps/api`/`apps/worker` for the new job) + tests pass; `progress-tracker.md` updated (16 → done; **Milestone 3 complete** → 17 current).

## Next unit

**17 — Exam Setup & Grading** (Milestone 4 begins).

# Unit 47 — Timetable Depth (Substitution, Room Allocation)

Read `apps/api/src/modules/timetable/` (Unit 22) first.

## Open Questions

1. **Auto/smart timetable generation** — a real constraint-satisfaction problem (teacher availability × room × subject × section, no double-booking). **Recommendation: explicitly defer this.** It's tagged P3 in the catalog for a reason — a naive generator produces bad timetables that erode trust in the whole product; a good one is a multi-week algorithmic effort with no validated demand yet. Build substitution + room allocation now (real, scoped, valuable); revisit generation only if a paying school specifically asks.
2. **Room field: string vs. `Room` model — resolved.** Keeping `TimetablePeriod.room` as free text. No school has asked for room *management* (capacity/type/booking-conflict-by-capacity); the only thing Unit 47 actually needs is "is this exact room string already taken for this slot", which a string equality check on the existing field answers just as well as a `Room` model would. Promote to a real model only if a school later wants capacity-aware room booking.

## Goal

Let a principal cover an absent teacher's periods and track which room/lab a period uses, without inventing an auto-scheduler.

## Scope

1. `TimetablePeriod.room` stays free text (see Open Question 2) — no new `Room` model.
2. `Substitution` (`timetablePeriodId`, `date`, `substituteStaffId`, `reason`, `room?` override) + `POST /timetable/substitutions` (gated `timetable.manage`) — a same-day override for one period, doesn't touch the recurring `TimetablePeriod`. Rejects if the substitute teacher, or the (possibly overridden) room, is already booked elsewhere at that day/period.
3. `GET /timetable/substitutions/today?branchId=` — a principal's morning "who's absent, who's covering" view.

## UI scope

**Web only** — this is office/principal work (the same web=admin, mobile=parent-teacher-student split used for every prior unit). New `/timetable` admin page: a "Today" tab listing substitutions for the current date, and a create-substitution form (period picker by section/day/periodNo, substitute staff, optional room override, reason). No mobile screen — Unit 47's own spec frames this as a principal's view, and no teacher/parent/student-facing capability is in scope here. The full weekly timetable grid editor (Unit 22's own bulk-upsert UI) remains a separate, pre-existing gap, not part of this unit.

## Out of scope

Auto-generation (Open Question 1); a full room-booking/conflict system beyond flagging a double-booked room at substitution time (reuses the existing double-booking guard pattern from Unit 22).

## Definition of done / checks

- A substitution correctly overrides one period for one day without altering the recurring schedule.
- Double-booking the substitute teacher (or the room, if built) is rejected, reusing Unit 22's existing guard.
- `progress-tracker.md` updated.

## Next unit

**48 — Fee Management Depth (Remaining).**

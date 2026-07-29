# Unit 47 — Timetable Depth (Substitution, Room Allocation)

Read `apps/api/src/modules/timetable/` (Unit 22) first.

## Open Questions

1. **Auto/smart timetable generation** — a real constraint-satisfaction problem (teacher availability × room × subject × section, no double-booking). **Recommendation: explicitly defer this.** It's tagged P3 in the catalog for a reason — a naive generator produces bad timetables that erode trust in the whole product; a good one is a multi-week algorithmic effort with no validated demand yet. Build substitution + room allocation now (real, scoped, valuable); revisit generation only if a paying school specifically asks.

## Goal

Let a principal cover an absent teacher's periods and track which room/lab a period uses, without inventing an auto-scheduler.

## Scope

1. `TimetablePeriod.roomId?` → promote the existing free-text `room` field to a proper `Room` model (`name`, `capacity`, `type`) if the user wants room *management*, not just a label; otherwise keep it as free text (confirm which before building a new model for what might just be a string).
2. `Substitution` (`timetablePeriodId`, `date`, `substituteStaffId`, `reason`) + `POST /timetable/substitutions` (gated `timetable.manage`) — a same-day override for one period, doesn't touch the recurring `TimetablePeriod`.
3. `GET /timetable/substitutions/today?branchId=` — a principal's morning "who's absent, who's covering" view.

## Out of scope

Auto-generation (Open Question 1); a full room-booking/conflict system beyond flagging a double-booked room at substitution time (reuses the existing double-booking guard pattern from Unit 22).

## Definition of done / checks

- A substitution correctly overrides one period for one day without altering the recurring schedule.
- Double-booking the substitute teacher (or the room, if built) is rejected, reusing Unit 22's existing guard.
- `progress-tracker.md` updated.

## Next unit

**48 — Fee Management Depth (Remaining).**

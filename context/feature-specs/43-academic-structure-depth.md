# Unit 43 — Academic Structure Depth (Streams, Electives, Houses)

Read `apps/api/src/modules/academic/` (Unit 06) first. Fills A5's remaining rows: XI–XII streams, elective baskets, house system.

## Open Questions

1. **Streams (Science/Commerce/Arts)** — is a stream a property of a `Class` (e.g., "Class 11 Science" as its own `Class` row, already representable today with zero schema change) or a cross-cutting grouping that shares a class but different electives? **Recommendation:** the former — schools already do this in practice (separate sections per stream is normal), so **this may need no new model at all**, just a convention. Confirm with the user before adding a `Stream` model that duplicates what `Class` already does.
2. **House system** — purely for events/discipline points, no other module depends on it. **Recommendation:** a simple `House` model + `Student.houseId`, no house-vs-house scoring engine (that's Discipline module territory, D6, separately deferred).

## Goal

Confirm/close the stream question with the user, add elective-basket grouping, and a lightweight house-tagging system.

## Scope

1. Elective baskets: `ElectiveGroup` (a named set of `ClassSubject` rows a student picks one from) + `StudentElectiveChoice`.
2. `House` model + `Student.houseId` + a simple house-roster list.
3. **Streams**: resolve Open Question 1 with the user before writing any code — likely zero-scope if the existing `Class`-per-stream convention is confirmed sufficient.

## Out of scope

House-based scoring/leaderboards (D6 Discipline territory); elective-clash timetable validation (Unit 47's territory if it becomes relevant).

## Definition of done / checks

- A student can be assigned an elective choice from a defined basket; the choice is visible on their profile.
- A student can be tagged with a house; a house roster lists its members.
- Tenant-isolation tests.
- `progress-tracker.md` updated.

## Next unit

**44 — Attendance Depth.**

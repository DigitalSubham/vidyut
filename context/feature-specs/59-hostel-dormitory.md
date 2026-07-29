# Unit 59 — Hostel / Dormitory (D3, full On-Demand module)

Same On-Demand caveat as Unit 57. Lowest-priority remaining module per the catalog's own P3 tag.

## Open Questions

1. **Mess/meal management scope** — a full meal-planning/inventory system is real separate scope (overlaps with the still-unbuilt Inventory module, Unit 64). **Recommendation:** v1 hostel scope = rooms/allocation/attendance/fees only; mess menu is a simple published-text feature (no inventory tracking), deferred fully if inventory is wanted later.

## Goal

Room/bed allocation, night roll-call attendance, and hostel fees via the existing fee engine.

## Scope

1. `HostelBlock`/`Room` (capacity, occupancy) + `RoomAllocation` (`studentId`, `roomId`, `fromDate`, `toDate?`).
2. `HostelAttendanceRecord` — reuses Unit 44's period/device-scan-capable attendance shape, just a different context tag, not a new model from scratch.
3. `FeeHead(type: MISC)` for hostel fees, same reuse pattern as transport/library.
4. Gate pass/leave for hostellers — reuses Unit 60's (Front Office) gate-pass model once that exists, scoped to hostel residents.

## Out of scope

Mess inventory/meal planning (Open Question 1); warden performance management (no source process to model).

## Definition of done / checks

- Room allocation prevents over-capacity assignment; night roll-call attendance records correctly; hostel fees appear on the student's ledger.
- Tenant-isolation tests.
- `progress-tracker.md` updated.

## Next unit

**60 — Front Office & Gate.**

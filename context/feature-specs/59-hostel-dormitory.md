# Unit 59 — Hostel / Dormitory (D3, full On-Demand module)

Same On-Demand caveat as Unit 57. Lowest-priority remaining module per the catalog's own P3 tag. **Built at the user's explicit request** ("keep going", continuing the same confirmed exception used for Units 57/58) — no real school demand was confirmed before implementation. Flagged here for visibility, not as a defect.

## Open Questions

1. **Mess/meal management scope** — a full meal-planning/inventory system is real separate scope (overlaps with the still-unbuilt Inventory module, Unit 64). **Resolved: adopted the spec's own recommendation.** v1 hostel scope = rooms/allocation/attendance/fees only; a mess menu/published-text feature was not built at all (not even the simple version) — no confirmed demand for it either, and it's easy to add later as a plain text field if asked for.

## Decisions made during build

- **Scope #2's "reuses Unit 44's attendance shape, just a different context tag" was not accurate to the actual schema** — `AttendanceRecord` is hard-wired to `sectionId`/`periodId` (required/FK), with no context enum to tag. The codebase's real precedent for a non-class attendance context is `StaffAttendanceRecord` (Unit 42): its own parallel model, same enums (`AttendanceStatus`/`AttendanceSource`), no `sectionId`. `HostelAttendanceRecord` follows that same precedent — its own model, not a shared/tagged one.
- Hostel attendance reuses the existing `attendance.mark`/`attendance.view` permissions (the exact precedent staff attendance already set in `apps/api/src/modules/staff/routes.ts`), not new hostel-specific permissions.
- Scope #4 (gate pass for hostellers, reusing Unit 60's not-yet-built Front Office model) is **out of scope for this build** — Unit 60 doesn't exist yet, so there's nothing to reuse. Revisit when Unit 60 is built.
- Room capacity is enforced at the service layer (count of active — `toDate: null` — allocations in a room must stay below `Room.capacity`), not a DB constraint — Postgres has no native "count of related rows below N" constraint short of a trigger, and a service-layer check inside the same transaction as the insert is the same posture Unit 07's admission-number generator already uses for a similar race-prone counter.

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

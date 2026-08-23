# Unit 60 — Front Office & Gate (D4 remaining rows)

Enquiry log is already built (A2/Unit 10) — this unit is the rest of D4. **Built at the user's explicit request** ("keep going with unit 60 and 61") — no real school demand was confirmed before implementation, same posture as Units 57–59. Flagged here for visibility, not as a defect.

## Open Questions

None — these are small, well-understood registers with no real design ambiguity.

## Decisions made during build

- Scope #3's "or just reuse Complaint directly ... rather than a parallel model" was resolved toward the parallel model: Unit 49's `Complaint.raisedByUserId` is a required FK to `User`, and a gate-desk complaint frequently comes from a walk-in visitor with no `User` account. `ComplaintDeskEntry` is its own lightweight model (`raisedByName` plain text) reusing the same `ComplaintStatus` enum, not a parallel status vocabulary.

## Goal

Visitor management, gate pass/early-leave (with parent alert), a complaint desk, and basic call/postal logs.

## Scope

1. `Visitor` (`name`, `purpose`, `hostStaffId?`, `checkInAt`, `checkOutAt?`, `photoUrl?`) + gate-side check-in/out endpoints.
2. `GatePass` (`studentId`, `reason`, `approvedById`, `exitAt?`) + parent notification on approval (reuses the notification pipeline).
3. `ComplaintDeskEntry` — a lighter-weight variant of Unit 49's `Complaint`, or just reuse `Complaint` directly with a `source: GATE` tag rather than a parallel model.
4. `CallLogEntry`/`PostalLogEntry` — simple registers, no workflow beyond create/list.

## Out of scope

Biometric visitor check-in (depends on Unit 44's device-scan endpoint if wanted later).

## Definition of done / checks

- Visitor check-in/out, gate pass approval + parent alert, and the registers all work correctly, tenant-isolated.
- `progress-tracker.md` updated.

## Next unit

**61 — Health, Discipline & Others.**

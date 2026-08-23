# Unit 61 — Health, Discipline & Others (D6)

Same On-Demand caveat as Unit 57. **Built at the user's explicit request** ("keep going with unit 60 and 61") — no real school demand was confirmed before implementation, same posture as Units 57–60. Flagged here for visibility, not as a defect.

## Open Questions

1. **Merit/demerit scoring** — is this purely a log, or does it feed into something else (e.g., house points from Unit 43, or affects report-card co-scholastic remarks)? **Resolved: adopted the spec's own recommendation.** v1 = a plain log with a numeric point value (`DisciplineIncident.points`), no automatic downstream effect on house points or report cards — not wired into either until confirmed.

## Decisions made during build

- Scope #5 (biometric/RFID device hub) — no new endpoint was built. It reuses Unit 44's existing generic device-scan endpoint as the spec itself says; there is nothing to add here beyond that existing ingestion point.

## Goal

Health/medical records, a discipline incident log, awards tracking, a canteen prepaid system, and a lost & found register.

## Scope

1. `HealthRecord` (`studentId`, `condition`, `notes`, `emergencyContact`) — extends what A1 already sketched as "medical/health info," built here as its own model since it wasn't part of the Student profile itself.
2. `DisciplineIncident` (`studentId`, `type: MERIT|DEMERIT`, `points`, `note`, `recordedById`).
3. `Award` (`studentId`, `title`, `awardedAt`).
4. `CanteenWallet` (per-student prepaid balance, mirrors `SmsWallet`'s shape) + `CanteenTxn` + a simple POS-style deduct endpoint.
5. Biometric/RFID device hub — reuses Unit 44's generic device-scan endpoint, tagged by device purpose, not a new ingestion point.
6. `LostFoundEntry` (`itemDescription`, `foundLocation?`, `foundAt`, `status: UNCLAIMED|CLAIMED`, `claimedByUserId?`) — a plain register, no matching/notification logic beyond a simple list staff can mark claimed.

## Out of scope

Automatic house-point aggregation from discipline incidents (Open Question 1, unless confirmed); a full canteen menu/inventory system (Unit 64's territory if wanted).

## Definition of done / checks

- Each register CRUDs correctly, tenant-isolated; canteen wallet debits correctly and never goes negative (same guard pattern as `SmsWallet`).
- `progress-tracker.md` updated.

## Next unit

**62 — Accounting & Finance.**

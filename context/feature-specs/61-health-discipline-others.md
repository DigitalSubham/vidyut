# Unit 61 — Health, Discipline & Others (D6)

Same On-Demand caveat as Unit 57.

## Open Questions

1. **Merit/demerit scoring** — is this purely a log, or does it feed into something else (e.g., house points from Unit 43, or affects report-card co-scholastic remarks)? **Recommendation:** v1 = a plain log with a numeric point value, no automatic downstream effects — confirm with the user before wiring it into house scoring or report cards.

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

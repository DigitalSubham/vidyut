# Unit 57 — Transport Management (D1, full On-Demand module)

Read `feature-catalog.md` D1 first. **Note on scope**: `build-approach.md` §6 says to build On-Demand modules only when a paying school requires one — this spec exists because the user asked for specs across the remaining catalog, not because real demand has been confirmed. Treat this as ready-to-build-when-needed, not a signal to implement now without checking that trigger first.

## Open Questions

1. **GPS tracking needs a real hardware/SDK decision** (a device on each bus, a mobile app in the driver's hand, or both) — a real procurement question for the school, not something to assume. **Recommendation:** build the data model and API to *receive* location pings from any source; defer picking a specific device vendor until a real school's fleet is known.
2. **Fare/zone structure** varies a lot by school (flat fee vs. distance-based vs. zone-based). **Recommendation:** model it as just another `FeeHead`/`FeeStructureItem` (Unit 11's existing fee engine) keyed by route, not a parallel transport-specific billing engine — reuse, don't duplicate.

## Goal

Routes, vehicles, driver management, student allocation, and (gated) live tracking — reusing the existing fee engine for transport billing.

## Scope

1. `Route`/`RouteStop`, `Vehicle` (reg no., fitness/insurance/permit expiry dates), `Driver` (staff or a lightweight non-staff contact record).
2. `StudentRouteAllocation` (`studentId`, `routeId`, `stopId`) + a `FeeHead(type: TRANSPORT)` `FeeStructureItem` per route (Open Question 2).
3. `POST /transport/location-ping` (Open Question 1) — generic ingestion, vendor-agnostic.
4. Pickup/drop notifications: reuses Unit 40's real notification providers once those exist (a location-ping crossing a stop's geofence triggers the existing announcement/notification pipeline, not a new one).
5. Expiry alerts for vehicle documents (fitness/insurance/permit) via Unit 14's existing cron-scan pattern.

## Out of scope

A specific GPS vendor SDK (Open Question 1); route optimization (a real logistics-optimization problem, P3, no validated demand); in-bus biometric attendance (depends on Unit 44's device-scan endpoint, reusable when needed).

## Definition of done / checks

- Routes/vehicles/drivers CRUD correctly; a student's transport fee correctly appears on their fee ledger via the existing engine.
- Document-expiry alerts fire on schedule.
- Tenant-isolation + branch-scope tests.
- `progress-tracker.md` updated.

## Next unit

**58 — Library Management.**

# Unit 65 — Misc Engagement & Productivity Tools (H-bis remainder)

The last unit of this batch — the smallest, most speculative remaining rows (Part H-bis's competitor cross-check additions), each genuinely low-priority and independent of every other unit above.

## Open Questions

1. **Is any of this actually wanted, or was it captured purely for competitor-completeness?** These items exist in the catalog because a competitor advertises them, not because a Bihar school has asked for them. **Recommendation: treat this whole unit as the lowest priority in the batch** — build only the smallest, cheapest items (task/to-do, polls) if anything, and genuinely skip discussion forums/question-paper generators/video conferencing until real demand appears; they're bigger builds for speculative value.

## Goal

Task/to-do assignment and simple polls — the two items in this group with a plausible near-term use and a small build cost. Everything else in this group stays explicitly deferred.

## Scope

1. `StaffTask` (`assignedToId`, `title`, `dueDate?`, `status`) + list/complete endpoints.
2. Polls: reuses Unit 49's `Survey` model with a `type: POLL` flag (single question, single choice) rather than a parallel model.

## Out of scope (all deferred, no validated demand)

Discussion forums/boards; a school blog/CMS beyond Unit 54's fixed public-site sections; a custom form builder (Unit 41's admissions document-checklist and Unit 49's surveys already cover the two most plausible use cases without a generic builder); a question-paper generator (depends on Unit 46's question bank existing first, and is P3 even then); video conferencing (needs a real Zoom/Meet/Jitsi account + embed decision, no validated demand).

## Definition of done / checks

- Task assignment and polls work correctly, tenant-isolated.
- Every other item in this unit is explicitly left unbuilt with the reasoning recorded here, not silently dropped.
- `progress-tracker.md` updated — **this closes the spec-writing pass across every remaining catalog item except Part G (AI), per the user's explicit instruction to leave AI features for now.**

## Next unit

None within this batch. Remaining candidates for future work: Part G (AI & Intelligent Features), explicitly excluded from this pass; anything in this batch whose Open Questions resolved to "defer" once real demand or a business decision arrives.

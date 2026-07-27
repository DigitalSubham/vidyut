# Unit 11 — Fee Setup

Read `AGENTS.md`, `data-model.md` (§10), `rbac.md`, `api-conventions.md`, `code-standards.md`, `feature-catalog.md` (§B1) first.

## Decisions (confirmed with the user before implementation)

- **`Concession.status`:** `data-model.md` lists it as a plain field with no enum name (unlike `type(ConcessionType)`, which is explicit) — same gap as Unit 09's `LeaveRequest.type`. Confirmed: a fixed enum `ConcessionStatus{PENDING, APPROVED, REJECTED}`, so `rbac.md`'s separate `fee.concession.approve` permission has an actual decision to gate.
- **Fine/late-fee rules:** `feature-catalog.md` lists "Fine/late-fee rules" as P1 under Fee Management, and this unit's own `progress-tracker.md` scope line mentions "fines" — but `data-model.md`'s Fees section (§10) has no `FineRule` entity at all; fines only appear as a field on Unit 12's `InvoiceItem`. Confirmed: add a small `FineRule` model now (config only — grace period + amount/percent), one per `FeeStructureItem`. Unit 12 reads it when generating `InvoiceItem.fine` at actual invoicing time; this unit only stores the rule.
- **Bulk fee assignment:** `FeeAssignment` links a `FeeStructure` to a student ("bulk/individual" per `data-model.md`). Confirmed: `POST /fee-structures/:id/assign` takes `{ classId }` and fans out to every currently-enrolled student in that class (current session), creating one `FeeAssignment` per student (skipping students who already have one for that structure — no duplicates). Individual assignment/unassignment is still available via direct create/delete on a single `FeeAssignment`.

## Goal

Fee heads, structures (with per-item amount/frequency/due-day), concessions (with an approval workflow), fine-rule configuration, and bulk fee assignment — the config layer Unit 12's actual invoicing/collection will consume. No `Invoice`/`Payment`/`Receipt` yet (Milestone 2's next three units).

## Scope

1. **Models** (`data-model.md` §10, plus the `FineRule`/`ConcessionStatus` additions above): `FeeHead`, `FeeStructure` + `FeeStructureItem`, `FeeAssignment`, `Concession`, `FineRule` + enums `FeeType`, `FeeFrequency`, `ConcessionType`, `ConcessionStatus`. Branch-scoped; RLS per the established pattern. Money fields (`FeeStructureItem.amount`, `Concession.value` when `isPercent=false`, `FineRule.value` when `isPercent=false`) are integer paise, never floats.
2. `POST/GET/PATCH/DELETE /api/v1/fee-heads` (name, type) — soft-deleted (`deletedAt`), same pattern as `Subject`. Gated by `fee.setup`.
3. `POST/GET/PATCH/DELETE /api/v1/fee-structures` (sessionId, classId?, name) — soft-deleted. Nested: `POST/GET/DELETE /api/v1/fee-structures/:id/items` (feeHeadId, amount, frequency, dueDayOfMonth?) and `POST/PATCH/DELETE /api/v1/fee-structures/:id/items/:itemId/fine-rule` (graceDays, isPercent, value). All gated by `fee.setup`.
4. `POST /api/v1/fee-structures/:id/assign` (`{ classId }`, bulk fan-out per the Decisions above) and direct `POST/DELETE /api/v1/fee-assignments` for individual assign/unassign. `GET /api/v1/fee-assignments` (filters: studentId, structureId). Gated by `fee.setup`.
5. `POST/GET/PATCH /api/v1/concessions` (studentId, type, value, isPercent) — created `PENDING`, gated by `fee.setup`. `PATCH /api/v1/concessions/:id/decide` (`{ status: APPROVED|REJECTED }`) gated by `fee.concession.approve`, sets `approvedById`.
6. **Reads** (`GET` on all the above): gated by `fee.view` (OWNER/PRINCIPAL/ADMIN/ACCOUNTANT per `rbac.md` — TEACHER excluded).
7. **i18n:** all validation/error strings via i18n keys.

## Out of scope

`Invoice`/`InvoiceItem`/`Payment`/`Receipt` and actual invoice generation (Unit 12 — `FineRule` configured here is only *read* by Unit 12, not applied to anything yet), online payment (Unit 13), fee reminders (Unit 14), opening-balance migration (Unit 12).

## Definition of done / checks

- Fee heads/structures/items/fine-rules CRUD works end to end, tenant + branch isolated.
- Bulk-assign creates exactly one `FeeAssignment` per currently-enrolled student in the target class, and re-running it doesn't create duplicates.
- Concession apply→approve/reject workflow works; `approvedById` is set on decision.
- Tenant-isolation test: cross-tenant fee-head/structure/concession queries return zero rows both via RLS and via a deliberately unscoped query.
- RBAC test: `fee.setup` roles (OWNER/ACCOUNTANT) pass on mutations; PRINCIPAL/ADMIN/TEACHER get `403 FORBIDDEN`. `fee.concession.approve` restricted the same way (OWNER/ACCOUNTANT); reads work for OWNER/PRINCIPAL/ADMIN/ACCOUNTANT, denied for TEACHER.
- Branch-scope test: an ACCOUNTANT on Branch A denied Branch B's fee structures.
- Lint + typecheck + tests pass; `progress-tracker.md` updated (11 → done, 12 current).

## Next unit

**12 — Fee Collection + Ledger.**

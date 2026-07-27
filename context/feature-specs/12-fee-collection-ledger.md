# Unit 12 — Fee Collection + Ledger

Read `AGENTS.md`, `data-model.md` (§10), `rbac.md`, `api-conventions.md` (Idempotency & concurrency), `code-standards.md`, `architecture-context.md` (jobs, PDF generation) first.

## Decisions (confirmed with the user before implementation)

- **How invoices come into existence:** `data-model.md` gives the `Invoice`/`Payment`/`Receipt` shapes but never says how an `Invoice` is actually created. Confirmed: **automated generation** — `POST /api/v1/fee-structures/:id/generate-invoices` expands every linked `FeeAssignment`'s `FeeStructureItem`s (respecting `frequency`) into due-dated `Invoice`+`InvoiceItem` rows for the structure's session. Idempotent: `@@unique([studentId, sessionId, periodLabel])` on `Invoice` means re-running it skips periods already generated, same pattern as Unit 11's bulk-assign.
  - Period expansion (a documented simplification, since `data-model.md` has no `Term` entity to anchor exact boundaries): `ONE_TIME` → 1 invoice at session start. `MONTHLY` → one invoice per calendar month in the session, due on `dueDayOfMonth` (default the 1st). `QUARTERLY` → 4 evenly-spaced periods. `TERM` → 3 evenly-spaced periods (common CBSE baseline, no real term calendar yet). `ANNUAL` → 1 invoice at session start. Multiple `FeeStructureItem`s due on the same period are combined into **one** `Invoice` with multiple `InvoiceItem`s, not one invoice each.
- **Receipt PDF generation:** no PDF infrastructure exists anywhere in the app yet, and receipt templates are meant to be per-tenant config (not built yet). Confirmed: **stub the job**, same pattern as Unit 05's `appbuild.stub` — `POST /payments` enqueues `receipt.generate`, which proves the enqueue → worker round trip without real Puppeteer rendering. Real HTML→PDF + the tenant-configurable template system is a later, dedicated pass (`Receipt.pdfUrl` stays `null` this unit).
- **Concession/FineRule application to invoices:** Unit 11 built `Concession` (approval workflow) and `FineRule` (grace/amount config), and `InvoiceItem` has `discount`/`fine` fields per `data-model.md` — but nothing in the model sketch wires an approved `Concession` or a `FineRule` into automatic invoice generation. Rather than invent an allocation scheme (e.g. how a flat-amount concession splits across multiple invoice items) not specified anywhere, this unit's generator leaves `discount`/`fine` at `0` — the fields exist per the schema, populating them automatically is deferred to a later pass (fine application in particular pairs naturally with Unit 14's reminder cron, which already needs a scheduled per-invoice sweep).
- **Invoice `OVERDUE` status:** `InvoiceStatus` includes `OVERDUE`, but nothing transitions an invoice into it automatically without a scheduled sweep. Deferred to Unit 14's cron (the natural home for a scheduled job). This unit's dues/defaulter report identifies "logically overdue" invoices by comparing `dueDate < now` and `status` not in `(PAID, CANCELLED)` directly, without relying on the stored enum value.

## Goal

Turn Unit 11's fee setup into real money movement: generate invoices from fee assignments, collect counter payments (idempotent), produce a receipt (PDF generation stubbed), a per-student ledger, dues/defaulter reports, and opening-balance seeding for onboarding.

## Scope

1. **Models** (`data-model.md` §10): `Invoice` + `InvoiceItem`, `Payment`, `Receipt` + enums `InvoiceStatus`, `PaymentMode`, `PaymentStatus`. Branch-scoped; RLS per the established pattern. `Invoice` gets `@@unique([studentId, sessionId, periodLabel])` for generation idempotency (an addition beyond the bare sketch, same category as Unit 10's `Application.studentId`). Money fields are integer paise throughout.
2. `POST /api/v1/fee-structures/:id/generate-invoices` — the automated generation described in Decisions. Gated by `fee.setup`.
3. `GET /api/v1/invoices` (filters: studentId, status, branchId), `GET /api/v1/invoices/:id`. Gated by `fee.view`.
4. `POST /api/v1/payments` — counter collection (cash/cheque/UPI/card/etc., the full `PaymentMode` enum — the progress-tracker line's "(cash/cheque/UPI)" is illustrative, not exhaustive). Requires an `Idempotency-Key` header (`api-conventions.md`) mapped to `Payment.idempotencyKey` (`@unique`) — a repeated key returns the original `Payment`, never creates a duplicate. On success: updates the linked `Invoice.status` (`PENDING`→`PARTIAL`/`PAID` based on cumulative successful payments vs. invoice total), creates a `Receipt` row, enqueues `receipt.generate` (stub — see Decisions), and writes an `AuditLog` entry (`AGENTS.md` invariant #6: fee mutations are ledgered + audited). Gated by `fees.collect`.
5. `GET /api/v1/students/:id/fee-ledger` — a **derived** view (not a stored table, per `data-model.md`'s "derive from Invoice/Payment") merging a student's invoices + payments into one chronological history. Gated by `fee.view`.
6. `GET /api/v1/fees/reports/dues` and `GET /api/v1/fees/reports/defaulters` (filters: branchId, classId) — outstanding-balance and overdue-invoice aggregates, computed directly from `Invoice`/`Payment` (see the `OVERDUE` Decision above). Gated by `fee.reports`.
7. `POST /api/v1/students/:id/opening-balance` (`{ amount, dueDate, note? }`) — seeds a legacy due as a `PENDING` `Invoice` (single `InvoiceItem` against an auto-created-if-missing "Opening Balance" `FeeHead`, type `MISC`) for onboarding migration. Gated by `fee.setup`.
8. **i18n:** all validation/error strings via i18n keys.

## Out of scope

Online payment via gateway/webhooks (Unit 13), automatic `Concession`/`FineRule` application to invoices (see Decisions — fields exist, stay zero), automatic `OVERDUE` transitions (Unit 14's cron), scheduled fee reminders (Unit 14), real Puppeteer receipt rendering + tenant-configurable templates (later pass), refunds (`fee.refund` — on-demand once a real refund flow is designed), payment-gateway reconciliation (Unit 13).

## Definition of done / checks

- Generating invoices for a fee structure creates the expected due-dated `Invoice`+`InvoiceItem` rows per assigned student, combining same-period items into one invoice; re-running it doesn't duplicate.
- A counter payment updates the invoice's status correctly (`PARTIAL` on partial payment, `PAID` once fully covered), creates a `Receipt`, and enqueues the stub job — a genuine enqueue→process round trip, not mocked.
- Idempotency: two `POST /payments` calls with the same `Idempotency-Key` produce exactly one `Payment` row.
- The fee ledger for a student returns invoices and payments merged in chronological order.
- Dues/defaulter reports return accurate outstanding amounts against a deliberately-constructed multi-invoice, multi-payment scenario.
- Opening-balance seeding creates a real, collectible `PENDING` invoice.
- Tenant-isolation test: cross-tenant invoice/payment queries return zero rows both via RLS and via a deliberately unscoped query.
- RBAC test: `fees.collect` (OWNER/ADMIN/ACCOUNTANT per `rbac.md`) gates payments; `fee.view`/`fee.reports` gate reads appropriately; PRINCIPAL/TEACHER denied where the matrix says so.
- Branch-scope test: an ACCOUNTANT on Branch A denied Branch B's invoices/payments.
- Lint + typecheck + tests pass; `progress-tracker.md` updated (12 → done, 13 current).

## Next unit

**13 — Online Payment + Reconciliation.**

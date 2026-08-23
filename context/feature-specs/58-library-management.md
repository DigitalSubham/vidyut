# Unit 58 — Library Management (D2, full On-Demand module)

Same On-Demand caveat as Unit 57 — build when a paying school asks (`build-approach.md` §6). **Built at the user's explicit request** ("continue with unit 58", following the same confirmed exception as Unit 57) — no real school demand was confirmed before implementation. Flagged here for visibility, not as a defect.

## Open Questions

1. **ISBN/bibliographic auto-fetch** needs a real external API (Open Library, Google Books) — **Resolved: not built.** No confirmation was given that this is wanted, and it would add an external API dependency for what manual catalog entry (`title`/`author`/`isbn` as plain fields on `Book`) already covers. Revisit if a school specifically asks for auto-fetch.

## Goal

Book catalog, circulation (issue/return/renew), fines linked to the existing fee engine, and members.

## Scope

1. `Book` (title, author, ISBN, copies), `BookCopy` (barcode, status: AVAILABLE|ISSUED|LOST).
2. `LibraryMember` — students/staff, reuses existing `Student`/`Staff` records, not a new identity.
3. `BookIssue` (`copyId`, `memberId`, `issuedAt`, `dueAt`, `returnedAt?`) + issue/return/renew endpoints.
4. Late-return fines: a `FeeHead(type: MISC)` one-off `InvoiceItem` generated on overdue return (reuses Unit 12's invoicing, not a parallel fine ledger).
5. ISBN auto-fetch (Open Question 1) — only if confirmed.

## Out of scope

OPAC (public catalog browsing — no validated demand); digital library/e-books (a content-licensing question, not just engineering); multi-campus catalog rules (single-branch-per-library assumed until a school with a real multi-branch library need appears).

## Definition of done / checks

- Issue/return/renew correctly tracks copy status and due dates; an overdue return correctly generates a fine invoice via the existing fee engine.
- Tenant-isolation tests.
- `progress-tracker.md` updated.

## Decisions made during build

- `LibraryMember` is a thin link row (`branchId` + one of `studentId`/`staffId`) — no duplicated name/contact fields, per scope #2's "not a new identity."
- Fines only bill student members (`Invoice.studentId` is a hard FK — there's no staff fee ledger to attach a staff fine to). A staff member returning a book late is recorded (`BookIssue.returnedAt`) but generates no invoice; this is a real gap if a school needs staff fines, not an oversight — revisit if it comes up.
- Fine amount: a flat `FINE_PER_DAY_PAISE` constant (₹2/day) — a real school would want this configurable per tenant; deferred until one asks (`ponytail`-style — a config knob for a value nobody has told us they need yet).
- No nightly overdue-reminder cron was built — the spec's scope only calls for a fine "generated on overdue return" (i.e., at the return event), not a proactive alert while a book is still outstanding. Unit 57's cron-scan pattern is the template to reuse if that's wanted later.

## Next unit

**59 — Hostel/Dormitory.**

# Unit 58 — Library Management (D2, full On-Demand module)

Same On-Demand caveat as Unit 57 — build when a paying school asks (`build-approach.md` §6).

## Open Questions

1. **ISBN/bibliographic auto-fetch** needs a real external API (Open Library, Google Books) — free tier likely sufficient, but confirm it's wanted before adding an external dependency for what could just be manual catalog entry.

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

## Next unit

**59 — Hostel/Dormitory.**

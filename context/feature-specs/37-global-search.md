# Unit 37 — Global Search

Read `feature-catalog.md` Part H's Search row first. A cross-cutting, low-risk unit — searches across models that already have their own list/filter endpoints; this unit doesn't touch business logic, just adds one aggregate read path.

## Open Questions

1. **Search backend.** A dedicated search engine (Elasticsearch/Meilisearch/Typesense) is real infra this school-count doesn't need yet. **Recommendation:** Postgres `ILIKE`/trigram search (`pg_trgm` extension, already available on RDS/any Postgres 16) across `Student.firstName/lastName/admissionNo`, `Staff` (via `User.name`), `Invoice.number` — three targeted queries, not a generic full-text index over every table. Reassess only if result quality/latency becomes a real complaint.
2. **Result ranking/scope.** **Recommendation:** simple prefix/substring match, branch-scoped like every other list endpoint, no relevance scoring — this is a "jump to record" tool for staff, not a search product.

## Goal

One search box in the web admin header that jumps straight to a student, staff member, or invoice by name/number.

## Scope

1. `pg_trgm` extension migration + GIN indexes on the three searched columns.
2. `GET /search?q=` — branch-scoped, returns `{ students: [], staff: [], invoices: [] }`, each capped at 5 results, gated by the caller already having `student.view`/staff-directory/`fee.view` (reuses those existing permissions, no new one).
3. Web: a header search input (Unit 27's shell) with a results dropdown linking to the matching record's detail page.

## Out of scope

Searching every module (announcements, homework, certificates — low value for a "jump to" tool); typo-tolerant fuzzy search; a dedicated search results page (a dropdown is enough at this scale).

## Definition of done / checks

- Searching a real student's first name, a staff member's name, and an invoice number each return the right record within the caller's branch scope, and nothing outside it (tenant-isolation + branch-scope tests).
- `progress-tracker.md` updated.

## Next unit

**38 — Fee Reconciliation & Receipt Corrections.**

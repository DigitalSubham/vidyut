# Unit 51 — Web Admin Panel: Remaining Modules

Read `apps/api/src/modules/` broadly + `apps/web-app/app/(school)/` (Unit 27) first. Purely a UI unit — every API this unit needs already exists and is tested; this is "give it a screen," not new backend work. Mechanical, same shell/table/form pattern Unit 27 established, repeated for each remaining module.

## Open Questions

None — this is the one unit in this batch with no real design ambiguity. The pattern is proven (Unit 27) and just needs repeating.

## Goal

Web UI for guardians, staff, admissions, exams, marks, report cards, announcements, certificates, timetable, and homework — the ten modules Unit 27 explicitly deferred.

## Scope

One screen-set per module, each following Unit 27's exact pattern (list + create/edit form + detail view, using the existing shadcn `Table`/`Dialog` components and `admin-client.ts`'s typed-fetch convention):

1. Guardians — list/create/link-to-student.
2. Staff — list/create/edit, leave approval queue.
3. Admissions — enquiry/application pipeline board (kanban-style stage view, or a simple filtered list if a kanban is overkill — confirm preference during implementation, not a spec-level ambiguity).
4. Exams — exam/term setup, `ExamSubject` configuration.
5. Marks — bulk entry grid (per Unit 18's spec, one-row-per-student, not the mobile app's one-at-a-time flow).
6. Report cards — template management, publish/unpublish toggle.
7. Announcements — create/list/audience picker.
8. Certificates — issue/list/register view.
9. Timetable — a visual weekly grid (period × day), the one screen here that's more than a plain table.
10. Homework — create/list per section.

## Out of scope

Redesigning any existing screen; building new backend capability (everything here already exists via Unit 27's precedent — this unit is additive UI only).

## Definition of done / checks

- Each of the ten modules is usable end-to-end through the web UI, verified live in a browser per this repo's own UI-change rule (not just typecheck).
- No regression to the four already-built modules (students/fees/attendance/dashboard).
- `progress-tracker.md` updated.

## Next unit

**52 — Mobile App Depth.**

# Unit 45 — Homework Depth (Submission, Grading, Calendar)

Read `apps/api/src/modules/homework/` (Unit 23) first.

## Open Questions

1. **Submission storage** — reuses Unit 04's S3 wrapper (same as staff documents, Unit 42) rather than a new upload mechanism. No open question there.
2. **Grading model** — marks + comments per submission, distinct from `MarksEntry` (that's exam marks, a different concept — don't conflate homework grading with the exam/report-card pipeline).

## Goal

Let students submit homework digitally and teachers grade it; add a calendar view.

## Scope

1. `HomeworkSubmission` (`homeworkId`, `studentId`, `fileUrl`, `submittedAt`, `grade?`, `feedback?`) + `POST /homework/:id/submissions` (student-scoped, self-scope-checked like every `/me/*` write) + `PATCH /homework/submissions/:id` (teacher grading, reuses `assertCanManageSection`).
2. `GET /me/homework/calendar?month=` — same data as the existing list endpoint, grouped by due date.

## Out of scope

Plagiarism detection (needs a real corpus/tool, speculative at this stage); a rich-text submission editor (file upload is enough).

## Definition of done / checks

- A student submits a file against their own homework only (self-scope test); a teacher grades it within their assigned section only (existing `assertCanManageSection` reused).
- Calendar groups correctly by due date.
- `progress-tracker.md` updated.

## Next unit

**46 — Exams & Report Cards Depth.**

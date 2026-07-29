# Unit 46 — Exams & Report Cards Depth

Read `apps/api/src/modules/exams/`, `marks/`, `reportcards/` (Units 17–19) first. The largest remaining depth unit — A8 has the most unbuilt rows of any P0 module.

## Open Questions

1. **Online examination** — a real scope decision: MCQ-only (structured, easy to auto-grade) or MCQ+descriptive (needs manual grading, closer to `MarksEntry` than a new engine)? **Recommendation:** MCQ-only for v1 of this feature — auto-gradable, a genuinely separate `OnlineExam`/`OnlineExamQuestion`/`OnlineExamSubmission` model, not a repurposing of `Exam`/`MarksEntry` (different data shape: options, correct-answer key, timer). Descriptive online exams are a bigger, separate ask — flag to user if wanted.
2. **Question bank** depends on Open Question 1's model existing first (a bank is just reusable `OnlineExamQuestion` rows not tied to one exam instance) — sequence it after, not before.
3. **Board-specific report card layouts** — CBSE/ICSE/State each have real, different layout conventions. **Recommendation:** don't hand-build three fixed layouts speculatively; make `ReportCardTemplate.layout` (already a JSONB column, Unit 19) support a small set of layout primitives (a fixed field list + scholastic/co-scholastic table + remarks block) an OWNER can compose per board — confirm the actual CBSE format needed with the user/a real report card sample before locking a JSON schema for it.

## Goal

Exam datesheets, co-scholastic grading, consolidated rank/toppers, transcripts, MCQ online exams, a question bank, and real board-format report card layouts.

## Scope

1. `ExamTimetable` (`examId`, `subjectId`, `date`, `startTime`, `room`) + endpoints — separate from Unit 22's class-period `TimetablePeriod`.
2. `CoScholasticGrade` (`studentId`, `examId`, `activity`, `grade`) — discipline/activity grades alongside `MarksEntry`.
3. `GET /exams/:id/results/rank` — computed from existing `MarksEntry` rows, no new input data, just an aggregation + rank endpoint.
4. `GET /students/:id/transcript` — multi-session `ReportCard` rollup.
5. `OnlineExam`/`OnlineExamQuestion`/`OnlineExamSubmission` (Open Question 1) with auto-grading.
6. `QuestionBankItem` (Open Question 2), filterable by subject/class, reusable into an `OnlineExam`.
7. Confirm a real board's report-card layout with the user before extending `ReportCardTemplate.layout`'s schema (Open Question 3).

## Out of scope

Descriptive/subjective online exams (Open Question 1); proctoring (webcam monitoring — a much bigger, separate ask); AI-generated remarks (excluded per this batch's scope, Part G).

## Definition of done / checks

- Exam datesheet, co-scholastic grades, rank computation, and transcript all return correct data against a real multi-exam fixture.
- An MCQ online exam auto-grades correctly on submission.
- Tenant-isolation + RBAC tests throughout.
- `progress-tracker.md` updated.

## Next unit

**47 — Timetable Depth.**

# Unit 67 — Lesson Planning, Curriculum & LMS (A10, full On-Demand module)

Same On-Demand caveat as Unit 57 (`build-approach.md` §6) — this entire module was correctly identified as deferred in the original catalog audit, but never actually got a spec written, unlike every other deferred module in this batch. This closes that gap.

## Open Questions

1. **Content library scope** — "notes, PDFs, videos" could mean unlimited video hosting (real bandwidth/storage cost at scale) or just document/link sharing. **Recommendation:** v1 = document/link sharing via Unit 04's existing S3 wrapper (same as every other file upload in this codebase) — no video transcoding/streaming infrastructure. A teacher can link an external YouTube/Drive video; the platform doesn't host video itself.
2. **Live classes** — needs a real Zoom/Meet/Jitsi account decision, same reasoning as every other gated-integration unit in this batch. **Recommendation:** build an embed/link-out point (a "join class" button pointing at an externally-created meeting link the teacher pastes in), not a real SDK integration, until a specific provider is confirmed.

## Goal

Syllabus tracking, lesson plans, a document/link content library, and a link-out point for live classes — reusing existing infra (storage, homework's existing model shapes) rather than building a parallel content platform.

## Scope

1. `SyllabusChapter` (`subjectId`, `classId`, `title`, `order`, `completedAt?`) — a simple checklist teachers mark off, not a rich curriculum-mapping tool.
2. `LessonPlan` (`staffId`, `subjectId`, `sectionId`, `date`, `topic`, `notes`) + a principal-approval flag if the school wants review (default: no approval gate, matching this codebase's "don't build unrequested workflow" bias).
3. `ContentItem` (`title`, `type: FILE|LINK`, `fileUrl?|linkUrl?`, `subjectId`, `classId`) — the "content library," reusing Unit 04's storage wrapper for files.
4. `LiveClassLink` (`sectionId`, `subjectId`, `startTime`, `joinUrl`) — a scheduled entry with an externally-created link (Open Question 2), surfaced on the student/parent app's timetable-adjacent view.

## Out of scope

Video hosting/transcoding (Open Question 1); a real Zoom/Meet/Jitsi SDK integration (Open Question 2 — link-out only until a provider is confirmed); learning analytics (engagement/completion tracking needs the above to exist and see real usage first — premature to build before there's real content to measure engagement against).

## Definition of done / checks

- Syllabus progress, lesson plans, content items, and live-class links all CRUD correctly, branch/tenant-isolated.
- A student/parent can see a scheduled live-class link on the relevant date.
- `progress-tracker.md` updated.

## Next unit

**68 — Communication Extras (Preferences, Newsletter, Birthday Automation).**

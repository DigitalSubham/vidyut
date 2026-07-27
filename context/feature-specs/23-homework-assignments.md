# Unit 23 — Homework/Assignments

Read `AGENTS.md`, `data-model.md` (§11), `rbac.md`, `api-conventions.md`, `code-standards.md` first. Last unit of Milestone 6 — closes out the backend-core build (Milestone 7 onward is apps/dashboards/billing/hardening, not new domain CRUD).

## Open Questions

1. **"Parent/student view + calendar."** The scope line implies a calendar surface, but no `CalendarEvent`-style model exists (same gap already flagged and deferred in Unit 20's Open Question 2). **Recommendation:** no new model — a parent/student "calendar" is just `GET /homework` filtered by `dueDate` range, rendered as a calendar client-side. A real multi-source calendar (holidays + exams + homework + events) is a bigger, later feature, not this unit's job.
2. **Self-scoped parent/student reads.** Same recurring gap as Units 19/20/22's Open Questions — no endpoint yet resolves "my children's sections" or "my own section" from a JWT. **Recommendation:** stays deferred to whichever unit builds the real parent/student app surface (Unit 24/25); this unit's `GET /homework` takes `sectionId`/`subjectId` query params like every other structural-data list endpoint, not a self-scoped variant.

## Goal

Assign homework per section+subject with a due date; the simplest possible structure Unit 24/25/26's app screens read from.

## Scope

1. **Model** (`data-model.md` §11): `Homework{ id, tenantId, branchId, sectionId, subjectId, title, description, attachmentUrl?, dueDate, createdById }`. Branch-scoped, RLS per the established pattern.
2. `POST /api/v1/homework` — gated `homework.manage` (`rbac.md`: PRINCIPAL/TEACHER only — not OWNER/ADMIN, mirroring Unit 18's `marks.enter` asymmetry). A TEACHER is restricted to sections they're assigned to (reuse Unit 15's `assertCanMarkSection`-style check via `TeacherAssignment`).
3. `GET /api/v1/homework?sectionId=&subjectId=&dueBefore=&dueAfter=` — broad read (any authenticated staff role; parent/student self-scoping deferred per Open Question 2).
4. `PATCH /api/v1/homework/:id` / `DELETE /api/v1/homework/:id` — same TEACHER section-restriction as create, gated `homework.manage`.
5. **i18n:** all validation/error strings via i18n keys.

## Out of scope

Submissions/grading (not in any doc — homework here is an assignment notice, not a submission workflow), a calendar model (Open Question 1), self-scoped parent/student endpoints (Open Question 2), file upload flow beyond accepting an already-hosted `attachmentUrl` (reuses Unit 04's object-storage signed-URL pattern, not reinvented here).

## Definition of done / checks

- Homework CRUD works end to end, tenant + branch isolated.
- A TEACHER restricted to their assigned sections (unassigned section → `403`, assigned → `201`), PRINCIPAL not section-restricted.
- Tenant-isolation test: cross-tenant homework queries return zero rows both via RLS and via a deliberately unscoped query.
- RBAC test: `homework.manage` (PRINCIPAL/TEACHER) pass; OWNER/ADMIN/ACCOUNTANT denied; reads open to any authenticated staff role.
- Branch-scope test: a TEACHER on Branch A denied Branch B's homework.
- Lint + typecheck + tests pass; `progress-tracker.md` updated (23 → done, **Milestone 6 complete**, 24 current).

## Next unit

**24 — Mobile: Parent/Student Layers** (first unit of Milestone 7 — Apps & Dashboards).

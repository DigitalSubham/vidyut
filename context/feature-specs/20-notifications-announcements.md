# Unit 20 — Notifications & Announcements

Read `AGENTS.md`, `data-model.md` (§11), `rbac.md`, `api-conventions.md`, `code-standards.md` first. Reuses Unit 14's `NotificationLog`.

## Open Questions

1. **Audience targeting shape.** `Announcement.audience(Json: roles/classes)` has no defined matching rule for who actually sees a given announcement. **Recommendation:** keep it simple and rule-based, not a query engine — `audience = { roles?: RoleKey[], classIds?: string[] }`; a staff member sees every announcement in their branch (staff aren't audience-filtered, matching how they already see all structural data); a PARENT/STUDENT sees an announcement if `audience.roles` includes their role **or** `audience.classIds` intersects their linked child's/own `classId` — an empty/omitted `audience` object means "everyone in the branch." Real self-scoped parent/student read endpoints are still gated behind whichever unit builds their actual app surface (Unit 24/25), same posture as Unit 19's Open Question 3 — this unit's own scope is the staff-facing CRUD + the data shape, not a parent UI.
2. **"Events/calendar"** (`feature-catalog.md`/`build-approach.md` mention it alongside announcements) has no model anywhere in `data-model.md` — it's a distinct feature (a `CalendarEvent` with a date range, not a notice). **Recommendation:** out of scope for this unit entirely; announcements are a notice board, not a calendar. If a real calendar is wanted later it's a new small unit, not a retrofit onto `Announcement`.
3. **Fan-out delivery.** An announcement is a notice-board record, but the catalog implies push/SMS delivery too ("push/SMS/WhatsApp engine ... delivery logs"). **Recommendation:** publishing an announcement (i.e. creating one, since there's no separate publish step here unlike Unit 19's report cards) enqueues one background job that writes a `NotificationLog(channel: PUSH, templateKey: "announcement.published")` row per targeted user — same stub-send pattern as Unit 14/16's jobs, no real push/SMS/WhatsApp provider integration (that's real infra work, `context/prerequisites.md` territory, not this unit).

## Goal

A school-wide/targeted notice board (`Announcement`) with fan-out delivery logging, sitting on Unit 14's already-built `NotificationLog` rather than inventing new delivery infrastructure.

## Scope

1. **Model** (`data-model.md` §11): `Announcement{ id, tenantId, branchId, title, body, audience(Json), attachmentUrl?, publishedAt, createdById }` (`createdById` added — needed for the issuer, not in the bare doc sketch, mirrors Unit 15's small documented additions). Branch-scoped, RLS per the established pattern.
2. `POST /api/v1/announcements` — creates and immediately sets `publishedAt = now()` (no draft state — matches "circulars" being a fire-and-forget notice, not a workflow needing review), gated `announcement.send`. Enqueues the fan-out job from Open Question 3.
3. `GET /api/v1/announcements?branchId=` — staff roles see every announcement in the branch; broad read (any authenticated staff role).
4. `DELETE /api/v1/announcements/:id` — hard delete (a notice board correction, not an audited financial record), gated `announcement.send`.
5. **`apps/worker/src/processors/announcement-fanout.ts`** — resolves targeted users per Open Question 1's matching rule, writes one `NotificationLog` row per user (stub-sent, same as every other notification processor this session).
6. **RBAC:** `announcement.send` (OWNER/PRINCIPAL/ADMIN) gates all mutations.
7. **i18n:** all validation/error strings via i18n keys.

## Out of scope

Events/calendar (Open Question 2 — no model exists, separate feature), real push/SMS/WhatsApp provider integration (stub only, per Open Question 3), a parent/student self-scoped read endpoint (Open Question 1 — later mobile unit), a draft/review workflow before publishing (announcements publish immediately on create).

## Definition of done / checks

- Announcement CRUD (create/list/delete) works end to end, tenant + branch isolated.
- Creating an announcement enqueues a fan-out job that writes one `NotificationLog` per targeted user, verified against a real `audience` object (roles + classIds cases).
- Tenant-isolation test: cross-tenant announcement queries return zero rows both via RLS and via a deliberately unscoped query.
- RBAC test: `announcement.send` roles (OWNER/PRINCIPAL/ADMIN) pass on create/delete; TEACHER/ACCOUNTANT denied; reads open to any authenticated staff role.
- Branch-scope test: an ADMIN on Branch A denied Branch B's announcements.
- Lint + typecheck + tests pass; `progress-tracker.md` updated (20 → done, 21 current).

## Next unit

**21 — Certificates & IDs.**

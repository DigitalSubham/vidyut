# Unit 54 — Public Site Depth (CMS, Notices, Gallery, Contact)

Read `apps/web-site/` (Unit 29) first.

## Open Questions

1. **CMS scope** — a full page-builder CMS is real, substantial scope. **Resolved: adopted the spec's own recommendation** — a small fixed set of sections (Notices, Gallery, Contact) backed by simple models (`PublicNotice`, reused `GalleryAlbum.isPublic`, flat `Tenant` contact fields), not a generic page/block editor. A full CMS (or an "About" section, which turned out not to need its own model — the existing `Tenant.name`/`address`/`logoUrl` from Unit 29/36 already cover it) remains out of scope.

## Goal

Give each tenant's public site real content beyond the schoolCode lookup + admission form: notices, a photo gallery, and a contact section.

## Scope

1. `PublicNotice` (`title`, `body`, `publishedAt`) — a public-facing subset of Unit 20's `Announcement` concept, separate model since not every internal announcement should be public.
2. Reuse Unit 49's `GalleryAlbum`/`GalleryPhoto` (public-visibility flag) for the site's gallery section.
3. `TenantContactInfo` (`phone`, `email`, `address`, `mapUrl?`) on `Tenant`/`Branch`.
4. New public-site pages: `/notices`, `/gallery`, `/contact`, all reading from the above via the existing `apps/web-site/lib/api-client.ts` pattern.

## Out of scope

A general page-builder/block-based CMS (Open Question 1); a blog (feature-catalog.md's own H-bis row, separately low-priority).

## Definition of done / checks

- All three new public pages render real tenant data for the demo tenant, verified live in a browser.
- `progress-tracker.md` updated.

## Next unit

**55 — Analytics & Reporting (non-AI).**

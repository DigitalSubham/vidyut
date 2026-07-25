@AGENTS.md

# CLAUDE.md — School ERP (SaaS)

**Start here:** the canonical project guide is **`AGENTS.md`** (imported above). It defines what we're building, the locked stack, the golden rules, the repo structure, and the build workflow. Read it first, then the relevant file in `context/`.

## Quick pointers

- **Build context & specs** → `context/`
  - `project-overview.md` · `architecture-context.md` (full architecture + mobile white-label) · `feature-catalog.md` · `build-approach.md` · `code-standards.md` · `ai-workflow-rules.md` · `ui-context.md`
  - **The plan + live progress** → `context/progress-tracker.md`
  - Per-unit specs → `context/feature-specs/NN-*.md`
- **Market/GTM research** → `docs/market-research/`

## Critical rules (full list in AGENTS.md §2 & §8)

- **Multi-tenant:** every tenant row has `tenant_id`; **all DB access goes through `withTenant()`** (Postgres RLS). Never query outside it.
- **Hindi/Hinglish first-class:** all user-facing strings via i18n. Never ship English-only.
- **Offline-tolerant mobile:** attendance & marks work offline and sync.
- **Money as integer paise;** fee/marks changes are ledgered + audited.
- **Long-running / fan-out work** (notifications, PDFs, imports, reminders, rollover, app-builds) runs as **background jobs** (BullMQ), never inside a request handler.
- **Config over code:** report cards, receipts, fee structures, roles, branding = per-tenant data/config, never per-school custom code.
- **Build the complete CORE before selling** (`context/build-approach.md`), one unit at a time; update `context/progress-tracker.md` after each.

## Stack (locked — server-based, see AGENTS.md §3)

Monorepo (pnpm + Turborepo) · **Express + TypeScript** API (always-on Node process, containerized) behind a reverse proxy · **PostgreSQL + Prisma + RLS** · **JWT** auth (+OTP/2FA) · **Next.js** web (public site + admin/super-admin) · **React Native + Expo** single role-based app (EAS builds + OTA; shared + dedicated modes) · **Redis + BullMQ** persistent worker · S3-compatible storage · Zod · i18next (Hindi/English).

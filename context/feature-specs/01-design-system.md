# Unit 01 — Web + Design System Foundation

Read `AGENTS.md` and `context/ui-context.md` before starting.

## Goal

Scaffold the monorepo and the `web-app` Next.js application with our design system, so every later web unit builds on a consistent, Hindi-ready, token-based UI foundation.

## Scope

### 1. Monorepo bootstrap
- Initialize **pnpm workspaces + Turborepo** at repo root.
- Create workspace structure:
  ```
  apps/web-app        (Next.js, App Router, TS)   ← this unit
  packages/config     (shared tsconfig, eslint, tailwind preset)
  packages/ui         (shared UI primitives — start minimal)
  ```
  (Other apps/packages are added in later units; don't scaffold them now.)
- Shared `tsconfig` (strict) and ESLint/Prettier in `packages/config`, consumed by `web-app`.

### 2. Next.js app
- `apps/web-app`: Next.js (App Router) + TypeScript, strict mode.
- Tailwind CSS configured via the shared preset in `packages/config`.
- Global styles in `app/globals.css` with design tokens from `ui-context.md` as CSS custom properties, mapped to Tailwind via `@theme inline`. **Light theme.** No hardcoded hex or raw color classes anywhere.

### 3. Design system
- Install and configure **shadcn/ui** (light theme, tokens wired to our CSS variables).
- Add base components: **Button, Card, Dialog, Input, Label, Select, Table, Tabs, Toast/Sonner, Badge, Sheet** (bottom-sheet-capable).
- Install **lucide-react**.
- Create `lib/utils.ts` with the `cn()` Tailwind-merge helper.
- Do **not** modify generated `components/ui/*` after install.

### 4. Internationalization (i18n)
- Set up **i18next** (with `react-i18next`) with **Hindi (`hi`) + English (`en`)** namespaces.
- Load the brand font stack via `next/font`: **Plus Jakarta Sans** (headings) + **Inter** (body) + **Noto Sans Devanagari** (Hindi).
- Provide a language switcher and a couple of sample translated strings to prove Hindi rendering works end to end. **No hardcoded user-facing strings.**

### 5. App shell (skeleton)
- A minimal authenticated-style layout shell: left sidebar (nav placeholder), top bar (school name / user placeholder), content area — using tokens and components above. Not wired to auth/data yet (that's later units).

## Out of Scope (do NOT build here)
- Auth, database, API, any domain module. This unit is purely the web + design foundation.

## Design Tokens
Use the palette in `context/ui-context.md` (light theme, **Vidyut indigo `#4f46e5` + electric-cyan `#06b6d4`** brand, semantic success/warning/danger for paid/due/overdue). Radius: `rounded-lg` inputs, `rounded-xl` cards, `rounded-2xl` modals/sheets. Icons: lucide (stroke).

## Check When Done
- `pnpm` monorepo builds; `web-app` runs.
- Tailwind + shadcn render with our **light** token theme (no default shadcn dark/neutral leakage; no raw hex).
- `cn()` works; base components import without errors.
- i18n switches between Hindi and English; Devanagari renders correctly; sample strings come from i18n, not hardcoded.
- App shell renders with sidebar/topbar/content using tokens.
- Lint + typecheck pass.
- `context/progress-tracker.md` updated (move Unit 01 to Completed; set Unit 02 as current).

## Next Unit
**02 — Database & Tenancy Foundation** (Postgres + Prisma, `Tenant`/`Branch`, RLS + `withTenant()`).

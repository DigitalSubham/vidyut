# UI Context — School ERP

## Design Principles

Our users are **non-technical**: school owners, accountants, teachers, and parents in Patna/Bihar, many on low-end Android phones, many more comfortable in Hindi. Design for **clarity and trust, not cleverness**.

1. **Light, clean, high-contrast** — a friendly, professional, "safe with our money & data" feel. (Not a dark technical theme.)
2. **Mobile-first** — most parents/teachers are on phones; large tap targets (min 44px), generous spacing.
3. **Hindi/Hinglish first-class** — every label via i18n; UI must not break with Devanagari; icons + text together for low-literacy users.
4. **Outcome-oriented screens** — show fees collected, dues, attendance, results — not abstract "modules."
5. **Fast & forgiving** — clear primary actions, obvious errors, undo where possible, works on slow networks.
6. **Accessible** — WCAG AA contrast, readable font sizes (min 16px body on mobile), no color-only signals.

## Theme (light, token-based)

All colors are CSS custom properties mapped to Tailwind tokens (via `@theme inline` in `globals.css`). Components use tokens — **no hardcoded hex or raw Tailwind color classes** (`zinc-*`, etc.). Values below are the starting palette (tune during the design-system unit).

| Role | CSS Variable | Value |
| --- | --- | --- |
| Page background | `--bg-base` | `#f8fafc` |
| Surface / card | `--bg-surface` | `#ffffff` |
| Subtle surface | `--bg-subtle` | `#eef1f6` |
| Elevated / hover | `--bg-elevated` | `#f1f4f9` |
| Default border | `--border-default` | `#e2e8f0` |
| Strong border | `--border-strong` | `#cbd5e1` |
| Primary text | `--text-primary` | `#0f172a` |
| Secondary text | `--text-secondary` | `#475569` |
| Muted text | `--text-muted` | `#94a3b8` |
| Brand (primary action) | `--brand` | `#4f46e5` (Vidyut indigo) |
| Brand hover | `--brand-hover` | `#4338ca` |
| Brand tint | `--brand-tint` | `#eef0ff` |
| Accent (highlights/data/charts) | `--accent` | `#06b6d4` (electric cyan) |
| Accent deep | `--accent-deep` | `#0e7490` |
| Success (paid/present) | `--success` | `#16a34a` |
| Warning (due soon) | `--warning` | `#d97706` |
| Danger (overdue/absent) | `--danger` | `#dc2626` |
| Info | `--info` | `#0891b2` |

- Money/status use semantic colors consistently: **paid = success, due = warning, overdue = danger, absent = danger, present = success** — plus text/icon, never color alone.
- A dark mode is **not** required for v1 (optional later). Design light-first.

## Typography

- **Headings / brand:** **Plus Jakarta Sans** (modern, tech-forward — matches the Vidyut brand).
- **Body / UI:** **Inter** (clean, dense-table friendly).
- **Hindi (Devanagari):** **Noto Sans Devanagari** fallback. Load all via `next/font`.
- Base body 16px (mobile) / 14–16px (dense web tables). Clear hierarchy; avoid tiny text.
- Numbers/amounts: tabular figures for fee tables.

## Border Radius

| Context | Class |
| --- | --- |
| Inline / inputs / small | `rounded-lg` |
| Cards / panels | `rounded-xl` |
| Modals / sheets | `rounded-2xl` |

## Component Library

shadcn/ui on Tailwind. Add components via the shadcn CLI; **do not modify generated `components/ui/*`**. Build feature UI in app-level components composing these primitives. Icons: **lucide-react**, stroke style, sizes `h-4 w-4` inline / `h-5 w-5` buttons / `h-8 w-8` empty states.

## Layout Patterns

- **Web admin:** left sidebar nav (role-scoped modules) + top bar (school name, session, user) + content area with cards/tables. Data-dense but breathable.
- **Owner dashboard:** KPI cards (collection %, dues, attendance, admissions) up top, then charts/lists.
- **Mobile:** bottom tab nav per role (e.g., parent: Home, Fees, Attendance, Notices, More); big cards; pull-to-refresh; offline banner when disconnected.
- **Modals/sheets:** mobile uses bottom sheets; web uses centered dialogs (`rounded-2xl`).
- **Forms:** single-column, clear labels above inputs, inline validation, sticky primary action.

## Content & Tone

- Plain, respectful language; short labels; Hindi/Hinglish where it aids comprehension.
- Currency in ₹ with grouping (₹1,20,000). Dates in DD/MM/YYYY. Indian number system.
- Empty states explain the next action (e.g., "No students yet — import from Excel").

## Mobile ↔ Web Parity

Shared design tokens and terminology across web and mobile. The same status colors, currency/date formats, and Hindi strings are reused via shared packages so the product feels consistent.

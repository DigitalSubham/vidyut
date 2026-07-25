# Brand Identity — School ERP (modern & tech-forward)

**Brief:** a modern, tech-forward brand for a multi-tenant School ERP, Bihar/Patna-first but pan-India scalable, that still earns the trust of school owners handling fee & student data. Must work as a per-school **white-label** base (colour + logo swap) and read well at small sizes (app icon, favicon). Hindi/Hinglish market.

> **Status:** **Name chosen — Vidyut.** Palette + type locked (below); `ui-context.md` uses these tokens. ⏳ **To do:** domain + trademark check (Vidyut is a real word → verify availability; secure `.com`/`.in` + handles) — tracked in `prerequisites.md`.

## Chosen brand: **Vidyut**

- **Word:** विद्युत — energy / lightning. **Positioning:** *"the energy that powers your school."*
- **Tagline options:** "Powering schools" · "School, energised" · "Run your school with less effort."
- **Mark:** a minimal **spark / lightning bolt** in a rounded square (energy motif) — doubles as app icon/favicon.
- **Wordmark:** `Vidyut` in Plus Jakarta Sans, `Vid` in brand indigo + `yut` neutral (or bolt replacing the dot/accent).

---

## 1. Name shortlist (for the record — Vidyut selected)

Three directions; pick one name. (All need a quick **domain + trademark check** before locking — coined names are safest for that.)

### Direction A — Indian-rooted & meaningful (local trust + resonance)
| Name | Meaning / feel | Notes |
|---|---|---|
| **Vidyut** | विद्युत = energy/lightning — "powering schools" | Energetic, distinctive, Sanskrit root; ⚠ real word → trademark harder |
| **Setu** | सेतु = bridge — connects school ↔ parents | Clear meaning; may be common |
| **Shaala** | शाला = school — direct & ownable (`Shaala`, `ShaalaOS`) | Very on-topic; check usage |

### Direction B — Modern coined / global SaaS (most "tech-forward")
| Name | Feel | Notes |
|---|---|---|
| **Skoolio** | Playful, modern, clearly school/ed | Brandable; easy domain/trademark |
| **Klasio** / **Classio** | "class" + io — very SaaS | Clean, modern |
| **Gradely** | Friendly, modern | Approachable |

### Direction C — Hybrid (brandable + a hint of meaning)
| Name | Feel | Notes |
|---|---|---|
| **Vidyoo** | "Vidya" (knowledge) modernised | Indian + modern |
| **Sampark** | संपर्क = connection/contact | Parent-communication angle |
| **Nditto / Skola** | Abstract, short | Neutral, global |

**Recommendation:** **Skoolio** (safest to trademark/domain, unmistakably modern & ed-focused) or **Vidyut** (more meaning + local energy, if the trademark checks out). Setu/Sampark if you want to lead on the *parent-connection* story.

---

## 2. Colour palette (light-first, modern tech-forward)

Trust-blue was too safe for "tech-forward" — this leans **indigo + electric cyan**: modern SaaS, still credible for money/data. All map to `ui-context.md` tokens.

| Role | Token | Hex |
|---|---|---|
| Brand primary | `--brand` | **#4F46E5** (indigo) |
| Brand deep (hover/press) | `--brand-hover` | #4338CA |
| Brand tint (surfaces) | `--brand-tint` | #EEF0FF |
| Accent (highlights, data, charts) | `--accent` | **#06B6D4** (electric cyan) |
| Accent deep | `--accent-deep` | #0E7490 |
| Page background | `--bg-base` | #F8FAFC |
| Surface / card | `--bg-surface` | #FFFFFF |
| Subtle surface | `--bg-subtle` | #EEF1F6 |
| Border | `--border-default` | #E2E8F0 |
| Text primary | `--text-primary` | #0F172A |
| Text secondary | `--text-secondary` | #475569 |
| Text muted | `--text-muted` | #94A3B8 |
| Success (paid/present) | `--success` | #16A34A |
| Warning (due soon) | `--warning` | #D97706 |
| Danger (overdue/absent) | `--danger` | #DC2626 |
| Info | `--info` | #0891B2 |

Status colour mapping stays semantic: **paid/present = success, due = warning, overdue/absent = danger** — always paired with text/icon, never colour alone. A dark mode is optional later; design **light-first**.

## 3. Typography

- **Headings / brand:** a modern geometric sans — **Plus Jakarta Sans** or **Sora** (tech-forward character).
- **Body / UI:** **Inter** (clean, dense-table friendly).
- **Hindi (Devanagari):** **Noto Sans Devanagari** fallback.
- Numbers/amounts: tabular figures for fee tables. Base 16px mobile.

## 4. Logo direction

- **Wordmark + compact mark** (the mark doubles as app icon/favicon).
- **Mark concept** (pick with the name):
  - *Energy/Vidyut* → a minimal **spark/bolt** inside a rounded square.
  - *Setu/Sampark* → a simple **bridge / linked-nodes** motif (school ↔ parent).
  - *Skoolio/generic* → a geometric **monogram** ("S") or an abstracted **open-book / graduation-cap** reduced to clean geometry.
- **Style:** geometric, minimal, single brand colour + one accent; must be legible at **16px**. Rounded-square app icon, indigo background, white mark.
- **White-label:** per-school builds swap the mark colour + logo; the *shape system* stays ours.

## 5. Tone of voice

Clear, confident, friendly-professional. Plain language; Hindi/Hinglish where it helps. Reassuring about money & data ("your data is safe, and yours to export"). No jargon, no hype. Short sentences. Respectful of non-technical staff and parents.

## 6. App icon direction

Rounded-square, **indigo (#4F46E5)** background, white monogram/mark, high contrast, readable at 24px. Dedicated (white-label) builds recolour to the school's brand while keeping the icon silhouette recognisable.

---

*Next: you pick the name → I finalise this file, update `ui-context.md` tokens to the indigo/cyan palette, and note the domain/trademark check as a task in `prerequisites.md`.*

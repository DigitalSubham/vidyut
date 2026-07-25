# Plans & Entitlements (Vidyut)

Drives **billing** (`Plan`/`Subscription`) and **feature access** (`ModuleToggle` defaults per plan) and **app delivery** (`app_type`). Prices per the market research (`../docs/market-research/PRICING_AND_UNIT_ECONOMICS.md`) — **use as-is** (D8). All amounts are annual, INR; store as **paise**. SMS/WhatsApp are **pass-through wallet** on every plan (not bundled).

## Plan matrix

| | **Starter** | **Standard** (flagship) | **Pro** | **Enterprise / Group** |
|---|---|---|---|---|
| `PlanKey` | `STARTER` | `STANDARD` | `PRO` | `ENTERPRISE` |
| Target | Small, self-serve | ICP core (200–800) | Larger single school | 1,000+ / multi-branch groups |
| Student limit | ≤150 | 150–500 | 500–1,000 | Unlimited / custom |
| Admin+staff users | 15 | 40 | 100 | Custom |
| Branches | 1 | 1 | up to 3 | Unlimited |
| Storage | 5 GB | 20 GB | 50 GB | Custom |
| **App delivery** (`app_type`) | Shared themed | Shared themed | Shared **or** dedicated (add-on) | **Dedicated** branded |
| Support | WhatsApp + video + business hrs | + 1 onsite go-live | Priority + quarterly onsite | Dedicated + SLA |
| **Annual price** | ₹6,000–9,000 | ₹15,000–22,000 | ₹30,000–45,000 | ₹50,000+ (custom) |
| **Setup fee** (one-time) | ₹2,000 | ₹4,000–6,000 | ₹6,000–10,000 | Custom |
| Monthly option (premium to annual) | ₹799/mo | ₹1,799/mo | ₹3,499/mo | — |

> Store concrete launch numbers as the `Plan` seed (e.g., Starter ₹7,999 / Standard ₹18,000 / Pro ₹36,000). Owner can be quoted within the band; keep one canonical figure per plan for billing.

## Module entitlements (ModuleToggle defaults)

Module keys map to `feature-catalog.md`. ✓ = on by default for that plan; add-on = available as paid upsell; — = not available.

| Module (`moduleKey`) | Starter | Standard | Pro | Enterprise |
|---|:--:|:--:|:--:|:--:|
| `students` (+import) | ✓ | ✓ | ✓ | ✓ |
| `attendance` (+parent alerts, offline) | ✓ | ✓ | ✓ | ✓ |
| `fees` (collection, receipts, dues) | ✓ | ✓ | ✓ | ✓ |
| `communication` (announcements, push/SMS/WhatsApp) | ✓ | ✓ | ✓ | ✓ |
| `parent_app` / `teacher_app` (roles in the app) | ✓ | ✓ | ✓ | ✓ |
| `exams_reportcards` | — | ✓ | ✓ | ✓ |
| `admissions` | — | ✓ | ✓ | ✓ |
| `certificates` (TC/bonafide/ID) | — | ✓ | ✓ | ✓ |
| `timetable` | — | ✓ | ✓ | ✓ |
| `homework` | — | ✓ | ✓ | ✓ |
| `online_payment` (Razorpay) | add-on | ✓ | ✓ | ✓ |
| `owner_dashboard` | basic | ✓ | ✓ | ✓ |
| `staff_leave` | — | ✓ | ✓ | ✓ |
| `multi_branch` | — | — | ✓ (≤3) | ✓ |
| `payroll` | — | — | add-on | ✓ |
| `transport` | — | — | add-on | add-on |
| `analytics_advanced` | — | — | ✓ | ✓ |
| `dedicated_app` (white-label store build) | — | — | **add-on** | ✓ |
| `library` / `hostel` / `inventory` / `accounting` | — | — | add-on | add-on |
| AI features | — | — | — | add-on |

## Rules
1. On tenant creation, seed `ModuleToggle` rows from the plan's `modules` JSON. Super-admin can override per tenant (e.g., grant an add-on).
2. **Feature gate everywhere**: API + UI check `ModuleToggle.enabled` for the module before exposing it. Disabled modules are hidden, not just blocked.
3. `app_type` (`SHARED`/`DEDICATED`) comes from the plan (Enterprise = dedicated; Pro = optional add-on). Onboarding branches on it (shared → activate; dedicated → trigger EAS build). See `architecture-context.md` Part 2.
4. Limits (students/users/branches/storage) are enforced at create-time with clear upgrade prompts; over-limit = block new + upsell.
5. **SMS/WhatsApp** are always pass-through via `SmsWallet` — never bundled into the plan price. Online-payment platform fee is a separate revenue line.
6. Setup fee is billed once at onboarding (filters non-serious buyers; funds migration/training).
7. Pilots/references: apply a discount at the `Subscription` level (Year-1), full price on renewal.

*Confirm the exact canonical price per plan before the billing unit (Unit 30). Bands are from the market research; pick one number each for `Plan.priceYear`.*

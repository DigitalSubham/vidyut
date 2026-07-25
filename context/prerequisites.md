# Prerequisites & Readiness Tracker — School ERP

**Purpose:** the single "is everything ready / did we miss anything" checklist to work through **before and during** the build. Also records the decisions locked in discussion so they don't get re-litigated. Update the **Status** as items complete.

**Last updated:** July 2026 · Status keys: ✅ done · 🟡 in progress · ⬜ not started · ⏳ long-lead (start early)

---

## 1. Locked decisions (from discussion)

| # | Decision | Value |
|---|---|---|
| D1 | Deployment | **Server-based, AWS end-to-end** — ECS/Fargate (containers, always-on) + ALB (reverse proxy) + RDS Postgres + ElastiCache Redis + S3 + SES; region **ap-south-1 (Mumbai)**; CloudFront CDN. **No serverless.** |
| D2 | Backend | Express + TypeScript (Node server) · Prisma · multi-tenant shared-schema + RLS (`withTenant`) |
| D3 | Web | Next.js — `web-site` (public) + `web-app` (admin + super-admin) |
| D4 | Mobile | React Native + Expo — **one role-based app**; dual delivery (shared themed + dedicated branded); EAS + OTA |
| D5 | Jobs | Redis + **BullMQ** persistent worker (behind `jobs` interface) |
| D6 | Board focus (v1) | **CBSE first** (report cards, CCE grading, terminology) |
| D7 | **Multi-branch** | **Supported in v1** — school groups / multiple branches under one owner, consolidated view (`branch_id` first-class) |
| D8 | Plans & pricing | **Use the market-research model as-is** — Starter / Standard / Pro / Enterprise, tiered by students (~₹6k–50k/yr) + one-time setup fee + pass-through SMS wallet; dedicated branded app on Pro/Enterprise |
| D9 | Payments | **Razorpay** (UPI-first) + our platform fee |
| D10 | Push | **Firebase FCM** |
| D11 | Build model | **Primarily AI agents write code against specs; founder reviews** → specs must be airtight |
| D12 | Pilot schools | **None yet** — build from CBSE defaults + research; validate later |
| D13 | Brand | **Vidyut** (विद्युत — "energy that powers schools") — modern/tech-forward; indigo `#4f46e5` + electric-cyan `#06b6d4`; spark/bolt mark. See `brand.md`. |
| D14 | Business entity | **Registering soon** (company + GST) — a dependency for Razorpay KYC, invoicing, Play (see §5) |

## 2. Remaining decisions to make (before the unit that needs them)

| # | Open decision | Needed before | Default if undecided |
|---|---|---|---|
| O1 | **SMS + WhatsApp provider** (OTP + notifications, DLT-compliant) | Unit 03 (OTP auth) / Unit 14 (reminders) | MSG91 or Gupshup — pick when auth work starts |
| O2 | Confirm AWS region = ap-south-1 (Mumbai) | Unit 04 (infra) | ap-south-1 |
| O3 | ~~Product name~~ → **RESOLVED: Vidyut** | — | ⏳ pending domain + trademark check (see §5) |
| O4 | Node + pnpm versions to pin | Unit 01 | Node 22 LTS, pnpm latest |

---

## 3. AWS setup checklist (server-based)

| Item | Status | Note |
|---|---|---|
| AWS account + billing alerts + IAM (no root usage) | ⬜ | Enable MFA, budget alarms |
| Region **ap-south-1 (Mumbai)** | ⬜ | Data residency + latency (DPDP-friendly) |
| **ECS on Fargate** — services: `api`, `worker`, `web-site`, `web-app` | ⬜ | Always-on containers |
| **ALB** (Application Load Balancer) + TLS (ACM cert) | ⬜ | Reverse proxy / routing / rate-limit |
| **RDS PostgreSQL** (Multi-AZ later) | ⬜ | Managed Postgres; enable automated backups + PITR |
| **ElastiCache (Redis)** | ⬜ | Cache + BullMQ queue |
| **S3** buckets (docs, report-card PDFs, media) | ⬜ | Private; signed URLs |
| **SES** (email) | ⏳ | Verify domain; **request production access** (sandbox by default — lead time) |
| **ECR** (container registry) | ⬜ | Store built images |
| **CloudFront** (CDN for web assets) | ⬜ | Optional early |
| **Secrets Manager / SSM Parameter Store** | ⬜ | App secrets; never in code |
| **CloudWatch** logs/alarms + **Sentry** | ⬜ | Observability |

## 4. India-specific providers (AWS can't cover these)

| Item | Status | Note |
|---|---|---|
| **Razorpay** account + **business KYC** | ⏳ | Needs the company/GST (D14) for full business KYC; individual KYC possible interim |
| Razorpay Route/settlement setup (platform fee) | ⬜ | For our per-txn platform fee |
| **SMS + WhatsApp provider** (O1) + **DLT registration** | ⏳ | Entity + header + template approval ~1–2 weeks; **start once provider chosen** |
| WhatsApp Business API onboarding + template review | ⏳ | Via the provider |
| **Firebase project** (FCM) | ⬜ | Push notifications |

## 5. Long-lead items — START NOW (bureaucratic, will block later)

| Item | Status | Why urgent |
|---|---|---|
| **Company registration + GST** | ⏳ | D14 "registering soon" — gates Razorpay business KYC, invoicing, cleanest Play account |
| **Google Play Developer account** ($25) | ⏳ | Identity verification now takes days–weeks; needed to publish the app(s) |
| **Razorpay KYC** | ⏳ | Days; needed before payment testing |
| **DLT + SMS/WhatsApp templates** | ⏳ | ~1–2 weeks; needed before OTP/notification testing |
| **SES production access** | ⏳ | Sandbox → production request has lead time |
| **Domain + business email** | ⬜ | Needed for SES, app store, privacy policy URL |
| **"Vidyut" trademark + domain check** | ⏳ | Vidyut is a real word — verify TM class 9/42 availability; secure `.com`/`.in` + social handles; have a fallback name ready |
| (Later) **Apple Developer account** | ⬜ | Only when iOS starts |

## 6. Compliance & legal (also required for Play "Data Safety" + parent signup)

| Item | Status | Note |
|---|---|---|
| Privacy Policy + Terms (live **URLs**) | ⬜ | Required for app store + signup |
| **DPDP Act** compliance checklist (consent, retention, export/delete) | ⬜ | Also a sales trust signal |
| School-facing data-processing note | ⬜ | Schools' student data = we're a processor |
| Play **Data Safety** declaration | ⬜ | Must match what we actually collect |

## 7. Brand identity to create (D13 — modern & tech-forward)

Deliverables (own task): **name shortlist → chosen name**, colour palette (tokens for `ui-context.md`), logo direction + app icon, tone of voice. Feeds: app branding, white-label defaults, design system, store listings. **Blocking for:** final app builds + store listings (not for early backend units).

## 8. Design docs still to write (prevent rework — before their units)

| Doc | For units | Status |
|---|---|---|
| **Data-model / schema spec** → `data-model.md` | Unit 02 | ✅ |
| **RBAC matrix** → `rbac.md` | Unit 03 | ✅ |
| **Plans & entitlements matrix** → `plans-entitlements.md` | Unit 05 / billing | ✅ |
| **Brand identity** → `brand.md` | Unit 01 | ✅ |
| **API conventions** → `api-conventions.md` | Unit 04 | ✅ |
| **Feature specs 02–05** → `feature-specs/02..05` | Units 02–05 | ✅ |
| **Report-card & receipt template requirements** (CBSE) | Unit 12 / 19 | ⬜ |
| **Data-import template spec** (onboarding Excel) | Unit 07 | ⬜ |
| **Wireframes** (fees, attendance, report card, parent home) | Units 7–8 (apps) | ⬜ |

## 9. DevOps / repo setup (server-based)

| Item | Status |
|---|---|
| Monorepo scaffold (pnpm + Turborepo) | ⬜ (Unit 01) |
| **Dockerfiles** for api / worker / web-site / web-app | ⬜ |
| **docker-compose** for local dev (Postgres + Redis + api + worker) | ⬜ |
| **CI/CD** (GitHub Actions): build images → ECR → run Prisma migrations → deploy ECS; tenant-isolation tests | ⬜ |
| Postgres **backup + restore drill** (RDS automated + tested restore) | ⬜ |
| `.env.example` (full env-var list mapped to accounts above) | ⬜ |
| Health checks + restart policy + staging→prod environments | ⬜ |
| **External coding skills** installed + committed (see `coding-skills.md`): frontend-design, react-native-best-practices, vercel-react-best-practices | ⬜ |

---

## 10. Immediate next actions (recommended order)

1. **Kick off long-lead items today** (§5): company/GST, Play account, Razorpay KYC, choose SMS/WhatsApp provider + start DLT, SES production request, domain.
2. **Run the brand exercise** (§7) → get a name + palette.
3. **Write the design docs** (§8) — data-model, RBAC, entitlements, feature specs 02–05 — so the AI agents build against airtight specs.
4. **Provision AWS** (§3) + repo scaffold + Dockerfiles + CI (§9).
5. **Start Unit 01** (`feature-specs/01-design-system.md`) and proceed down `progress-tracker.md`.

*Everything here rolls up into `progress-tracker.md` (build units) and the decision values above. Keep this file current — it's the "nothing missed" source of truth for setup.*

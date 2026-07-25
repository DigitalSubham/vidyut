# Progress Tracker & Build Plan — School ERP

Update this file whenever the current unit, phase, or implementation state changes. Progress must reflect **actual** state, not intent.

## Current Phase

- Milestone 0 — Foundation. Nothing built yet (planning complete).

## Current Goal

- **Unit 01 — Web + Design System Foundation** (see `feature-specs/01-design-system.md`). Specs for Units **01–05 are written and ready**; the whole Milestone 0 foundation can be built without further planning.

---

## The Complete Build Plan (v1 "Complete Core")

Build in this order. Each unit gets a spec in `feature-specs/NN-*.md` (authored when the unit starts). Scope line & rationale: `build-approach.md`. Feature detail: `feature-catalog.md`. Ship this whole list before selling; everything else is On-Demand (bottom).

### Milestone 0 — Foundation
- **01 · Web + Design System Foundation** — monorepo (pnpm+Turborepo) scaffold, `web-app` Next.js, Tailwind + shadcn/ui, design tokens (`ui-context.md`), i18n (Hindi/English), lucide, `cn()`. *(spec ready)*
- **02 · Database & Tenancy Foundation** — Postgres + Prisma, `Tenant`/`Branch` models, `tenant_id` convention, **RLS policies + `withTenant()` helper**, migration baseline, pooling (Accelerate/Neon).
- **03 · Auth & RBAC** — JWT access+refresh (rotation), parent **OTP**, staff password+**2FA** (argon2), roles/permissions model, guards.
- **04 · API Skeleton + Jobs Infra** — Express (always-on Node, `app.listen`), middleware pipeline (rate-limit → auth → tenant-context → RBAC → Zod → handler), OpenAPI, error shape; **Redis + BullMQ worker** + `jobs` interface (first job end-to-end); object storage (R2/S3).
- **05 · Super-Admin: Tenants & Plans** — create/suspend tenant, plan + **module/feature toggles**, `app_type` (shared/dedicated), basic usage metering.

### Milestone 1 — Academic Core
- **06 · Academic Structure** — sessions, classes, sections, subjects, teacher–subject–class mapping, class-teacher.
- **07 · Students + Bulk Import** — student CRUD, adm/roll no., ID basics; Excel import (template + validation + de-dupe via a background job).
- **08 · Parents/Guardians** — guardian accounts, student linking, multi-child, invite.
- **09 · Staff/HR + Leave** — staff records, roles, leave apply/approve.
- **10 · Admissions/Enquiry** — enquiry → application → convert to student; online admission form.

### Milestone 2 — Fees (deep · #1 paying module)
- **11 · Fee Setup** — heads, structures per class/category/session, installments, concessions (RTE/BPL/sibling/staff), fines.
- **12 · Fee Collection + Ledger** — counter collection (cash/cheque/UPI), instant receipt (PDF via background job), ledger, dues/defaulter reports, opening balances.
- **13 · Online Payment + Reconciliation** — Razorpay (UPI), webhooks, reconciliation, platform fee, refunds.
- **14 · Fee Reminders** — scheduled reminders (cron job) via SMS/WhatsApp/push; SMS wallet.

### Milestone 3 — Attendance
- **15 · Attendance (API + Web)** — daily marking, registers, monthly %/defaulter reports.
- **16 · Teacher Mobile Attendance + Parent Alerts** — offline marking + sync; auto absence alert to parents.

### Milestone 4 — Exams & Report Cards (deep)
- **17 · Exam Setup & Grading** — terms, grading schemes (marks/%/grades/CCE), board configs.
- **18 · Marks Entry + Moderation** — grid entry (web + teacher app), >100% guard, review/lock.
- **19 · Report Cards** — configurable templates, bulk PDF (Puppeteer), publish to parents, marks alerts.

### Milestone 5 — Communication & Certificates
- **20 · Notifications & Announcements** — push/SMS/WhatsApp engine, announcements/circulars, events/calendar, delivery logs.
- **21 · Certificates & IDs** — TC/bonafide/character, ID cards, admit cards, issue register.

### Milestone 6 — Scheduling & Homework
- **22 · Timetable** — class + teacher timetable; app views.
- **23 · Homework/Assignments** — assign + parent/student view + calendar.

### Milestone 7 — Apps & Dashboards
- **24 · Mobile App Shell** — single role-based app; role routing; **school-code login + dynamic theming engine** (shared mode); i18n; offline base.
- **25 · Parent App** — fees + online pay, attendance, results/report cards, notices, homework, timetable.
- **26 · Teacher App** — attendance (offline), marks, homework; simple + fast.
- **27 · Web Admin Panel** — role-scoped surfacing of all core modules.
- **28 · Owner/Principal Dashboard** — collection %, dues, attendance, admissions KPIs.
- **29 · Public Site + Online Admission + Branded PWA** — `web-site` SSR, admission form, day-1 branded PWA fallback.

### Milestone 8 — White-Label & Billing
- **30 · Billing & Subscriptions** — plans, invoices, SMS wallet, usage metering, platform-fee revenue.
- **31 · White-Label App Pipeline** — `app.config.js` + `eas.json` per-tenant builds, EAS Build/Submit from super-admin, dedicated mode, **OTA updates**, version tracking. (See `architecture-context.md` Part 2.)

### Milestone 9 — Harden & Launch
- **32 · Offline Sync Hardening** — conflict rules, idempotent sync, delta sync, SMS fallback.
- **33 · Academic-Year Rollover** — promote students to new session, preserve history (churn-critical).
- **34 · Security & Isolation Pass** — tenant-isolation test suite, RBAC audit, backups + restore drill, data export (DPDP), audit logs.
- **35 · Launch Readiness** — seed/demo tenant, Sentry + logs, CI/CD, staging→prod, launch checklist (`build-approach.md` §5).

### On-Demand (AFTER launch, when a paying school needs it)
Transport+GPS · Library · Hostel · Payroll · Accounting · Inventory/procurement · Canteen · Online exams/question bank · LMS/live classes · Discussion/blog/placement · AI features · custom analytics. Build only per the trigger rule in `build-approach.md` §6.

---

## Completed

- (none yet)

## In Progress

- (none)

## Next Up

- Unit 01 — Web + Design System Foundation.

## Open Questions

- **Resolved:** AWS end-to-end — ECS/Fargate + ALB + RDS Postgres + ElastiCache Redis + S3 + SES, ap-south-1 (Mumbai). (See `prerequisites.md`.)
- **Open:** SMS + WhatsApp provider (OTP + notifications, DLT) — MSG91 vs Gupshup — decide before Unit 03/14.
- **Resolved:** brand name = **Vidyut** (indigo/cyan; see `brand.md`); ⏳ trademark + domain check pending.

## Architecture Decisions (log as made)

- Server-based on **AWS** (ECS/Fargate + ALB + RDS + ElastiCache + S3 + SES, ap-south-1); modular monolith.
- Multi-tenant shared-schema + Postgres RLS via `withTenant()`; **multi-branch (school groups) in v1**.
- Express (Node server) API · Next.js web (2 apps) · one role-based RN/Expo app · Redis + BullMQ persistent worker.
- **CBSE first**; plans/pricing per market research as-is; **Razorpay** + **FCM** (SMS/WhatsApp provider TBD); AI-agents build / founder reviews.
- Full decision + setup tracker: `prerequisites.md`.
- Build complete CORE before selling; on-demand modules after.
- Single role-based mobile app; dual delivery (shared themed + dedicated branded), plan-gated.

## Session Notes

- Context scaffold adapted from a spec-driven template; all content now reflects School ERP.
- All build docs live in `context/` (architecture, feature-catalog, build-approach, standards, plan); market & GTM research in `docs/market-research/`.

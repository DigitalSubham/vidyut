# Project Overview — School ERP (SaaS)

## Overview

A multi-tenant School ERP SaaS for private schools, launching in Patna and expanding across Bihar. Schools manage admissions, students, fees, attendance, exams/report cards, and parent communication from a web admin panel; parents, teachers, and students use one role-based mobile app; and we (the SaaS owner) run everything from a super-admin console. Each school is an isolated tenant, and schools on premium plans get their own branded app in the store.

## Goals

1. Let a private school run its **entire academic + administrative year** on one platform.
2. Make **fee collection** faster and trackable (the #1 reason schools buy).
3. Keep **parents informed** automatically (attendance, fees, results) — replacing chaotic WhatsApp.
4. Cut manual clerical work (report cards, certificates, records).
5. Work reliably in **Hindi/Hinglish**, on low-end devices, with **offline** attendance/marks.
6. Let us onboard, bill, and manage many schools as isolated tenants, and generate **per-school branded apps** on demand.

## Primary Users (roles)

- **School Owner / Director** — economic buyer; watches fees/cash; wants control + less manual work.
- **Principal / Academic Head** — attendance, exams, report cards, staff oversight.
- **Accountant / Fee Clerk** — fee collection, receipts, dues, reconciliation (key adopter).
- **Admin / Office Staff** — student records, admissions, certificates.
- **Teacher** — attendance, marks, homework (adoption gatekeeper; needs a dead-simple app).
- **Parent** — attendance/fee/result alerts, online fee payment, communication.
- **Student** — timetable, homework, results.
- **Super-Admin (us)** — tenant provisioning, plans/billing, module toggles, white-label app builds, support.

## Core User Flows

**School onboarding (super-admin):** create tenant → set plan + enabled modules → import students (Excel) → configure fee structures + report-card templates → invite staff/parents → (if plan = dedicated) trigger branded app build; else activate shared app.

**Daily school ops:** clerk collects fees → prints/share receipt → dues update; teacher marks attendance (offline ok) → parent gets absence alert; teacher enters marks → principal moderates/locks → report cards generated → published to parents.

**Parent:** open app (enter school code or dedicated branded app) → see attendance/fees/results → pay fees via UPI → receive alerts.

## Feature Scope

### v1 — Complete Core (build before selling)
Multi-tenancy + RBAC + super-admin + white-label pipeline · academic structure · students + import · staff + leave · admissions · **fees (deep)** · **attendance (offline) + parent alerts** · **exams + report cards (deep)** · communication (push/SMS/WhatsApp) · certificates/TC/ID · timetable · homework · single role-based mobile app (shared + dedicated modes) · school web admin · owner dashboard · public site + online admission + branded PWA · offline sync · academic-year rollover · data import/export.

Authoritative scope line: `build-approach.md`. Full feature universe: `feature-catalog.md`.

### On-Demand (build when a paying school needs it)
Transport + GPS · library · hostel · payroll · accounting · inventory/procurement · canteen · online exams/question bank · LMS/live classes · discussion/blog/placement · AI features · advanced/custom analytics.

### Out of Scope (for now)
Government-school tender sales · non-school institutes (beyond incidental) · deep board-integration automation · anything not needed to run a Patna private school's core year.

## Success Criteria

1. A design-partner school runs fees end-to-end (structure → collect → receipt → dues → reminder → online pay → reconcile).
2. Teachers mark attendance offline; parents reliably get absence alerts.
3. A full term of exams → board-format report cards is generated and published.
4. Admissions → student → fees works for a new admission.
5. Academic-year rollover promotes students to a new session without data loss.
6. Super-admin can onboard a tenant, set plan/modules, bill, and provision the app (shared or dedicated).
7. Data import works on a real school's messy Excel; data export works (DPDP).
8. Tenant isolation holds (automated cross-tenant tests pass).

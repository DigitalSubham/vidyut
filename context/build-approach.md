# Build Approach — Complete Core Before Selling

**Prepared:** July 2026 · Companion to `architecture-context.md` and `feature-catalog.md`

**Decision (locked by founder):** we build the **complete core product in one go**, then start selling. We do **not** launch a thin MVP and iterate publicly. New/optional features and fixes are added **on demand** — when a paying school asks, or an issue surfaces.

This document defines exactly what "complete" means (so it doesn't become "everything, forever"), the internal build order, and how to de-risk a build-first approach.

---

## 1. Why build-first is defensible here (and where it's dangerous)

**Defensible, because an ERP is operationally all-or-nothing.** A school runs its *whole* year on the system — admissions, fees, attendance, exams, report cards, communication. If you onboard a school mid-year and a workflow they depend on is missing, you get churn and reputational damage. So a coherent, complete-enough product beats a bare MVP for this category. The white-label "your own app" positioning also implies a finished product.

**Dangerous, if "complete" means "every one of the 80+ features / 25 modules."** That risks:
- **12–24 months to first revenue** with zero market feedback (small team, web + mobile + super-admin + white-label pipeline + all modules).
- **Building unvalidated depth** — spending months on library/hostel/transport-GPS/payroll/inventory/AI that few Patna schools use, while the fee module isn't deep enough to win.
- **Scope creep / never shipping** — "complete" is a moving target.

**Resolution:** build the **complete CORE** (a school can run its entire year on it), and defer genuinely optional modules to **on-demand**. That satisfies "complete product before selling" without the year-long unvalidated-build trap.

---

## 2. The scope line — v1 "Complete Core" vs "On-Demand"

### ✅ v1 COMPLETE CORE — build before selling
Everything a private school needs to run a full academic + administrative year:

**Platform & foundation**
- Multi-tenancy (tenant_id + RLS), RBAC, JWT/OTP auth, Hindi/Hinglish i18n
- Super-admin console: tenant provisioning, plan/module toggles, billing/subscriptions, SMS wallet
- Notifications engine (push/SMS/WhatsApp), audit logs, backups, data import/export
- White-label build pipeline (EAS) + dual app mode (shared + dedicated)

**Academics & students**
- Academic sessions, classes, sections, subjects, teacher mapping
- Student records + bulk import + ID cards; parent/guardian accounts
- Staff records + leave management
- Admissions / enquiry (capture → application → convert to student)

**The paying core**
- **Fees (deep):** heads, structures, concessions/discounts, fines, installments, collection, receipts, dues/defaulter lists, ledger, reminders, online payment, reconciliation
- **Attendance:** daily (offline teacher app), parent absence alerts, reports
- **Exams + report cards (deep):** term setup, grading schemes (incl. CBSE CCE), marks entry, moderation/lock, board-format report cards, publish to parents
- **Communication:** announcements, circulars, absence/fee/result alerts, events/calendar
- **Certificates:** TC, bonafide, character, ID/admit cards

**Apps & dashboards**
- Single role-based mobile app (parent + teacher/staff + student) — shared mode + dedicated-build mode
- School web admin panel
- Owner/principal dashboard (collection %, dues, attendance, admissions)
- Public school site + online admission + branded PWA fallback

**Cross-cutting**
- Timetable, homework/assignments
- Offline sync, academic-year rollover, standard reports + exports

### 🕒 ON-DEMAND — build when a paying school needs it (or it's a clear upsell)
- Transport + GPS tracking
- Library management
- Hostel / dormitory
- Payroll (statutory PF/ESI/TDS)
- Full accounting / finance ledgers
- Inventory / assets / procurement
- Canteen / cafeteria
- Visitor/front-office extras (postal, call log)
- Health/medical records
- Online examination, question bank/paper generator
- LMS / live classes / content library
- Discussion forums, blog/CMS, placement
- AI features (chatbot, auto-remarks, predictions, face recognition)
- Advanced/custom analytics & report builder

> These are **not** second-class — they're real modules. But they're not needed to run a typical Patna private school's core year, so building them before revenue is the trap. The modular monolith (see architecture §5) is structured so each bolts on cleanly later.

---

## 3. Internal build sequence (even though you launch all at once)

Build in dependency order so nothing blocks and you can dogfood early:

1. **Foundation** — monorepo, Express+TS, Postgres+Prisma+RLS (`withTenant`), auth, RBAC, i18n, config, audit, Redis/BullMQ, super-admin provisioning, notifications engine.
2. **Academic structure + students + staff + admissions.**
3. **Fees (deep)** — the #1 paying module.
4. **Attendance** (offline teacher app) + parent alerts.
5. **Exams + report cards (deep)** + publish.
6. **Communication + certificates + timetable + homework.**
7. **Mobile app (single role-based, shared mode) + web admin + owner dashboard.**
8. **Super-admin + white-label pipeline (EAS) + dedicated-app mode + billing.**
9. **Harden** — offline sync, isolation tests, backup/restore drill, academic-year rollover, PWA.
10. **Launch complete core → then on-demand modules by request.**

---

## 4. De-risking the build-first path (do these, they're cheap and high-ROI)

Building the whole core first is fine **if you're not building blind for a year.** Three moves:

1. **Run the Phase-0 customer interviews NOW, before/at the start of the build** (scripts in `../docs/market-research/CUSTOMER_DISCOVERY_PLAN.md`). A few weeks of talking to Patna school owners/accountants/teachers tells you which modules need *depth*, which report-card and receipt formats are non-negotiable, and what will make them switch. Building informed ≫ building on assumptions.
2. **Recruit 2–3 "design-partner" schools** who commit to adopt at launch and give feedback *during* the build. You still build the whole core first — but shaped by real schools, not guesses. Highest-ROI move for this path. Offer them a steep discount / free first year in exchange for feedback + testimonial + referrals.
3. **Set a hard v1 scope line (this doc) + a target launch date.** Freeze the "complete core" list; anything not on it is on-demand/post-launch. This prevents "complete" from sliding into "everything" and never shipping.

---

## 5. Definition of Done — v1 launch readiness checklist

Launch the complete core only when:

- [ ] A design-partner school can run **fees end-to-end**: structure → collect → receipt → dues → reminder → online payment → reconcile.
- [ ] Teachers mark **attendance offline**, parents get absence alerts reliably.
- [ ] A full **term of exams → board-format report cards** generated and published to parents.
- [ ] **Admissions → student → fees** flow works for a new admission.
- [ ] **Academic-year rollover** tested (promote students into a new session without data loss).
- [ ] Mobile app (shared mode) live on Play; **dedicated-app pipeline** produces a branded build that passes review.
- [ ] Super-admin can **onboard a tenant, set plan/modules, bill**, and provision the app.
- [ ] **Data import** works on a real school's messy Excel; **data export** works (DPDP).
- [ ] **Tenant-isolation tests** pass; **backup + restore** drill done.
- [ ] Hindi/Hinglish UI complete across core flows; SMS/WhatsApp templates DLT-approved.
- [ ] Owner dashboard shows collection %, dues, attendance, admissions.

---

## 6. What triggers building an on-demand module

Build a deferred module when **any** is true:
- A **paying** school (or a hot prospect worth ≥₹X ARR) requires it to sign/renew.
- ≥3 existing schools request the same module (pattern = real demand).
- It's a clear **upsell/premium** revenue opportunity with validated willingness to pay.

Prioritise by (revenue unlocked) × (number of schools) ÷ (build effort). Never build a deferred module on a single unpaid "would be nice."

---

## 7. Rough timeline & cash note `[Estimated]`

- Building the complete core (small team, 1–3 devs) is realistically a **multi-month effort** — plan runway accordingly, since there's **no revenue during the build**.
- Mitigate: design-partner discounts can bring *some* early cash + commitment; run interviews + prospecting in parallel so a sales pipeline exists **on launch day**, not started from zero.
- Keep the on-demand modules genuinely deferred — every month spent on library/hostel/AI pre-launch is a month of runway with no validation.

> Bottom line: **complete *core* before selling = reasonable for an ERP. Complete *everything* before selling = the trap.** This document is the line between the two — defend it.

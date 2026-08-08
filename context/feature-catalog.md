# School ERP — Complete Feature Catalog

**Prepared:** July 2026 · Project: multi-tenant School ERP SaaS (Patna/Bihar first)
**Last audited:** 2026-07-27, against real code (not intent), after Units 1–35 of the v1 "Complete Core" build plan.
**Purpose:** the exhaustive, "don't-miss-anything" master list of every feature the platform could contain — mapped to the user roles who use it, a build-priority phase, and a real build-status check. This is the *catalog*, not the *build order*. **You do not build all of this before launch** — the MSP (Phase P0) is the sellable core (see `../docs/market-research/PRICING_AND_UNIT_ECONOMICS.md`). Everything else is sequenced after paying customers exist.

> **Cleanup note:** this file previously had a full duplicate Appendix (a second, granular restatement of every module below, pasted in from an old separate document). It added no information not already in the tables below, so it's been removed — this is now the single copy.

---

## How to read this document

**Status** (added on the 2026-07-27 audit, checked against real code — not every row existed before this pass, so treat any row *without* a status mark as **not yet re-audited**, which in this codebase means not built):

| Mark | Meaning |
|---|---|
| ✅ | Built and covered by a passing automated test |
| ⚠️ | Partially built — see the note for exactly what's missing |
| ❌ | Not built at all |

**Priority phases** (from the market research verdict — sell outcomes, not modules):

| Tag | Phase | Meaning |
|---|---|---|
| **P0** | Minimum Sellable Product | Must exist before the first sale. The paying wedge: fees, comms, report cards, records, attendance. |
| **P1** | Fast-Follow (≤6 months) | Sold to early adopters right after launch; strengthens retention. |
| **P2** | Later (6–18 months) | Add-on modules; sold as upsell once base is stable. |
| **P3** | Premium / Optional | High-effort or niche; premium tiers, large schools, or differentiation. |

**Roles** (who touches the feature): **SA**=Super-Admin (ERP owner) · **OWN**=School Owner/Director · **PRIN**=Principal/Academic Head · **ADM**=Admin/Office Staff · **ACC**=Accountant/Fee Clerk · **TCH**=Teacher · **PAR**=Parent · **STU**=Student · **LIB**=Librarian · **TRN**=Transport in-charge · **HR**=HR/Payroll · **GATE**=Gate/Security.

**Platform legend:** 🖥️ Web admin · 📱 Mobile app · 🌐 Public site · ⚙️ Super-admin console.

---

## Quick status overview (read this first)

**The whole P0 "Complete Core" is code-complete and tested (170 automated tests, all passing) — but three things stand between that and an actual public launch, none of them buildable further without the user doing real-world setup:**

1. **No live mobile app.** No Google Play / Apple developer account exists yet. The white-label build pipeline is real code but has never run against a real EAS credential.
2. **No real SMS/WhatsApp/push sending.** Every notification in this codebase — fee reminders, absence alerts, announcements, OTP — is a stubbed `console.log`. The queue → log → wallet-debit pipeline around it is real and tested; the actual provider call is not.
3. **No real AWS environment.** The deployment runbook is written but has never been executed against a real staging/production environment.

**Within the product itself, the confirmed gaps are:**
- **Settings/configuration, branch management, user & role management** — ✅ **built and tested (Unit 36)**, closing the gap Unit 34's repo-wide audit confirmed. One caveat: custom roles are capped at one per tenant today (a real, disclosed schema constraint — see Unit 36's progress-tracker entry).
- **Global search** ✅, **fee reconciliation** ✅ (Unit 37/38), **DPDP consent/retention/delete** ✅ (Unit 39 — mechanism built; consent text and retention windows still need real legal sign-off, see `context/dpdp-policy.md`).
- **Web admin panel** only has UI for 4 of ~14 modules (students, fees, attendance, dashboard) — the rest are API-only.
- **Offline support** covers attendance only — marks entry and homework posting need a live connection.
- Everything in Parts B2–B4, D1–D4/D6, F (beyond the owner dashboard), G, and most of E5–E7 is **untouched by design** — these are On-Demand modules, built only when a paying school asks (`build-approach.md` §6), not gaps in the current build.

**Module-by-module status is below.** Part I (near the end) has the same summary in build-order form; this section is the same information, quick-scan form.

---

# PART A — CORE ACADEMIC & STUDENT INFORMATION SYSTEM (SIS)

## A1. Student Management `[P0]`
| Feature | Status | Detail | Roles | Phase |
|---|---|---|---|---|
| Student profile | ✅ | Personal, contact, address, DOB, gender, blood group, category, religion, photo URL, custom fields (JSONB) — built (Unit 07) | ADM, TCH, PAR | P0 |
| Unique admission/enrollment number | ✅ | Auto-generated (`nextAdmissionNo`), sequential per branch — built (Unit 07) | ADM | P0 |
| Roll number management | ✅ | `Enrollment.rollNo`, settable per section — built (Unit 07) | ADM, TCH | P0 |
| Guardian/parent linkage | ✅ | Multiple guardians, primary/pay flags — built (Unit 08) | ADM, PAR | P0 |
| Sibling linking | ❌ | Group siblings for fees/discounts/comms — not built | ADM, ACC | P1 |
| Category/caste/religion fields | ✅ | `Student.category`/`religion` fields exist — built (Unit 07) | ADM | P0 |
| Student documents vault | ❌ | Birth cert, Aadhaar, prev. TC, photos (upload/store) — not built | ADM | P1 |
| Medical/health info | ❌ | Allergies, conditions, emergency contact — not built | ADM, PRIN | P1 |
| Custom fields | ✅ | `Student.customFields` JSONB column exists — built, no dedicated UI to manage the schema of what goes in it | ADM | P1 |
| Bulk import (Excel/CSV) | ⚠️ | Templated import + validation + de-dupe — built (Unit 07 worker job), tested only against synthetic fixtures, never a real school's messy spreadsheet | ADM | P0 |
| Student status | ✅ | Active, inactive, TC issued, alumni, struck-off (`StudentStatus` enum) — built | ADM | P0 |
| Class/section assignment | ✅ | Assign & reassign via `Enrollment` — built (Unit 07) | ADM | P0 |
| Student promotion (year-end) | ✅ | Bulk promote/detain to next class/session — built and tested (Unit 33 rollover) | ADM, PRIN | P0/P1 |
| Roll-back / re-admission | ⚠️ | Rollover supports REPEAT; there's no explicit "re-admit a previously withdrawn student" flow | ADM | P1 |
| Transfer between sections/branches | ❌ | Move students; multi-branch — not built as a dedicated feature | ADM | P2 |
| Alumni management | ❌ | Post-graduation records, alumni portal — not built | ADM | P3 |
| Student ID card generation | ⚠️ | Templated, with photo + barcode/QR — built (Unit 21, single-issue only via `Certificate.ID_CARD`); no bulk print, no QR/photo layout | ADM | P1 |
| Student search & filters | ✅ | By name, admission no.; built (Unit 07, `search` query param) | ADM, TCH | P0 |
| Student timeline/log | ❌ | Activity, discipline, achievements — not built | PRIN, TCH | P2 |

## A2. Admission & Enquiry (CRM) `[P1 — light version P0]`
| Feature | Status | Detail | Roles | Phase |
|---|---|---|---|---|
| Enquiry capture | ✅ | Walk-in / phone / online enquiry log — built (Units 10, 29: staff + public) | ADM, OWN | P1 |
| Lead pipeline | ✅ | Stages: enquiry → visited → applied → admitted — built (Unit 10) | ADM, OWN | P1 |
| Online admission form | ✅ | Public form on website; parent self-apply — built (Unit 29, enquiry only, not full Application self-apply) | PAR, ADM | P1 |
| Registration/application fee | ❌ | Collect online at apply — not built | PAR, ACC | P1 |
| Entrance test / interview scheduling | ❌ | Slots, results — not built | ADM, PRIN | P2 |
| Merit list / seat allotment | ❌ | Rank, offer, waitlist — not built | ADM, PRIN | P2 |
| Offer letter / admission confirmation | ❌ | Auto-generate, email/print — not built | ADM | P2 |
| Document collection checklist | ❌ | Required docs tracking — not built | ADM | P1 |
| Convert applicant → student | ✅ | One-click, carry data over — built (Unit 10, `convertApplication`) | ADM | P1 |
| Admission analytics | ⚠️ | Source, conversion %, seats filled — partial (Unit 28 dashboard funnel only) | OWN, PRIN | P2 |
| Enquiry follow-up reminders | ❌ | Tasks + notifications — not built | ADM | P1 |

## A3. Parent / Guardian Management `[P0]`
| Feature | Status | Detail | Roles | Phase |
|---|---|---|---|---|
| Parent accounts | ✅ | Login per guardian; linked to child(ren) — built (Unit 08, OTP login) | PAR | P0 |
| Multi-child single login | ✅ | One parent → many students — built (`resolveGuardianStudentIds`) | PAR | P0 |
| Contact management | ⚠️ | Phone + email exist on `Guardian`; no dedicated "alternate contact" or WhatsApp-specific field | ADM, PAR | P0 |
| Parent app onboarding | ✅ | Invite via SMS/link; OTP login — built (Unit 08); the SMS itself is a stub, same caveat as the whole notifications engine | PAR | P0 |
| Communication preferences | ❌ | Opt-in SMS/WhatsApp/push/email — not built (nothing to opt out of yet, since sends are stubbed) | PAR | P1 |
| Guardian access control | ✅ | `StudentGuardian.isPrimary`/`canPay` flags — built (Unit 08) | ADM | P2 |

## A4. Staff / Teacher / HR Records `[P0 basic → P2 full HR]`
| Feature | Status | Detail | Roles | Phase |
|---|---|---|---|---|
| Staff profile | ✅ | Personal, contact, qualifications, designation — built (Unit 09) | HR, PRIN | P0 |
| Employee ID + role assignment | ✅ | `employeeNo` + RBAC role — built (Unit 09) | ADM, SA | P0 |
| Teaching vs non-teaching classification | ✅ | `StaffType` enum (TEACHING/NON_TEACHING) — built (Unit 09) | HR | P1 |
| Subject/class allocation to teacher | ✅ | `TeacherAssignment` — built (Unit 09) | PRIN | P0 |
| Staff documents | ✅ | Presigned upload via Unit 04's S3 wrapper, `{key,label}` in `Staff.docs` — built and tested (Unit 42) | HR | P1 |
| Staff attendance | ✅ | Manual/app/web (same shape as student attendance) — built and tested (Unit 42, `StaffAttendanceRecord`); biometric/RFID device integration still not built | HR, PRIN | P1 |
| Leave management | ✅ | Types, balances, apply/approve workflow — built and tested (Unit 09, `LeaveRequest`) | HR, TCH | P1 |
| Staff ID card | ✅ | Issues through the same certificates register as student certificates — built and tested (Unit 42, `Certificate.staffId`) | HR | P2 |
| Recruitment/onboarding | ❌ | Applicant tracking, joining — not built | HR | P3 |
| Appraisal / performance | ❌ | Reviews, ratings — not built | PRIN, HR | P3 |
| Staff directory | ✅ | Searchable list endpoint — built (Unit 09) | PRIN, ADM | P1 |

## A5. Academic Structure `[P0]`
| Feature | Status | Detail | Roles | Phase |
|---|---|---|---|---|
| Academic session/year | ✅ | Create, set active, roll over — built and tested (Unit 06 + Unit 33 rollover) | ADM, PRIN | P0 |
| Class/grade management | ✅ | Nursery → XII — built (Unit 06) | ADM | P0 |
| Section management | ✅ | A/B/C, capacity — built (Unit 06) | ADM | P0 |
| Stream/group (XI–XII) | ✅ | Science/Commerce/Arts — confirmed with the user as a separate `Class` row per stream (e.g. "Class 11 Science"), zero new schema; elective baskets built and tested (Unit 43, `ElectiveGroup`/`StudentElectiveChoice`) | ADM | P1 |
| Subject management | ✅ | Subjects per branch, core/elective — built (Unit 06) | ADM, PRIN | P0 |
| Subject groups / combinations | ❌ | Elective baskets — not built | PRIN | P2 |
| Teacher-subject-class mapping | ✅ | `TeacherAssignment` grid — built (Unit 09) | PRIN | P0 |
| Class teacher assignment | ✅ | One per section (`Section.classTeacherId`) — built (Unit 09) | PRIN | P0 |
| House system | ✅ | Simple house tagging + roster (no scoring engine, D6 territory) — built and tested (Unit 43) | PRIN | P3 |

## A6. Attendance `[P0]`
| Feature | Status | Detail | Roles | Phase |
|---|---|---|---|---|
| Student daily attendance | ✅ | Mark present/absent/late/leave/half-day — built and tested (Unit 15) | TCH | P0 |
| Period-wise attendance | ✅ | Per subject/period — `AttendanceRecord.periodId` (nullable, references `TimetablePeriod`), coexists with daily attendance via partial unique indexes; mobile teacher screen has a period picker alongside daily (Unit 44) | TCH | P2 |
| Parent absence alert | ✅ | Auto alert when marked absent — built and tested (Unit 16, PUSH/SMS-fallback hardened Unit 32); the send itself is stubbed | PAR | P0 |
| Attendance via mobile app | ✅ | Teacher app, real offline queue (WatermelonDB) — built (Unit 16), idempotent-retry-safe + delta-synced (Unit 32) | TCH | P0 |
| Biometric/RFID integration | ⚠️ | Generic `POST /attendance/device-scan` webhook-shaped ingestion endpoint built (Unit 44), device-token authenticated; no specific ESSL/Mantra vendor SDK wired — no real device to test against | ADM, TRN | P2 |
| Face-recognition attendance | ❌ | Camera-based — not built | ADM | P3 |
| Bulk / holiday marking | ✅ | Whole-class batch marking, `HOLIDAY` status — built (Unit 15) | TCH, ADM | P0 |
| Attendance registers/reports | ✅ | Daily, monthly %, defaulters — built and tested (Unit 15) | TCH, PRIN | P0 |
| Attendance analytics | ✅ | `GET /attendance/analytics` — real day-by-day percent trend + chronic-absentee list (`>= N` absences in a date range), reusing the defaulter list's percent logic (Unit 44) | PRIN | P1 |
| Staff attendance | ✅ | (see A4) — built and tested (Unit 42) | HR | P1 |
| Leave/attendance regularization | ✅ | Correct wrong marks, audited — built and tested (Unit 15) | TCH, ADM | P1 |

## A7. Homework / Assignments `[P1]`
| Feature | Status | Detail | Roles | Phase |
|---|---|---|---|---|
| Assign homework | ✅ | Per class/subject, attachments — built (Unit 23) | TCH | P1 |
| Parent/student view | ✅ | On app, due dates — built (Unit 24/25, `/me/homework`) | PAR, STU | P1 |
| Submission (digital) | ✅ | Presigned upload, self-scoped to the caller's own child; upsert on resubmission; mobile Parent/Student app has a real Submit button (`expo-document-picker`) (Unit 45) | STU | P2 |
| Grading/feedback | ✅ | Grade + feedback per submission, distinct from exam `MarksEntry`; mobile Teacher app has a Grading tab (Unit 45) | TCH | P2 |
| Homework calendar | ✅ | `GET /me/homework/calendar` — same data as the list, grouped by due-date day within a month; mobile Calendar tab (Unit 45) | STU, PAR | P1 |

## A8. Examination & Assessment `[P0]`
| Feature | Status | Detail | Roles | Phase |
|---|---|---|---|---|
| Exam/term setup | ✅ | Unit tests, half-yearly, annual — built (Unit 17) | PRIN, ADM | P0 |
| Grading schemes | ✅ | Marks, grades, CBSE CCE, CGPA, percentage — built (Unit 17/18, CBSE 9-band grading) | PRIN | P0 |
| Exam timetable | ✅ | Dates, rooms — `ExamTimetable`, distinct from Unit 22's class-period timetable (Unit 46) | ADM | P1 |
| Marks entry | ✅ | Per subject, by teacher; app + web — built (Unit 18) | TCH | P0 |
| Marks moderation/lock | ✅ | Approve & lock — built (Unit 18, `lockMarksEntry`) | PRIN | P1 |
| Report card generation | ✅ | Configurable templates, school logo — built (Unit 19); PDF render is a stub job | ADM, PRIN | P0 |
| CBSE/ICSE/State-board formats | ⚠️ | CBSE grading built; template is generic, not board-specific layouts | PRIN | P0/P1 |
| Co-scholastic / grades | ✅ | Discipline, activities via `CoScholasticGrade`, alongside scholastic `MarksEntry` (Unit 46) | TCH | P1 |
| Auto teacher remarks | ❌ | Templated/AI comments — not built | TCH | P2 |
| Consolidated result / rank | ✅ | `GET /exams/:id/results/rank` — computed from existing `MarksEntry`, no new input data (Unit 46) | PRIN | P1 |
| Transcripts / cumulative record | ✅ | `GET /students/:id/transcript` — multi-session published-`ReportCard` rollup (Unit 46) | ADM | P2 |
| Progress reports to parents | ✅ | Publish to app; download PDF — built (Unit 24/25, only `publishedAt`-set rows show; PDF is a stub) | PAR | P0 |
| Online examination | ✅ | MCQ-only (`OnlineExam`/`OnlineExamQuestion`/`OnlineExamSubmission`), auto-graded on submit; mobile student-facing take/submit flow via a new self-scoped `GET /online-exams/mine` discovery endpoint; descriptive/subjective out of scope (Unit 46) | TCH, STU | P2 |
| Question bank | ✅ | `QuestionBankItem`, filterable by class/subject, copied (not referenced) into an `OnlineExam` (Unit 46) | TCH | P3 |
| Admit card / hall ticket | ✅ | Generate for exams — built (Unit 21, `ADMIT_CARD` certificate type) | ADM | P1 |
| Grade/result analytics | ❌ | Subject-wise, pass %, weak areas — not built | PRIN | P1 |

## A9. Timetable & Scheduling `[P1]`
| Feature | Status | Detail | Roles | Phase |
|---|---|---|---|---|
| Class timetable | ✅ | Period grid per section — built (Unit 22) | PRIN, ADM | P1 |
| Teacher timetable | ✅ | Per teacher view — built (Unit 22, via `/me`) | TCH | P1 |
| Auto/smart timetable generation | ❌ | Constraint-based generator — explicitly deferred, no validated demand (Unit 47's own Open Question 1) | PRIN | P3 |
| Substitution management | ✅ | Same-day per-period override, doesn't touch the recurring grid — `Substitution` model, double-booking guard on substitute teacher + room, web-only UI (principal's "today" view + assign form) (Unit 47) | PRIN | P2 |
| Room/lab allocation | ✅ | Room kept as free text (not a full `Room` model — no capacity/type management asked for), clash-checked at substitution time (Unit 47) | ADM | P3 |
| Timetable on app | ✅ | Parent/student/teacher view — built (Unit 24/25, `/me/timetable`) | all | P1 |

## A10. Lesson Planning, Curriculum & LMS `[P2/P3]`
| Feature | Status | Detail | Roles | Phase |
|---|---|---|---|---|
| Syllabus / curriculum tracking | ❌ | Chapters, progress — not built | TCH, PRIN | P2 |
| Lesson plans | ❌ | Weekly/daily plans — not built | TCH | P2 |
| Study material / content library | ❌ | Notes, PDFs, videos — not built | TCH, STU | P2 |
| Online classes / live video | ❌ | Zoom/Meet integration — not built | TCH, STU | P3 |
| Recorded lectures | ❌ | Store & stream — not built | STU | P3 |
| Digital assignments/quizzes | ❌ | (see A7/A8) — not built beyond what's listed there | TCH | P2 |
| Learning analytics | ❌ | Engagement, completion — not built | PRIN | P3 |

*A10 is entirely On-Demand scope (`build-approach.md` §6) — nothing here was in the v1 plan, so "not built" reflects the plan, not a gap.*

---

# PART B — FEES & FINANCE

## B1. Fee Management `[P0 — the #1 paying wedge]`
| Feature | Status | Detail | Roles | Phase |
|---|---|---|---|---|
| Fee heads/components | ✅ | Tuition, transport, exam, admission, misc — built (Unit 11) | ACC, OWN | P0 |
| Fee structures | ✅ | Per class/category/session — built (Unit 11) | ACC | P0 |
| Installments / due schedule | ✅ | Monthly/quarterly/term — built (Unit 11) | ACC | P0 |
| Discounts / concessions / scholarships | ✅ | Sibling, staff, merit, RTE — built (Unit 11, generic concession, no sibling-specific auto-detect) | ACC, OWN | P0 |
| Fine / late-fee rules | ✅ | Auto-apply after due date — built (Unit 11, `FineRule`) | ACC | P1 |
| Fee collection (counter) | ✅ | Cash/cheque/UPI/card entry — built (Unit 12) | ACC | P0 |
| Instant receipt | ✅ | Receipt no. — built (Unit 12); PDF render is a stub job | ACC, PAR | P0 |
| Online fee payment | ✅ | UPI/card/netbanking via gateway — built (Unit 13, Razorpay + real HMAC webhook) | PAR | P1 |
| Partial/advance payment | ✅ | Adjust ledger — built (Unit 12) | ACC | P1 |
| Dues & defaulter list | ✅ | By class/amount/age of due — built (Unit 12) | ACC, OWN | P0 |
| Automated fee reminders | ⚠️ | Cron scan + queue built (Unit 14); actual SMS send is stubbed | PAR | P0/P1 |
| Fee ledger per student | ✅ | Full history — built (Unit 12) | ACC, PAR | P0 |
| Refunds / adjustments | ✅ | With approval + audit — built (Unit 13, `RefundRequest`) | ACC | P1 |
| Reconciliation | ✅ | Daily online/counter checklist, flags online payments with no gateway confirmation — built and tested (Unit 38). No automated bank-statement matching (disclosed out-of-scope, real fintech infra not justified yet) | ACC | P1 |
| Cancellation / correction of receipt | ✅ | Audited, idempotent, requires a reason — built and tested (Unit 38) | ACC | P1 |
| Opening balances (migration) | ✅ | Carry legacy dues at onboarding — built (Unit 12) | ACC | P0 |
| Fee reports | ✅ | Daily collection, head-wise, mode-wise, outstanding — built (Unit 12) | ACC, OWN | P0 |
| Cheque/PDC tracking | ✅ | Cheque status (pending/cleared/bounced), a bounce reopens the invoice — `ChequePayment` attached to a `Payment(mode: CHEQUE)` row, web-only UI on the Fees page's Cheques tab (Unit 48) | ACC | P2 |
| Multi-currency | ❌ | (rarely needed) — explicitly skipped as pure speculation (Unit 48's own Open Question 1) | ACC | P3 |
| Payment-gateway platform fee | ✅ | Our revenue on transactions — built (Unit 13, `Payment.platformFeeAmount`); revenue summary built (Unit 30) | SA | P1 |

## B2. Accounting & Finance `[P2 — On-Demand, not built]`
| Feature | Status | Detail | Roles | Phase |
|---|---|---|---|---|
| Income/expense tracking | ❌ | Vouchers, heads | ACC | P2 |
| Chart of accounts / ledgers | ❌ | General ledger | ACC | P2 |
| Cash book / day book / bank book | ❌ | Registers | ACC | P2 |
| Vendor/supplier payments | ❌ | Bills, payables | ACC | P2 |
| Bank reconciliation | ❌ | Statement match | ACC | P2 |
| Financial statements | ❌ | P&L, balance sheet, trial balance | OWN, ACC | P3 |
| GST / tax handling | ❌ | Invoices, returns | ACC | P2 |
| Tally / accounting export | ❌ | Push to Tally/Zoho Books | ACC | P2 |
| Budgeting | ❌ | Plan vs actual | OWN | P3 |

## B3. Payroll & Salary `[P2 — On-Demand, not built]`
| Feature | Status | Detail | Roles | Phase |
|---|---|---|---|---|
| Salary structure | ❌ | Basic, HRA, allowances, deductions | HR | P2 |
| Attendance/leave-linked salary | ❌ | Auto-compute | HR | P2 |
| Statutory: PF, ESI, TDS, PT | ❌ | Compliance | HR | P2 |
| Payslip generation | ❌ | PDF, share | HR | P2 |
| Salary disbursement / bank file | ❌ | NEFT/bank export | HR | P2 |
| Loans / advances | ❌ | Track & recover | HR | P3 |
| Increments / arrears | ❌ | Revisions | HR | P3 |
| Payroll reports | ❌ | Register, statutory | HR | P2 |

## B4. Inventory, Assets & Procurement `[P2/P3 — On-Demand, not built]`
| Feature | Status | Detail | Roles | Phase |
|---|---|---|---|---|
| Stock/inventory | ❌ | Stationery, uniforms, supplies | ADM | P2 |
| Item categories & stores | ❌ | Multiple stores | ADM | P3 |
| Purchase orders & GRN | ❌ | Procurement flow | ADM | P3 |
| Issue/return tracking | ❌ | To staff/departments | ADM | P3 |
| Asset register | ❌ | Fixed assets, depreciation | ADM | P3 |
| Vendor management | ❌ | Suppliers | ADM | P3 |
| Low-stock alerts | ❌ | Reorder | ADM | P3 |
| Uniform/book store & sales | ❌ | Sell to parents, link fees | ACC | P3 |

---

# PART C — COMMUNICATION & ENGAGEMENT

## C1. Notifications Engine `[P0]`
| Feature | Status | Detail | Roles | Phase |
|---|---|---|---|---|
| Push notifications | ⚠️ | `NotificationLog(channel: PUSH)` pipeline built; no real FCM integration | all | P0 |
| SMS | ⚠️ | Pipeline built (Units 14/16/32); actual send is a stubbed `console.log` | all | P0 |
| WhatsApp | ❌ | Business API templates — not built at all | PAR | P0/P1 |
| Email | ❌ | Transactional + bulk — not built | all | P1 |
| In-app inbox | ❌ | Message center UI — not built (data exists in `NotificationLog`, no inbox surface) | all | P1 |
| Delivery status/logs | ✅ | Sent/delivered/failed tracked on `NotificationLog.status` — built | ADM, SA | P1 |
| SMS/WhatsApp wallet | ✅ | Prepaid balance + recharge — built and tested (Unit 30 recharge endpoint, Unit 14/32 real debit path) | OWN, SA | P0/P1 |
| Templates & DLT management | ❌ | Approved templates — not built (DLT approval needs a real MSG91/Gupshup account) | ADM, SA | P0 |
| Scheduling | ⚠️ | The nightly fee-reminder cron uses a real BullMQ repeat schedule (Unit 14); no general-purpose "send later" for arbitrary messages | ADM | P1 |

## C2. Messaging & Engagement `[P1]`
| Feature | Status | Detail | Roles | Phase |
|---|---|---|---|---|
| Announcements / notice board | ✅ | School-wide or targeted — built (Unit 20, role/class-audience matching, PUSH/SMS-fallback fan-out hardened Unit 32) | PRIN, ADM | P0/P1 |
| Circulars (with attachments) | ✅ | Attachment URL + audience match (same shape as Announcements) + per-user ack tracking — `Circular`/`CircularAck`, web create/ack-count + mobile list/ack (Unit 49) | ADM, PAR | P1 |
| Parent-teacher messaging/chat | ✅ | Async/REST-polled 1:1, not real-time (deliberate — no websocket infra for the demand level) — `Message`, mobile `MessagesScreen` shared by teacher + parent apps (Unit 49) | TCH, PAR | P2 |
| Class/group broadcast | ⚠️ | Announcements cover this in practice (class-audience targeting); no dedicated "broadcast" UX | TCH | P1 |
| PTM scheduling | ⚠️ | `PTMSlot` + booking endpoint built, web management (offer/list) built; **mobile parent-side booking UI not built** — a real, stated gap (Unit 49) | TCH, PAR | P2 |
| Events & school calendar | ✅ | `CalendarEvent` merged at read time with exam dates + homework due-dates into one `GET /me/calendar` — replaced the old homework-only mobile calendar (Unit 49) | all | P1 |
| Complaint / grievance / feedback | ✅ | Raise (self-scoped, branch-verified via own student) + staff resolve — web + mobile (Unit 49) | PAR, ADM | P2 |
| Surveys / polls / feedback forms | ⚠️ | Single-choice/text only, no branching — create/respond/tally-results built; **mobile response UI not built**, web-only (Unit 49) | PRIN, PAR | P2 |
| Newsletter | ❌ | Periodic, rich content — not built | ADM | P3 |
| Gallery / photos / achievements | ⚠️ | S3-backed album/photo upload built (web); **mobile viewing UI not built** (Unit 49) | ADM, PAR | P2 |
| Birthday / greeting automation | ❌ | Auto wishes — not built | PAR | P3 |
| Emergency / SOS broadcast | ❌ | Instant all-parent alert — **deliberately not built**, needs the user's sign-off on bypassing the SMS-wallet balance check (a real billing-impact policy call, Unit 49's own Open Question 3) | PRIN | P2 |

---

# PART D — OPERATIONS & FACILITIES

*Parts D1–D4/D6 are entirely On-Demand scope (`build-approach.md` §6) — none of this was in the v1 plan. Marked ❌ for completeness, not because anything failed.*

## D1. Transport Management `[P2]`
| Feature | Status | Roles | Phase |
|---|---|---|---|
| Routes & stops | ❌ | TRN | P2 |
| Vehicles & documents | ❌ | TRN | P2 |
| Driver/attendant management | ❌ | TRN | P2 |
| Student route allocation | ❌ | TRN, ADM | P2 |
| Transport fees | ❌ | ACC | P2 |
| GPS live vehicle tracking | ❌ | PAR, TRN | P3 |
| Pickup/drop notifications | ❌ | PAR | P3 |
| In-bus attendance | ❌ | TRN | P3 |
| Route optimization | ❌ | TRN | P3 |

## D2. Library Management `[P2]`
| Feature | Status | Roles | Phase |
|---|---|---|---|
| Book catalog | ❌ | LIB | P2 |
| Barcode/QR | ❌ | LIB | P2 |
| Members | ❌ | LIB | P2 |
| Issue / return / renew | ❌ | LIB | P2 |
| Fines for late return | ❌ | LIB, ACC | P2 |
| Reservations / hold | ❌ | STU | P3 |
| Digital library / e-books | ❌ | STU | P3 |
| Stock audit | ❌ | LIB | P3 |

## D3. Hostel / Dormitory `[P3]`
| Feature | Status | Roles | Phase |
|---|---|---|---|
| Hostels & rooms | ❌ | ADM | P3 |
| Room allocation | ❌ | ADM | P3 |
| Hostel attendance | ❌ | ADM | P3 |
| Mess/meal management | ❌ | ADM | P3 |
| Hostel fees | ❌ | ACC | P3 |
| Visitor/leave (hostel) | ❌ | ADM | P3 |

## D4. Front Office & Reception `[P2]`
| Feature | Status | Detail | Roles | Phase |
|---|---|---|---|---|
| Visitor/gate management | ❌ | Log in/out, photo, pass — not built | GATE, ADM | P2 |
| Enquiry log | ✅ | Covered by A2's Enquiry capture (same feature, not a separate one) | ADM | P1 |
| Call log | ❌ | Incoming/outgoing — not built | ADM | P3 |
| Postal / courier register | ❌ | Inward/outward — not built | ADM | P3 |
| Complaint desk | ❌ | Log & route — not built | ADM | P2 |
| Gate pass / early-leave | ❌ | Student exit approval + parent alert — not built | GATE, PRIN | P2 |

## D5. Certificates & Documents `[P1]`
| Feature | Status | Detail | Roles | Phase |
|---|---|---|---|---|
| Transfer Certificate (TC) | ✅ | Generate, number, register — built (Unit 21) | ADM | P1 |
| Bonafide / character / conduct | ⚠️ | Numbered issue built (Unit 21); no visual template/PDF yet — PDF gen is a stub job | ADM | P1 |
| Custom certificate builder | ❌ | Design own templates — not built (`CUSTOM` type exists in schema, no builder UI) | ADM | P2 |
| ID cards (student/staff) | ⚠️ | Student ID: single-issue only, no bulk print, no QR/photo layout (Unit 21). Staff ID: ❌ not possible at all — `Certificate.studentId` is required | ADM | P1 |
| Admit cards | ✅ | (see A8) — built (Unit 21) | ADM | P1 |
| Certificate register/log | ✅ | Issued docs record — built (`Certificate` table is the register) | ADM | P1 |
| Document management (DMS) | ❌ | Central file store, tags — not built | ADM | P2 |
| Digital signature / e-sign | ❌ | On certificates — not built | PRIN | P3 |

## D6. Health, Discipline & Others `[P2/P3]`
| Feature | Status | Roles | Phase |
|---|---|---|---|
| Health/medical records | ❌ | ADM, PRIN | P3 |
| Discipline / behavior | ❌ | TCH, PRIN | P2 |
| Awards / achievements | ❌ | PRIN | P3 |
| Canteen / cafeteria | ❌ | ADM | P3 |
| Biometric/RFID device hub | ❌ | ADM | P2 |
| Lost & found / general registers | ❌ | ADM | P3 |

---

# PART E — PORTALS, APPS & DASHBOARDS

## E1. Super-Admin Console (ERP Owner) ⚙️ `[P0 — you need this to run the SaaS]`
| Feature | Status | Detail | Roles | Phase |
|---|---|---|---|---|
| Tenant (school) management | ✅ | Create/suspend/delete schools — built (Unit 05, provisioning + suspend) | SA | P0 |
| Onboarding / provisioning | ✅ | Spin up a school instance — built | SA | P0 |
| Subscription & plan management | ✅ | Starter/Standard/Pro/Enterprise — built (Unit 30 fixed a real bug: no `Subscription` row was ever created before this) | SA | P0/P1 |
| Billing & invoicing | ✅ | Subscription + setup + wallet — built (Unit 30: `PlatformInvoice` create/mark-paid, wallet recharge, revenue summary). Manual create/reconcile only — no automated recurring billing engine | SA | P1 |
| Module/feature toggles per plan | ✅ | Enable modules per tenant — built (Unit 05) | SA | P0 |
| Usage metering | ⚠️ | Student/user/branch counts real (Unit 30 fixed a hardcoded-0 student-count bug) + SMS wallet balance shown; storage/txn metering not wired | SA | P1 |
| Payment-gateway platform-fee tracking | ✅ | Our txn revenue — built (Unit 13, aggregated in Unit 30's revenue summary) | SA | P1 |
| Global announcements | ❌ | To all/segment of schools — not built | SA | P2 |
| Support / ticket console | ❌ | Handle school issues — not built | SA | P1 |
| Monitoring & health | ⚠️ | `/health`/`/ready` endpoints exist; Sentry + structured JSON logs wired (Unit 35, DSN-gated — no real Sentry project to verify live capture); no dashboard | SA | P1 |
| Audit & impersonation | ✅ | `POST /platform/tenants/:id/impersonate` — time-boxed, audited — built | SA | P1 |
| Reseller/partner management | ❌ | Partner accounts, commissions — not built | SA | P2 |
| White-label/branding controls | ⚠️ | Mobile app identity is now env-parameterized per tenant (Unit 31, fixed a real Google Play policy violation); no admin UI to set a logo/colors/domain, no real EAS build ever run | SA | P2 |
| Content/template library | ⚠️ | Per-tenant `ReportCardTemplate` exists; no shared cross-tenant library UI | SA | P1 |

## E2. School Web Admin Panel 🖥️ `[P0]`
Full management UI for OWN/PRIN/ADM/ACC/HR — surfaces all enabled modules above, role-scoped.

**Status ⚠️ partial** (Unit 27, extended by Units 42/43/44/46/47): shell + login + students/fees/attendance/dashboard/staff/academic-structure/exams/timetable now have UI. Guardians, admissions, announcements, certificates all have working APIs but **no web UI** yet — same shell/table/form pattern each time, deferred as fast-follow. Homework is correctly API-only by design (mobile-first, no admin web screen warranted).

> **Note (locked decision):** E3–E5 are **role experiences inside ONE role-based mobile app** (parent · teacher/staff · student), **not separate apps**. Same codebase/binary. See `architecture-context.md` §0.

## E3. Teacher (role in the app) 📱 `[P0]`
**Status ⚠️ partial** (Unit 16/26): attendance (offline-capable, real local queue), marks entry, homework posting, timetable view built. Marks entry and homework posting are **not** offline. Messaging/leave from the app not built.

## E4. Parent (role in the app) 📱 `[P0]`
**Status ⚠️ partial** (Unit 24/25): multi-child, attendance, report cards, homework, timetable, fees + online payment (round-trip only, stub gateway), announcements — all built. Messaging, calendar, and real SMS fallback (since sends are stubbed) are not built.

## E5. Student (role in the app) / Portal 📱🖥️ `[P1/P2]`
**Status ✅ built** (Unit 24, direct student login via `Student.userId`): timetable, homework, report cards, attendance — same `/me` layer as parent. Materials and online exams not built.

## E6. Management/Owner Dashboard 🖥️📱 `[P1]`
**Status ⚠️ partial** (Unit 28): collection %, dues, attendance %, admissions funnel built and tested. Enrollment trends and staff metrics not built.

## E7. Public School Website / Mini-site 🌐 `[P2]`
**Status ⚠️ partial** (Unit 29, `apps/web-site`): school-code lookup page + online admission enquiry form + PWA built. No CMS, no notices/gallery/contact pages.

---

# PART F — ANALYTICS & REPORTING

| Feature | Status | Detail | Roles | Phase |
|---|---|---|---|---|
| Role-based dashboards | ⚠️ | Owner dashboard built (Unit 28); no dedicated principal/teacher/accountant dashboard | all | P1 |
| Standard reports | ⚠️ | Attendance/fees reports built; exam/admission/staff/transport reports not built | all | P0/P1 |
| Custom report builder | ❌ | Pick fields, filters, export — not built | PRIN, ADM | P3 |
| Export | ❌ | Excel, PDF, CSV, print — no general-purpose export beyond the specific PDFs already noted (stub jobs) | all | P0 |
| Scheduled report email | ❌ | Daily/weekly to owner — not built | OWN | P2 |
| KPI / MIS summary | ⚠️ | Owner dashboard covers a slice of this (Unit 28); no cross-module MIS report | OWN | P1 |
| Government / UDISE+ report support | ❌ | Export data for UDISE filing — not built | ADM | P2 |
| Board reporting (CBSE etc.) | ❌ | Registration/result uploads support — not built | PRIN | P3 |
| Predictive analytics | ❌ | At-risk students, fee-default prediction — not built | PRIN, OWN | P3 |

---

# PART G — AI & INTELLIGENT FEATURES `[mostly P3 — NOT a buying driver early, nothing built]`

> Per market research: AI is **not** what makes a Bihar school pay today. None of this was in the v1 plan — build later as differentiation/premium.

| Feature | Status | Detail | Phase |
|---|---|---|---|
| WhatsApp AI assistant | ❌ | Parents query fees/attendance via WhatsApp | P3 |
| Admin chatbot / helpdesk | ❌ | In-app "how do I..." assistant | P3 |
| Auto report-card remarks | ❌ | AI-generated teacher comments | P2/P3 |
| Smart timetable generation | ❌ | Constraint solver | P3 |
| Fee-default prediction | ❌ | Flag likely defaulters early | P3 |
| At-risk student detection | ❌ | Attendance + marks signals | P3 |
| OCR admission/data entry | ❌ | Scan forms → fields | P3 |
| Doubt-solving / tutoring (student) | ❌ | AI Q&A | P3 |
| Face-recognition attendance | ❌ | Camera-based | P3 |
| Analytics natural-language queries | ❌ | "Show me Class 8 dues" | P3 |

---

# PART H — PLATFORM & CROSS-CUTTING CAPABILITIES `[P0 — foundational]`

| Capability | Status | Detail | Phase |
|---|---|---|---|
| **Multi-tenancy** | ✅ | Isolated data per school — built + audited (Unit 02 RLS; Unit 34 added a repo-level static check that fails CI if a future unit forgets `withTenant()`, plus a real backup/restore drill proving RLS survives a restore) | P0 |
| **Multi-branch / school groups** | ✅ | One owner, many branches, consolidated view — built (Unit 06) | **P0/P1 (v1 — locked)** |
| **RBAC (roles & permissions)** | ✅ | Granular, per-module, per-action — built + audited (Unit 34's coverage check cross-references every `rbac.md` permission against real enforcement; found & fixed `subscription.view` unenforced) | P0 |
| **Multi-language (English/Hindi/Hinglish)** | ⚠️ | UI + notification templates — i18next infra built (Unit 01) and used throughout; coverage never audited flow-by-flow for completeness | P0 |
| **Data import/export/migration tools** | ⚠️ | Import built (Unit 07) but only tested on synthetic fixtures; export ✅ built and tested (Unit 34's DPDP endpoint) | P0 |
| **Backup & restore** | ⚠️ | Manual drill done and real (Unit 34); automated/scheduled backups need a real AWS account (RDS's job, not this repo's) | P0 |
| **Audit logs** | ✅ | Who changed what, when — built (`AuditLog`: tenant provisioning/patch, impersonation, attendance regularization, payment completion) | P0/P1 |
| **Academic-year rollover** | ✅ | Clean session migration — built and tested (Unit 33) | P0/P1 |
| **Offline mode + sync (mobile)** | ⚠️ | Attendance is real and hardened (Unit 16/32); marks entry and homework posting are not offline | P0/P1 |
| **Notifications engine** | ⚠️ | Real queue/log pipeline, PUSH/SMS-fallback routing hardened (Unit 32); real provider-calling code for SMS (MSG91)/WhatsApp (Gupshup)/Push (FCM)/Email (SES) built and gated behind env vars, template registry, in-app inbox, scheduled sends — all built and tested (Unit 40). Still ⚠️: no real provider account exists yet, so every send is honestly still a stub in this environment; DLT template approval is the user's to complete | P0 |
| **Search (global)** | ✅ | Students, staff, invoices — built and tested (Unit 37, Postgres `pg_trgm` + `ILIKE`, branch-scoped, dropdown in the web admin header) | P1 |
| **Settings & configuration** | ✅ | School profile, branch mgmt, user invite/deactivate, custom-role permission editing — built and tested (Unit 36); `settings.manage`/`branch.manage`/`user.manage`/`role.manage` now enforced. Custom roles capped at one per tenant (disclosed schema constraint, see progress-tracker) | P0 |
| **Module/plan feature flags** | ✅ | Toggle features by subscription — built and tested (Unit 05) | P0 |
| **White-labeling / branding** | ⚠️ | App-identity pipeline partial (Unit 31); no admin UI, no real build ever run | P2 |
| **Security: 2FA, encryption, session control** | ⚠️ | 2FA built (staff login, Unit 03); JWT rotation built; encryption-in-transit assumed at the infra layer (unverifiable without a real AWS/TLS setup); password policy not audited | P1 |
| **DPDP / data-privacy compliance** | ⚠️ | Export ✅ (Unit 34); consent capture at invite time, documented retention policy, and a request→review→execute delete pipeline ✅ built and tested (Unit 39). Still ⚠️ overall: the consent checkbox has no legally-reviewed text bound to it yet, and retention windows are engineering defaults, not confirmed legal numbers — see `context/dpdp-policy.md` | P1 |
| **Integrations / API** | ⚠️ | Payment (Razorpay) ✅ real; SMS (MSG91)/WhatsApp (Gupshup)/Push (FCM)/Email (SES) real-call code ✅ built (Unit 40), gated on accounts that don't exist yet; biometric/Google/Zoom/Tally/e-sign — none built | P0→P2 |
| **Webhooks / developer API** | ❌ | For partners/large schools — not built | P3 |
| **In-app help / onboarding tours** | ❌ | Reduce support load — not built | P1 |
| **Feedback & feature requests** | ❌ | In-product — not built | P2 |

## Key integrations checklist

| Integration | Status | Detail | Phase |
|---|---|---|---|
| Payment gateways | ✅ | Razorpay live (real HMAC-verified webhook, Unit 13); Cashfree/PayU not integrated | P1 |
| SMS + WhatsApp | ❌ | MSG91 / Gupshup / Kaleyra — not integrated, DLT not started | P0 |
| Push | ❌ | Firebase Cloud Messaging — not integrated | P0 |
| Email | ❌ | Amazon SES / Postmark — not integrated | P1 |
| Biometric/RFID | ❌ | ESSL/Mantra device APIs — not integrated | P2 |
| Video classes | ❌ | Zoom / Google Meet / Jitsi — not integrated | P3 |
| Accounting | ❌ | Tally / Zoho Books export — not integrated | P2 |
| Auth (optional) | ❌ | Google / Microsoft sign-in for staff — not integrated | P2 |
| Maps/GPS | ❌ | Google Maps / traccar for transport — not integrated | P3 |
| Error monitoring | ⚠️ | Sentry wired (Unit 35, DSN-gated, unit-tested with a mock) — no real Sentry project to verify live capture | — |

---

# PART H-bis — COMPETITOR CROSS-CHECK ADDITIONS

Added after auditing this catalog against **Fedena's full 72-module feature tour** and the advertised feature sets of Entab, MyClassBoard, Teachmint and Campus365. All are P2/P3, none belong in the MSP, **none built**.

| Feature | Status | Detail | Roles | Phase |
|---|---|---|---|---|
| Placement / career management | ❌ | Job/college placement tracking | ADM, PRIN | P3 |
| Task / to-do management | ❌ | Assign & track tasks to staff | PRIN, ADM | P2 |
| Discussion forums / boards | ❌ | Threaded discussions | TCH, STU | P3 |
| Blog / school CMS content | ❌ | School blog & news articles | ADM | P3 |
| Form builder | ❌ | Build custom forms | ADM | P2 |
| Question-paper generator | ❌ | Generate papers from question bank | TCH | P3 |
| Poll / voting | ❌ | Quick polls to parents/staff | PRIN | P2 |
| Video conferencing | ❌ | Live online classes | TCH, STU | P3 |

> **Verdict:** every module the major competitors publicly advertise is represented in this catalog. Differentiation is **not** matching their module count — it's reliability + local support + Hindi + fair pricing on the P0 core.

---

# PART I — MINIMUM SELLABLE PRODUCT (the P0 build list, in build order)

**This is the same status as above, organized in the order it was actually built — use Parts A–H for the feature-by-feature detail, this for the build-sequence view.**

1. **Platform foundation:** multi-tenancy ✅ · RBAC ✅ · Hindi/Hinglish UI ⚠️ · settings ❌ · notifications engine ⚠️ (real pipeline, stubbed send) · import/export ⚠️ (export ✅, import untested on real data) · backups ⚠️ (manual drill done, no automation) · super-admin console ✅.
2. **Student records** ✅ + bulk import ⚠️ + ID basics ⚠️.
3. **Fee management** ✅ across heads/structures/installments/discounts/collection/receipts/dues/ledger/opening balances/reports/online payment/reconciliation/receipt cancellation (Unit 38).
4. **Attendance** ✅ daily marking + offline + absence alerts + reports. **Marks entry NOT offline.**
5. **Exams & report cards** ✅ term setup, grading, marks entry, report cards, publish to parents. **Academic-year rollover ✅.**
6. **Communication:** queue/log pipeline ⚠️, announcements ✅, SMS wallet ✅ (real recharge + real debit, tested) — **actual SMS/WhatsApp/push send is still a stub.**
7. **Apps & panels:** web admin ⚠️ (4/14 modules have UI), teacher app ✅, parent app ✅, owner dashboard ✅.
8. **Onboarding tooling:** import ⚠️ (untested on real messy data) + validation ✅.
9. **White-label mobile pipeline:** app-identity parameterization ✅; real EAS build/submit ❌ (no developer account).
10. **Observability:** Sentry ⚠️ (wired, unverified live) + structured logging ✅ + CI workflow written, never run on real GitHub Actions.

**Verdict: code-complete (170/170 tests passing, clean lint/typecheck/build) but not sales-ready.** Three real blockers, all requiring the user to complete external account setup before further work is possible: no Google Play/Apple developer account (no live app), no real SMS/WhatsApp provider (every notification is a stub), no AWS account (deployment runbook never executed). See `progress-tracker.md`'s Unit 35 entry for the full evidence trail.

---

*Priorities reflect the Patna/Bihar market research (`../docs/market-research/`). Re-validate the MSP against real pilot feedback (`../docs/market-research/CUSTOMER_DISCOVERY_PLAN.md`) before locking further build decisions.*

---

# PART J — Extended Competitor Feature Research (2025–26 addendum)

Added after a deeper competitor scan (Fedena, MyClassBoard, Entab, Teachmint, Campus365, Vidyalaya, Edumarshal, Compass, Vawsum, plus India-gov sources). Focus: features that emerged/became competitive **since the original catalog** — especially **India government/compliance integrations** (which the earlier catalog under-weighted) and the **AI wave**. Phase tags `[0]–[3]` as before, **plus a "Vidyut priority" note** where the CBSE-first + Bihar context changes the priority vs. a generic build.

> **Why this matters for Vidyut:** our ICP is **CBSE / CBSE-aspiring** schools. Several India-compliance items below (DigiLocker, UDISE/APAAR, Holistic Progress Card) are shifting from "nice-to-have" to **expected/mandated for CBSE schools**, so they are **elevated** from the "later/premium" bucket a generic ERP would use. They're also a credibility/differentiation wedge vs. weak local Patna vendors.

## J1. India government & compliance integrations `[elevated for Vidyut]`

| Feature | Detail | Generic phase | **Vidyut priority** |
|---|---|---|---|
| **UDISE+ / PEN integration** | Sync school + student data to UDISE+; capture **PEN (Permanent Education Number)**. Foundation for APAAR. | P2 | **P1–P2** (needed before APAAR; CBSE schools file UDISE) |
| **APAAR ID** | Generate/link the 12-digit **"One Nation, One Student ID"** (Automated Permanent Academic Account Registry); requires verified UDISE data; accessible via DigiLocker. | P3 | **P2** (increasingly expected; strong differentiator locally) |
| **DigiLocker integration** | Issue/push report cards, TC, marksheets, certificates to students' **DigiLocker**; pull verified docs at admission. Partner-account API. | P3 | **P2** (CBSE issues results to DigiLocker; big trust signal) |
| **NEP 2020 Holistic Progress Card (HPC / PARAKH)** | 360° competency-based report: **self + peer + teacher + parent** assessment across cognitive, affective, socio-emotional, psychomotor domains; stage-wise (Foundational/Preparatory/Middle/Secondary) formats + rubrics from PARAKH/CBSE. | P3 | **P2** (CBSE rolling out HPC — becomes a required report-card format, not just marks) |
| **ABC (Academic Bank of Credits)** | Credit ledger; mainly higher-ed but linked to APAAR. | P3 | P3 (skip for K-12 now) |
| **RTE compliance reporting** | 25% EWS quota tracking + state RTE reports/reimbursement. | P2 | P2 (relevant to Bihar private schools) |
| **CBSE board integrations** | Registration/LOC upload, result import, affiliation data. | P2/P3 | P2 (CBSE-specific value) |

**Takeaway:** build the report-card engine (Unit 19) **HPC-ready** (config-driven, supports qualitative + 360° inputs, not just marks), and design the certificate/document layer so **DigiLocker issuance** and **UDISE/APAAR** hooks can attach — even if the actual integrations ship as a fast-follow. Retro-fitting these into a marks-only report card later is expensive.

## J2. AI & automation (expanded — the current competitive wave) `[mostly P3]`

Competitors now market AI heavily (Teachmint "AI connected classroom", Entab/Smart School "predictive analytics + auto-grading", MICM "AI facial recognition + timetable optimization + smart fees"). Full list to be aware of:
- Predictive analytics: **dropout risk, performance prediction, fee-default prediction** `[P3]`
- **Automated grading / auto-assessment** (objective + assisted subjective) `[P3]`
- **Personalized learning recommendations** / adaptive content `[P3]`
- **AI report-card / HPC narrative generation** (turn indicators into prose remarks) `[P2/P3 — pairs with HPC]`
- **AI facial-recognition attendance** `[P3]`
- **AI timetable optimization** (constraint solver) `[P3]`
- **Smart fee collection** (AI-timed reminders, propensity-to-pay) `[P3]`
- **AI admission CRM** (lead scoring, next-best-action) `[P3]`
- **WhatsApp AI assistant / chatbot** (parents query fees/attendance/results) `[P3 — but WhatsApp itself is P0/P1]`

**Vidyut stance unchanged:** AI is **not** a buying driver for the Bihar ICP today — keep it P3/premium. The one exception worth watching: **AI-assisted HPC remarks**, because HPC's qualitative burden on teachers is real, and AI that drafts the narrative is a genuine time-saver that could sell alongside HPC.

## J3. Wellbeing, counseling & safety (newer modules) `[P3]`

NEP's socio-emotional emphasis + safety expectations have spawned modules the original catalog only partially covered:
- **Student wellbeing / counseling** — counselor notes, referrals, mood/behaviour tracking, confidential records `[P3]`
- **Behaviour / discipline with positive reinforcement** — merit/demerit, house points (have discipline; add positive-reinforcement + wellbeing lens) `[P2/P3]`
- **Incident / safety reporting** — log incidents, anti-bullying, escalation `[P3]`
- **Panic / SOS button** (staff + transport) `[P3]`
- **CCTV integration** (surface feeds/links; not core) `[P3]`
- **Health: vaccination/immunization records, health cards, checkup camps** (extends the health module) `[P3]`

## J4. Community, alumni & fundraising `[P3]`

- **Alumni network** — self-register (employer, social links), directory, events, verification (extends A1 alumni) `[P3]`
- **Fundraising / donations / grant management** — campaigns, receipts, 80G, donor records `[P3]`
- **School community / engagement** — parent community, volunteering, polls (extends comms) `[P3]`

## J5. Other operational adds confirmed by the scan `[P2/P3]`

- **Cashless canteen** with **online ordering + prepaid wallet + menu/nutrition** (extends canteen) `[P3]`
- **Gate pass for students/visitors/parents** with QR + full in/out log (extends front-office) `[P2]`
- **Fuel + vehicle-maintenance tracking** in transport (extends transport) `[P3]`
- **Substitute-teacher auto-suggestion** (extends timetable) `[P3]`
- **Question-paper generator with blueprint/Bloom's mapping** (extends exams) `[P3]`
- **Multi-regional-language UI** beyond Hindi/English (extends i18n) `[P3]`

## J-verdict for Vidyut

1. **Elevate the India-compliance cluster** (UDISE/PEN → APAAR → DigiLocker → HPC-ready report cards) from "P3/later" to **P1–P2**, and **design the report-card + document/certificate engines now to accommodate them** even if integrations ship as fast-follows. This is the single most important addition from this research — it's both increasingly required for CBSE and a differentiation wedge over local vendors.
2. **Keep AI at P3** except **AI-assisted HPC remarks**, which pairs naturally with HPC.
3. **Wellbeing, alumni, fundraising, safety/panic, cashless canteen** stay **P3/on-demand** — real but not core to the Bihar ICP; build when a paying school asks.
4. Nothing here changes the **MSP** (Part I). It changes what to **design-for** (HPC-ready report cards, DigiLocker-ready certificates) and what to **sequence early as fast-follow** (DigiLocker/UDISE/APAAR).

### Sources (2025–26)
- APAAR — Ministry of Education: https://apaar.education.gov.in/faqs · guide: https://www.myleadingcampus.com/blogview/what-is-apaar-id-complete-guide-for-schools-and-colleges-2026/
- APAAR/DigiLocker/UDISE/PEN linkage — Careers360: https://school.careers360.com/articles/how-to-get-pen-number-online-student-from-digilocker-apaar-id-udise
- HPC / PARAKH (NCERT/CBSE): https://parakh.ncert.gov.in/hpc · https://cbseacademic.nic.in/hpc.html · https://www.education.gov.in/shikshakparv/docs/holistic_progress.pdf · guide: https://www.myleadingcampus.com/blogview/holistic-progress-card-hpc-nep-2020-complete-guide-for-schools-2026
- India ERP feature trends 2025 — MyLeadingCampus: https://www.myleadingcampus.com/blogview/top-10-musthave-features-in-a-school-erp-software-for-indian-schools-in-2025
- Module breadth (50+) — Edumarshal: https://edumarshal.com/school-erp-modules/ · Compass Education: https://www.compass.education/features/ · EduYug: https://eduyug.com/modules
- AI/competitor positioning — Decentro: https://decentro.tech/blog/best-school-erp-software/ · Entab: https://www.entab.in/top-10-best-school-erp-software-in-india.html · Teachmint: https://www.softwaresuggest.com/teachmint

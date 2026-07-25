# School ERP — Complete Feature Catalog

**Prepared:** July 2026 · Project: multi-tenant School ERP SaaS (Patna/Bihar first)
**Purpose:** the exhaustive, "don't-miss-anything" master list of every feature the platform could contain — mapped to the user roles who use it and a build-priority phase. This is the *catalog*, not the *build order*. **You do not build all of this before launch** — the MSP (Phase P0) is the sellable core (see `../docs/market-research/PRICING_AND_UNIT_ECONOMICS.md`). Everything else is sequenced after paying customers exist.

---

## How to read this document

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

# PART A — CORE ACADEMIC & STUDENT INFORMATION SYSTEM (SIS)

## A1. Student Management `[P0]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Student profile | Personal, contact, address, DOB, gender, blood group, photo | ADM, TCH, PAR | P0 |
| Unique admission/enrollment number | Auto-generated, configurable format | ADM | P0 |
| Roll number management | Per class/section, auto or manual | ADM, TCH | P0 |
| Guardian/parent linkage | Father, mother, guardian; multiple contacts | ADM, PAR | P0 |
| Sibling linking | Group siblings for fees/discounts/comms | ADM, ACC | P1 |
| Category/caste/religion fields | For records + government reporting | ADM | P0 |
| Student documents vault | Birth cert, Aadhaar, prev. TC, photos (upload/store) | ADM | P1 |
| Medical/health info | Allergies, conditions, emergency contact | ADM, PRIN | P1 |
| Custom fields | School-defined extra fields | ADM | P1 |
| Bulk import (Excel/CSV) | Templated import + validation + de-dupe | ADM | P0 |
| Student status | Active, inactive, TC issued, alumni, struck-off | ADM | P0 |
| Class/section assignment | Assign & reassign | ADM | P0 |
| Student promotion (year-end) | Bulk promote/detain to next class/session | ADM, PRIN | P0/P1 |
| Roll-back / re-admission | Reverse promotion; re-admit dropped student | ADM | P1 |
| Transfer between sections/branches | Move students; multi-branch | ADM | P2 |
| Alumni management | Post-graduation records, alumni portal | ADM | P3 |
| Student ID card generation | Templated, with photo + barcode/QR | ADM | P1 |
| Student search & filters | By name, class, admission no., phone | ADM, TCH | P0 |
| Student timeline/log | Activity, discipline, achievements | PRIN, TCH | P2 |

## A2. Admission & Enquiry (CRM) `[P1 — light version P0]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Enquiry capture | Walk-in / phone / online enquiry log | ADM, OWN | P1 |
| Lead pipeline | Stages: enquiry → visited → applied → admitted | ADM, OWN | P1 |
| Online admission form | Public form on website; parent self-apply | PAR, ADM | P1 |
| Registration/application fee | Collect online at apply | PAR, ACC | P1 |
| Entrance test / interview scheduling | Slots, results | ADM, PRIN | P2 |
| Merit list / seat allotment | Rank, offer, waitlist | ADM, PRIN | P2 |
| Offer letter / admission confirmation | Auto-generate, email/print | ADM | P2 |
| Document collection checklist | Required docs tracking | ADM | P1 |
| Convert applicant → student | One-click, carry data over | ADM | P1 |
| Admission analytics | Source, conversion %, seats filled | OWN, PRIN | P2 |
| Enquiry follow-up reminders | Tasks + notifications | ADM | P1 |

## A3. Parent / Guardian Management `[P0]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Parent accounts | Login per guardian; linked to child(ren) | PAR | P0 |
| Multi-child single login | One parent → many students | PAR | P0 |
| Contact management | Phone, email, WhatsApp, alternate | ADM, PAR | P0 |
| Parent app onboarding | Invite via SMS/link; OTP login | PAR | P0 |
| Communication preferences | Opt-in SMS/WhatsApp/push/email | PAR | P1 |
| Guardian access control | What each guardian can see/pay | ADM | P2 |

## A4. Staff / Teacher / HR Records `[P0 basic → P2 full HR]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Staff profile | Personal, contact, qualifications, photo | HR, PRIN | P0 |
| Employee ID + role assignment | Map to RBAC role | ADM, SA | P0 |
| Teaching vs non-teaching classification | Filters, payroll rules | HR | P1 |
| Subject/class allocation to teacher | Who teaches what | PRIN | P0 |
| Staff documents | Certificates, ID, contracts | HR | P1 |
| Staff attendance | Biometric/app/manual | HR, PRIN | P1 |
| Leave management | Types, balances, apply/approve workflow | HR, TCH | P1 |
| Staff ID card | Templated | HR | P2 |
| Recruitment/onboarding | Applicant tracking, joining | HR | P3 |
| Appraisal / performance | Reviews, ratings | PRIN, HR | P3 |
| Staff directory | Searchable | PRIN, ADM | P1 |

## A5. Academic Structure `[P0]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Academic session/year | Create, set active, roll over | ADM, PRIN | P0 |
| Class/grade management | Nursery → XII, streams | ADM | P0 |
| Section management | A/B/C, capacity | ADM | P0 |
| Stream/group (XI–XII) | Science/Commerce/Arts, electives | ADM | P1 |
| Subject management | Subjects per class, core/elective | ADM, PRIN | P0 |
| Subject groups / combinations | Elective baskets | PRIN | P2 |
| Teacher-subject-class mapping | Assignment grid | PRIN | P0 |
| Class teacher assignment | One per section | PRIN | P0 |
| House system | Houses for events/discipline | PRIN | P3 |

## A6. Attendance `[P0]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Student daily attendance | Mark present/absent/late/leave | TCH | P0 |
| Period-wise attendance | Per subject/period | TCH | P2 |
| Parent absence alert | Auto SMS/push when marked absent | PAR | P0 |
| Attendance via mobile app | Teacher app, offline-capable | TCH | P0 |
| Biometric/RFID integration | Device sync | ADM, TRN | P2 |
| Face-recognition attendance | Camera-based | ADM | P3 |
| Bulk / holiday marking | Mark whole class, holidays | TCH, ADM | P0 |
| Attendance registers/reports | Daily, monthly %, defaulters | TCH, PRIN | P0 |
| Attendance analytics | Trends, chronic absentees | PRIN | P1 |
| Staff attendance | (see A4) | HR | P1 |
| Leave/attendance regularization | Correct wrong marks | TCH, ADM | P1 |

## A7. Homework / Assignments `[P1]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Assign homework | Per class/subject, attachments | TCH | P1 |
| Parent/student view | On app, due dates | PAR, STU | P1 |
| Submission (digital) | Upload answers | STU | P2 |
| Grading/feedback | Marks + comments | TCH | P2 |
| Homework calendar | By week/subject | STU, PAR | P1 |

## A8. Examination & Assessment `[P0]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Exam/term setup | Unit tests, half-yearly, annual | PRIN, ADM | P0 |
| Grading schemes | Marks, grades, CBSE CCE, CGPA, percentage | PRIN | P0 |
| Exam timetable | Dates, rooms | ADM | P1 |
| Marks entry | Per subject, by teacher; app + web | TCH | P0 |
| Marks moderation/lock | Approve & lock | PRIN | P1 |
| Report card generation | Configurable templates, school logo | ADM, PRIN | P0 |
| CBSE/ICSE/State-board formats | Board-specific report cards | PRIN | P0/P1 |
| Co-scholastic / grades | Discipline, activities, remarks | TCH | P1 |
| Auto teacher remarks | Templated/AI comments | TCH | P2 |
| Consolidated result / rank | Class rank, toppers | PRIN | P1 |
| Transcripts / cumulative record | Multi-year | ADM | P2 |
| Progress reports to parents | Publish to app; download PDF | PAR | P0 |
| Online examination | MCQ/subjective, timer, auto-grade | TCH, STU | P2 |
| Question bank | Reusable questions | TCH | P3 |
| Admit card / hall ticket | Generate for exams | ADM | P1 |
| Grade/result analytics | Subject-wise, pass %, weak areas | PRIN | P1 |

## A9. Timetable & Scheduling `[P1]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Class timetable | Period grid per section | PRIN, ADM | P1 |
| Teacher timetable | Per teacher view | TCH | P1 |
| Auto/smart timetable generation | Constraint-based generator | PRIN | P3 |
| Substitution management | Cover absent teachers | PRIN | P2 |
| Room/lab allocation | Resource scheduling | ADM | P3 |
| Timetable on app | Parent/student/teacher view | all | P1 |

## A10. Lesson Planning, Curriculum & LMS `[P2/P3]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Syllabus / curriculum tracking | Chapters, progress | TCH, PRIN | P2 |
| Lesson plans | Weekly/daily plans | TCH | P2 |
| Study material / content library | Notes, PDFs, videos | TCH, STU | P2 |
| Online classes / live video | Zoom/Meet integration | TCH, STU | P3 |
| Recorded lectures | Store & stream | STU | P3 |
| Digital assignments/quizzes | (see A7/A8) | TCH | P2 |
| Learning analytics | Engagement, completion | PRIN | P3 |

---

# PART B — FEES & FINANCE

## B1. Fee Management `[P0 — the #1 paying wedge]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Fee heads/components | Tuition, transport, exam, admission, misc | ACC, OWN | P0 |
| Fee structures | Per class/category/session | ACC | P0 |
| Installments / due schedule | Monthly/quarterly/term | ACC | P0 |
| Discounts / concessions / scholarships | Sibling, staff, merit, RTE | ACC, OWN | P0 |
| Fine / late-fee rules | Auto-apply after due date | ACC | P1 |
| Fee collection (counter) | Cash/cheque/UPI/card entry | ACC | P0 |
| Instant receipt | Print/PDF/share; receipt no. | ACC, PAR | P0 |
| Online fee payment | UPI/card/netbanking via gateway | PAR | P1 |
| Partial/advance payment | Adjust ledger | ACC | P1 |
| Dues & defaulter list | By class/amount/age of due | ACC, OWN | P0 |
| Automated fee reminders | SMS/WhatsApp/push, scheduled | PAR | P0/P1 |
| Fee ledger per student | Full history | ACC, PAR | P0 |
| Refunds / adjustments | With approval + audit | ACC | P1 |
| Reconciliation | Match gateway/bank to receipts | ACC | P1 |
| Cancellation / correction of receipt | Audited | ACC | P1 |
| Opening balances (migration) | Carry legacy dues at onboarding | ACC | P0 |
| Fee reports | Daily collection, head-wise, mode-wise, outstanding | ACC, OWN | P0 |
| Cheque/PDC tracking | Cheque status, bounce | ACC | P2 |
| Multi-currency | (rarely needed) | ACC | P3 |
| Payment-gateway platform fee | Our revenue on transactions | SA | P1 |

## B2. Accounting & Finance `[P2]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Income/expense tracking | Vouchers, heads | ACC | P2 |
| Chart of accounts / ledgers | General ledger | ACC | P2 |
| Cash book / day book / bank book | Registers | ACC | P2 |
| Vendor/supplier payments | Bills, payables | ACC | P2 |
| Bank reconciliation | Statement match | ACC | P2 |
| Financial statements | P&L, balance sheet, trial balance | OWN, ACC | P3 |
| GST / tax handling | Invoices, returns | ACC | P2 |
| Tally / accounting export | Push to Tally/Zoho Books | ACC | P2 |
| Budgeting | Plan vs actual | OWN | P3 |

## B3. Payroll & Salary `[P2]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Salary structure | Basic, HRA, allowances, deductions | HR | P2 |
| Attendance/leave-linked salary | Auto-compute | HR | P2 |
| Statutory: PF, ESI, TDS, PT | Compliance | HR | P2 |
| Payslip generation | PDF, share | HR | P2 |
| Salary disbursement / bank file | NEFT/bank export | HR | P2 |
| Loans / advances | Track & recover | HR | P3 |
| Increments / arrears | Revisions | HR | P3 |
| Payroll reports | Register, statutory | HR | P2 |

## B4. Inventory, Assets & Procurement `[P2/P3]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Stock/inventory | Stationery, uniforms, supplies | ADM | P2 |
| Item categories & stores | Multiple stores | ADM | P3 |
| Purchase orders & GRN | Procurement flow | ADM | P3 |
| Issue/return tracking | To staff/departments | ADM | P3 |
| Asset register | Fixed assets, depreciation | ADM | P3 |
| Vendor management | Suppliers | ADM | P3 |
| Low-stock alerts | Reorder | ADM | P3 |
| Uniform/book store & sales | Sell to parents, link fees | ACC | P3 |

---

# PART C — COMMUNICATION & ENGAGEMENT

## C1. Notifications Engine `[P0]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Push notifications | Via mobile app (FCM) | all | P0 |
| SMS | Transactional (DLT-compliant, India) | all | P0 |
| WhatsApp | Business API templates | PAR | P0/P1 |
| Email | Transactional + bulk | all | P1 |
| In-app inbox | Message center | all | P1 |
| Delivery status/logs | Sent/delivered/failed | ADM, SA | P1 |
| SMS/WhatsApp wallet | Prepaid balance, pass-through billing | OWN, SA | P0/P1 |
| Templates & DLT management | Approved templates | ADM, SA | P0 |
| Scheduling | Send later, recurring | ADM | P1 |

## C2. Messaging & Engagement `[P1]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Announcements / notice board | School-wide or targeted | PRIN, ADM | P0/P1 |
| Circulars (with attachments) | PDF, acknowledge | ADM, PAR | P1 |
| Parent-teacher messaging/chat | 1:1 or class, moderated | TCH, PAR | P2 |
| Class/group broadcast | Replace WhatsApp groups | TCH | P1 |
| PTM scheduling | Slots, booking, reminders | TCH, PAR | P2 |
| Events & school calendar | Holidays, events, exams | all | P1 |
| Complaint / grievance / feedback | Raise & track | PAR, ADM | P2 |
| Surveys / polls / feedback forms | Collect input | PRIN, PAR | P2 |
| Newsletter | Periodic, rich content | ADM | P3 |
| Gallery / photos / achievements | Share media | ADM, PAR | P2 |
| Birthday / greeting automation | Auto wishes | PAR | P3 |
| Emergency / SOS broadcast | Instant all-parent alert | PRIN | P2 |

---

# PART D — OPERATIONS & FACILITIES

## D1. Transport Management `[P2]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Routes & stops | Define, map | TRN | P2 |
| Vehicles & documents | Fitness, insurance, permits | TRN | P2 |
| Driver/attendant management | Assign, contact | TRN | P2 |
| Student route allocation | Assign stop/route | TRN, ADM | P2 |
| Transport fees | Link to fee module | ACC | P2 |
| GPS live vehicle tracking | Real-time on app | PAR, TRN | P3 |
| Pickup/drop notifications | Boarded/reached alerts | PAR | P3 |
| In-bus attendance | Scan/mark | TRN | P3 |
| Route optimization | Efficient routing | TRN | P3 |

## D2. Library Management `[P2]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Book catalog | Titles, copies, categories | LIB | P2 |
| Barcode/QR | Scan issue/return | LIB | P2 |
| Members | Students/staff | LIB | P2 |
| Issue / return / renew | Circulation | LIB | P2 |
| Fines for late return | Link to fees | LIB, ACC | P2 |
| Reservations / hold | Queue | STU | P3 |
| Digital library / e-books | Online resources | STU | P3 |
| Stock audit | Inventory of books | LIB | P3 |

## D3. Hostel / Dormitory `[P3]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Hostels & rooms | Blocks, room types, capacity | ADM | P3 |
| Room allocation | Assign students | ADM | P3 |
| Hostel attendance | In/out, night roll call | ADM | P3 |
| Mess/meal management | Menu, attendance | ADM | P3 |
| Hostel fees | Link to fees | ACC | P3 |
| Visitor/leave (hostel) | Gate pass, outings | ADM | P3 |

## D4. Front Office & Reception `[P2]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Visitor/gate management | Log in/out, photo, pass | GATE, ADM | P2 |
| Enquiry log | Walk-ins | ADM | P1 |
| Call log | Incoming/outgoing | ADM | P3 |
| Postal / courier register | Inward/outward | ADM | P3 |
| Complaint desk | Log & route | ADM | P2 |
| Gate pass / early-leave | Student exit approval + parent alert | GATE, PRIN | P2 |

## D5. Certificates & Documents `[P1]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Transfer Certificate (TC) | Generate, number, register | ADM | P1 |
| Bonafide / character / conduct | Templated | ADM | P1 |
| Custom certificate builder | Design own templates | ADM | P2 |
| ID cards (student/staff) | Bulk, with photo/QR | ADM | P1 |
| Admit cards | (see A8) | ADM | P1 |
| Certificate register/log | Issued docs record | ADM | P1 |
| Document management (DMS) | Central file store, tags | ADM | P2 |
| Digital signature / e-sign | On certificates | PRIN | P3 |

## D6. Health, Discipline & Others `[P2/P3]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Health/medical records | Checkups, infirmary visits | ADM, PRIN | P3 |
| Discipline / behavior | Merit/demerit, incidents | TCH, PRIN | P2 |
| Awards / achievements | Track & display | PRIN | P3 |
| Canteen / cafeteria | Prepaid, menu, sales | ADM | P3 |
| Biometric/RFID device hub | Central device integration | ADM | P2 |
| Lost & found / general registers | Misc registers | ADM | P3 |

---

# PART E — PORTALS, APPS & DASHBOARDS

## E1. Super-Admin Console (ERP Owner) ⚙️ `[P0 — you need this to run the SaaS]`
| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Tenant (school) management | Create/suspend/delete schools | SA | P0 |
| Onboarding / provisioning | Spin up a school instance | SA | P0 |
| Subscription & plan management | Starter/Standard/Pro/Enterprise | SA | P0/P1 |
| Billing & invoicing | Subscription + setup + wallet | SA | P1 |
| Module/feature toggles per plan | Enable modules per tenant | SA | P0 |
| Usage metering | Students, SMS, storage, txns | SA | P1 |
| Payment-gateway platform-fee tracking | Our txn revenue | SA | P1 |
| Global announcements | To all/segment of schools | SA | P2 |
| Support / ticket console | Handle school issues | SA | P1 |
| Monitoring & health | Uptime, errors, jobs | SA | P1 |
| Audit & impersonation | Debug a tenant (logged) | SA | P1 |
| Reseller/partner management | Partner accounts, commissions | SA | P2 |
| White-label/branding controls | Per-tenant logo/colors/domain | SA | P2 |
| Content/template library | Default report cards, receipts | SA | P1 |

## E2. School Web Admin Panel 🖥️ `[P0]`
Full management UI for OWN/PRIN/ADM/ACC/HR — surfaces all enabled modules above, role-scoped. Dashboards, data entry, reports, settings. **P0** for core modules; grows as modules ship.

> **Note (locked decision):** E3–E5 are **role experiences inside ONE role-based mobile app** (parent · teacher/staff · student), **not separate apps**. Same codebase/binary; delivered as the shared themed app or a dedicated per-school branded build per plan. See `architecture-context.md` §0 and Part 2.

## E3. Teacher (role in the app) 📱 `[P0]`
Attendance, marks entry, homework, timetable, announcements, leave, student info, messaging. Must be **ultra-simple, Hindi/Hinglish, offline-capable** (attendance/marks). Adoption gatekeeper — see `../docs/market-research/CUSTOMER_DISCOVERY_PLAN.md`.

## E4. Parent (role in the app) 📱 `[P0]`
Attendance alerts, fees + online payment, results/report cards, homework, timetable, notices, messaging, calendar, transport tracking (later). Multi-child. **Hindi + SMS fallback essential.**

## E5. Student (role in the app) / Portal 📱🖥️ `[P1/P2]`
Timetable, homework, results, materials, online exams, attendance. Often merged into parent app for younger classes.

## E6. Management/Owner Dashboard 🖥️📱 `[P1]`
Fee collection %, dues, attendance, admissions, enrollment trends, staff — the owner's "single glass of water" view. Strong retention driver.

## E7. Public School Website / Mini-site 🌐 `[P2]`
CMS-lite school site with online admission form, notices, gallery, contact — an acquisition + admissions asset. Optional white-label upsell.

---

# PART F — ANALYTICS & REPORTING

| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Role-based dashboards | Owner/principal/teacher/accountant | all | P1 |
| Standard reports | Attendance, fees, exam, admission, staff, transport | all | P0/P1 |
| Custom report builder | Pick fields, filters, export | PRIN, ADM | P3 |
| Export | Excel, PDF, CSV, print | all | P0 |
| Scheduled report email | Daily/weekly to owner | OWN | P2 |
| KPI / MIS summary | Cross-module metrics | OWN | P1 |
| Government / UDISE+ report support | Export data for UDISE filing | ADM | P2 |
| Board reporting (CBSE etc.) | Registration/result uploads support | PRIN | P3 |
| Predictive analytics | At-risk students, fee-default prediction | PRIN, OWN | P3 |

---

# PART G — AI & INTELLIGENT FEATURES `[mostly P3 — NOT a buying driver early]`

> Per market research: AI is **not** what makes a Bihar school pay today. Build these later as differentiation/premium, not before the MSP.

| Feature | Detail | Phase |
|---|---|---|
| WhatsApp AI assistant | Parents query fees/attendance via WhatsApp | P3 |
| Admin chatbot / helpdesk | In-app "how do I..." assistant | P3 |
| Auto report-card remarks | AI-generated teacher comments | P2/P3 |
| Smart timetable generation | Constraint solver | P3 |
| Fee-default prediction | Flag likely defaulters early | P3 |
| At-risk student detection | Attendance + marks signals | P3 |
| OCR admission/data entry | Scan forms → fields | P3 |
| Doubt-solving / tutoring (student) | AI Q&A | P3 |
| Face-recognition attendance | Camera-based | P3 |
| Analytics natural-language queries | "Show me Class 8 dues" | P3 |

---

# PART H — PLATFORM & CROSS-CUTTING CAPABILITIES `[P0 — foundational]`

| Capability | Detail | Phase |
|---|---|---|
| **Multi-tenancy** | Isolated data per school (see architecture doc) | P0 |
| **Multi-branch / school groups** | One owner, many branches, consolidated view | **P0/P1 (v1 — locked)** |
| **RBAC (roles & permissions)** | Granular, per-module, per-action | P0 |
| **Multi-language (English/Hindi/Hinglish)** | UI + notification templates | P0 |
| **Data import/export/migration tools** | Onboarding + guaranteed data export | P0 |
| **Backup & restore** | Automated, per-tenant restore | P0 |
| **Audit logs** | Who changed what, when | P0/P1 |
| **Academic-year rollover** | Clean session migration (classic churn point) | P0/P1 |
| **Offline mode + sync (mobile)** | Attendance/marks without internet | P0/P1 |
| **Notifications engine** | (see Part C1) | P0 |
| **Search (global)** | Students, staff, invoices | P1 |
| **Settings & configuration** | School profile, sessions, numbering, templates | P0 |
| **Module/plan feature flags** | Toggle features by subscription | P0 |
| **White-labeling / branding** | Logo, colors, custom domain | P2 |
| **Security: 2FA, encryption, session control** | Account + data protection | P1 |
| **DPDP / data-privacy compliance** | Consent, retention, export/delete | P1 |
| **Integrations / API** | Payment, SMS/WhatsApp, biometric, Google/Microsoft, Zoom/Meet, Tally, e-sign | P0→P2 |
| **Webhooks / developer API** | For partners/large schools | P3 |
| **In-app help / onboarding tours** | Reduce support load | P1 |
| **Feedback & feature requests** | In-product | P2 |

## Key integrations checklist
- **Payment gateways:** Razorpay / Cashfree / PayU (UPI-first). `[P1]`
- **SMS + WhatsApp:** MSG91 / Gupshup / Kaleyra (DLT-compliant). `[P0]`
- **Push:** Firebase Cloud Messaging. `[P0]`
- **Email:** Amazon SES / Postmark. `[P1]`
- **Biometric/RFID:** ESSL/Mantra device APIs. `[P2]`
- **Video classes:** Zoom / Google Meet / Jitsi. `[P3]`
- **Accounting:** Tally / Zoho Books export. `[P2]`
- **Auth (optional):** Google / Microsoft sign-in for staff. `[P2]`
- **Maps/GPS:** Google Maps / traccar for transport. `[P3]`

---

# PART H-bis — COMPETITOR CROSS-CHECK ADDITIONS

Added after auditing this catalog against **Fedena's full 72-module feature tour** (Core 21 + Standard 17 + Premium 10 + Ultimate 12 + add-ons) and the advertised feature sets of Entab, MyClassBoard, Teachmint and Campus365. Everything those vendors list is now covered above; the items below were the only ones not *explicitly* named earlier. All are low-priority (P2/P3) — none belong in the MSP.

| Feature | Detail | Roles | Phase |
|---|---|---|---|
| Placement / career management | Job/college placement tracking (mainly higher-ed/college; minor for K-12) | ADM, PRIN | P3 |
| Task / to-do management | Assign & track tasks to staff/departments | PRIN, ADM | P2 |
| Discussion forums / boards | Threaded discussions (vs. 1:1 messaging in C2) | TCH, STU | P3 |
| Blog / school CMS content | School blog & news articles (part of public site E7) | ADM | P3 |
| Form builder | Build custom forms (admission, surveys, consent) | ADM | P2 |
| Question-paper generator | Generate papers from question bank | TCH | P3 |
| Poll / voting | Quick polls to parents/staff (also in C2 surveys) | PRIN | P2 |
| Placement/alumni portal link | (see A1 alumni) | ADM | P3 |
| Branded ("app frame") white-label mobile app | Parent/teacher apps in the school's own branding | SA, OWN | P2/P3 |
| Video conferencing (BigBlueButton/Jitsi/Meet/Zoom) | Live online classes (see A10) | TCH, STU | P3 |

**Additional integrations to add to the Part H checklist:**
- **Google Workspace:** Google SSO, Google Docs/Drive, Google Meet. `[P2/P3]`
- **Microsoft/Azure:** Azure AD / Microsoft SSO, Teams. `[P3]`
- **Accounting:** QuickBooks and Zoho Books (in addition to Tally). `[P2]`
- **Payroll:** external payroll (e.g., Paybooks) integration option. `[P3]`

> **Verdict of the cross-check:** every module the major competitors publicly advertise is now represented in this catalog. The competitors differ mainly in *depth and polish* within modules (e.g., Entab's report-card variety, MyClassBoard's analytics), not in having whole modules you lack. Your differentiation is **not** matching their module count — it's reliability + local support + Hindi + fair pricing on the P0 core (see `../docs/market-research/BIHAR_COMPETITOR_ANALYSIS.md`).

---

# PART I — MINIMUM SELLABLE PRODUCT (the P0 build list, one place)

**Build ONLY this before the first sale:**

1. **Platform foundation:** multi-tenancy, RBAC, Hindi/Hinglish UI, settings, notifications engine, import/export, backups, super-admin console (tenant provisioning + module toggles).
2. **Student records** + bulk import + ID basics.
3. **Fee management:** heads, structures, installments, discounts, counter collection, instant receipts, dues/defaulter list, ledger, opening balances, fee reports. (Online payment = P1 fast-follow.)
4. **Attendance:** daily marking (teacher app, offline), parent absence alert, reports.
5. **Exams & report cards:** term setup, grading, marks entry, board-format report cards, publish to parents.
6. **Communication:** push + SMS (+ WhatsApp), announcements, absence/fee/result alerts, SMS wallet.
7. **Apps & panels:** web admin (school), teacher app, parent app, owner dashboard (basic).
8. **Onboarding tooling:** data migration/import + validation.

Everything in Parts A2–D6, F, G and most of E5–E7 is **explicitly deferred**. Shipping a small, reliable P0 in Hindi that nails fees + attendance + report cards + parent comms beats a broad, shallow suite — see the market-research verdict.

---

*Priorities reflect the Patna/Bihar market research (`../docs/market-research/`). Re-validate the MSP against real pilot feedback (feature-priority exercise in `../docs/market-research/CUSTOMER_DISCOVERY_PLAN.md`) before locking the build.*

---

# APPENDIX — Granular Sub-Feature Reference

_Merged from the former `FEATURE_CATALOG_DETAILED.md`: the exhaustive per-module **sub-feature** breakdown, verified against competitor feature pages (Fedena, MyClassBoard, Entab, Campus365, Vidyalaya, Genius, IITMS). Phase tags here use **[0]=P0 (MSP) · [1]=P1 (fast-follow) · [2]=P2 (later) · [3]=P3 (premium/optional)** — same phases as above._

## 1. Student Information (SIS)
- Student registration & unique admission/enrollment number (auto-format, prefix per session/class) **[0]**
- Roll number allocation (auto/manual, per section) **[0]**
- Full profile: name, DOB, gender, blood group, nationality, mother tongue, religion, caste/category, Aadhaar, photo **[0]**
- Contact & multiple addresses (permanent/correspondence) **[0]**
- Parent/guardian details (father, mother, guardian; occupation, income, qualification) **[0]**
- Multiple guardian contacts + emergency contact **[0]**
- Sibling linking & grouping **[1]**
- Previous school details & prior TC **[1]**
- Medical/health record (allergies, conditions, disabilities/CWSN) **[1]**
- Custom/extra fields (JSONB, school-defined) **[1]**
- Document upload & vault (birth cert, Aadhaar, photos, marksheets) **[1]**
- Bulk import (Excel/CSV) with template, validation, duplicate detection **[0]**
- Bulk edit / bulk operations **[1]**
- Student status lifecycle: active, inactive, TC issued, alumni, struck-off, long leave **[0]**
- Class/section allocation & reallocation **[0]**
- Category/house/group tagging **[2]**
- Student ID card generation (templated, photo, barcode/QR, bulk print) **[1]**
- Search & advanced filters (name, adm no., class, phone, category) **[0]**
- Student profile timeline (discipline, achievements, remarks, activity log) **[2]**
- Promotion/detention to next class & session (bulk, with criteria) **[0/1]**
- Roll-back / re-admission / transfer between sections & branches **[1/2]**
- Alumni records & alumni portal **[3]**
- Data export per student (guaranteed export) **[0]**

## 2. Admission & Enquiry (CRM)
- Enquiry capture: walk-in, phone, web, referral (source tagging) **[1]**
- Lead pipeline & stages (enquiry → contacted → visited → applied → admitted → lost) **[1]**
- Lead assignment to counselor/staff **[2]**
- Automated & scheduled follow-ups + reminders + missed-follow-up alerts **[1]**
- Multi-channel outreach to leads (SMS/WhatsApp/email) **[2]**
- Online admission/registration form (public, on website) **[1]**
- Registration/application fee collection (online) **[1]**
- Document upload & verification checklist **[1]**
- Entrance test / interview scheduling + slots + results **[2]**
- Merit list, ranking, seat allotment, waitlist, quota/RTE seats **[2]**
- Offer/admission letter generation (auto, email/print) **[2]**
- Applicant → student one-click conversion (carry data) **[1]**
- Admission analytics (source, conversion %, seats filled, funnel) **[2]**
- Prospectus/brochure sale tracking **[3]**
- Enquiry & admission reports **[1]**

## 3. Parent / Guardian
- Parent account per guardian; OTP/phone login **[0]**
- One login → multiple children (multi-child) **[0]**
- Guardian-level access control (what each can view/pay) **[2]**
- Communication preferences & opt-in (SMS/WhatsApp/push/email) **[1]**
- Parent app invite/onboarding via SMS link **[0]**
- Profile self-update requests (approval-gated) **[2]**

## 4. Staff / Teacher / HR
- Staff profile (personal, contact, qualifications, experience, photo) **[0]**
- Employee ID, department, designation, joining date **[0]**
- Teaching / non-teaching classification **[1]**
- Role & permission assignment (RBAC) **[0]**
- Subject–class–section allocation to teachers **[0]**
- Class-teacher assignment **[0]**
- Staff document store (certificates, contracts, ID) **[1]**
- Staff/employee directory & search **[1]**
- Staff attendance (biometric/app/manual) **[1]**
- Leave management (types, balances, apply/approve, carry-forward, half-day) **[1]**
- Staff ID card generation **[2]**
- Recruitment/applicant tracking & onboarding **[3]**
- Performance appraisal / reviews **[3]**
- Staff transfer between branches **[2]**

## 5. Academic Structure
- Academic session/year create, activate, roll over **[0]**
- Class/grade setup (Nursery–XII) **[0]**
- Section setup + capacity **[0]**
- Stream/group for XI–XII (Science/Commerce/Arts) **[1]**
- Subject master (core/elective/additional; theory/practical) **[0]**
- Subject groups / elective baskets / combinations **[2]**
- Teacher–subject–class mapping grid **[0]**
- House system **[3]**
- Curriculum/board tagging (CBSE/ICSE/State) per class **[0/1]**

## 6. Attendance (student)
- Daily attendance: present/absent/late/leave/half-day **[0]**
- Mobile app marking, offline-capable, syncs later **[0]**
- Bulk / whole-class / holiday marking **[0]**
- Period-wise / subject-wise attendance **[2]**
- Parent absence alert (auto SMS/push) **[0]**
- Biometric attendance integration (fingerprint) **[2]**
- RFID card/uniform-tag attendance + gate checkpoint logging **[2]**
- Face-recognition attendance (80+ nodal points) **[3]**
- Real-time attendance updates to parents/management **[1]**
- Attendance correction/regularization (audited) **[1]**
- Attendance registers & monthly % reports **[0]**
- Defaulter / chronic-absentee reports & analytics **[1]**
- Attendance-based eligibility (exam/board) checks **[2]**
- Leave application by student/parent **[2]**

## 7. Homework / Assignments
- Assign homework per class/subject with attachments & due date **[1]**
- Homework calendar (week/subject view) **[1]**
- Parent & student view on app **[1]**
- Digital submission (upload) **[2]**
- Grading, marks & feedback on submissions **[2]**
- Plagiarism/late-submission flags **[3]**
- Homework completion tracking/reports **[2]**

## 8. Examination, Assessment & Report Cards
- Exam/term setup (unit test, half-yearly, annual, practical, pre-board) **[0]**
- Multiple grading schemes: marks, percentage, grades, GPA/CGPA, CBSE CCE **[0]**
- Board-specific configs (CBSE/ICSE/State) **[0/1]**
- Exam timetable / datesheet (dates, rooms, invigilation) **[1]**
- Grid-based marks entry per subject (with >100% guard) **[0]**
- Marks entry via teacher app & web **[0]**
- Grace marks, weightage, best-of-N, moderation/normalization rules **[1/2]**
- Marks review, edit, approve & lock (moderation) **[1]**
- Co-scholastic / scholastic split, activity & discipline grades, remarks **[1]**
- Auto / templated / AI teacher remarks **[2]**
- Report card generation (configurable templates, school header/logo, e-sign) **[0]**
- Bulk report-card PDF for entire class **[0]**
- Consolidated results, totals, averages, weighted averages, class rank, toppers **[1]**
- Transcripts / cumulative multi-year record **[2]**
- Publish results to parent app + download PDF + SMS marks **[0]**
- Instant "marks entered" notification to parents **[1]**
- Admit card / hall ticket generation **[1]**
- Online examination (MCQ + descriptive, timer, auto-grade, proctoring) **[2]**
- Question bank **[3]**
- Question-paper generator (from bank, blueprint-based) **[3]**
- Result analytics (subject-wise, pass %, weak areas, comparison) **[1]**
- Grade cards for competitive/olympiad exams **[3]**

## 9. Timetable & Scheduling
- Class timetable (period grid per section) **[1]**
- Teacher timetable (per teacher) **[1]**
- Auto/smart timetable generation (constraint-based) **[3]**
- Substitution management (cover absent teachers, notify) **[2]**
- Room/lab/resource allocation **[3]**
- Timetable on app (parent/student/teacher) **[1]**
- Bell schedule / shift management **[2]**

## 10. Lesson Planning, Curriculum & LMS
- Syllabus/curriculum definition & progress tracking (chapter-wise) **[2]**
- Lesson plans (daily/weekly) & approval **[2]**
- Study material / content library (notes, PDF, video, links) **[2]**
- Online/live classes (Zoom/Meet/Jitsi/BigBlueButton) **[3]**
- Recorded lectures storage & streaming **[3]**
- Digital quizzes/assessments **[2]**
- Learning/engagement analytics **[3]**
- Course & batch management (for coaching/higher-ed) **[2]**

## 11. Fee Management (the #1 module — full depth)
- Fee heads/components (tuition, transport, exam, admission, lab, misc) **[0]**
- Fee types: one-time, monthly, quarterly, term, annual, weekly, daily, refundable **[0]**
- Fee structures per class / category / session **[0]**
- Installment plans & due dates **[0]**
- Concessions/discounts (% or amount) with templates: RTE, BPL, staff-child, sibling, merit, scholarship **[0]**
- Concession request workflow (approved/rejected/pending stats) **[1]**
- Fine/late-fee rules (per fee type, per installment, auto-apply after due) **[1]**
- Fee assignment to students (bulk & individual) **[0]**
- Fee collection at counter (cash, cheque, DD, card, UPI, bank, ECS) **[0]**
- Partial / advance payment handling **[1]**
- Instant receipt (multiple formats, next-due shown, print/PDF/share) **[0]**
- Receipt cancellation/correction with comments (audited) **[1]**
- Fee ledger per student (full history) **[0]**
- Dues & defaulter lists (by class/amount/ageing) **[0]**
- Automated fee reminders (SMS/WhatsApp/push, scheduled) **[0/1]**
- Online fee payment (UPI/card/netbanking gateway) **[1]**
- Payment reconciliation (gateway/bank ↔ receipts) **[1]**
- Refunds & adjustments (approval + audit) **[1]**
- Opening/legacy balances at onboarding **[0]**
- Cheque / PDC tracking (status, bounce, re-deposit) **[2]**
- Fee transfer between students / siblings **[2]**
- Fee import from Excel **[0]**
- Day-care / add-on plan fees **[2]**
- Multi-currency **[3]**
- Fee reports: daily collection, head-wise, mode-wise, outstanding, projected, cancelled **[0]**
- Payment-gateway platform-fee capture (our revenue) **[1]**

## 12. Accounting & Finance
- Income & expense tracking (heads, vouchers) **[2]**
- Chart of accounts / general ledger **[2]**
- Cash book, day book, bank book **[2]**
- Vendor/supplier bills & payables **[2]**
- Bank reconciliation **[2]**
- Financial statements (P&L, balance sheet, trial balance) **[3]**
- GST/tax handling & invoices **[2]**
- Petty cash management **[2]**
- Budgeting (plan vs actual) **[3]**
- Tally / QuickBooks / Zoho Books export **[2]**

## 13. Payroll & Salary
- Salary structure templates per employee category **[2]**
- Earnings & deductions heads (basic, HRA, allowances, deductions) **[2]**
- Attendance/leave-linked salary auto-calculation (gross/net) **[2]**
- Statutory: PF, ESI, PT, TDS auto per Indian rules **[2]**
- Payslip generation (PDF, share via WhatsApp/email) **[2]**
- Salary disbursement / bank NEFT file export **[2]**
- Loans & advances tracking + recovery **[3]**
- Increments, arrears, bonus **[3]**
- Overtime handling **[3]**
- Payroll registers & statutory reports **[2]**
- Multi-branch payroll from one dashboard **[2]**
- External payroll integration (e.g., Paybooks) **[3]**

## 14. Inventory, Assets & Procurement
- Item master & categories; multiple stores/locations **[2/3]**
- Stock in/out; issue & return to staff/departments **[2]**
- Purchase requisition → PO → GRN flow **[3]**
- Vendor/supplier management **[3]**
- Asset register + depreciation + insurance **[3]**
- Low-stock / reorder alerts **[3]**
- Uniform/book store & POS sales to parents (link to fees) **[3]**
- Inventory reports & audit **[3]**

## 15. Communication & Engagement
- Push notifications (FCM) **[0]**
- SMS (transactional, DLT-compliant, templates) **[0]**
- WhatsApp Business API (template messages) **[0/1]**
- Email (transactional + bulk) **[1]**
- In-app inbox / message center **[1]**
- SMS/WhatsApp prepaid wallet + pass-through billing **[0/1]**
- Delivery status & logs (sent/delivered/failed) **[1]**
- Announcements / notice board (school-wide or targeted class/role) **[0/1]**
- Circulars with attachments + read acknowledgement **[1]**
- News management / school blog **[3]**
- Class/group broadcast (replace WhatsApp groups) **[1]**
- Parent–teacher 1:1 messaging/chat (moderated) **[2]**
- Discussion forums / boards (threaded) **[3]**
- PTM scheduling & slot booking + reminders **[2]**
- Events & school calendar (holidays, exams, events) **[1]**
- Photo gallery / media sharing **[2]**
- Complaint / grievance / suggestion box (raise & track) **[2]**
- Surveys / polls / feedback forms **[2]**
- Form builder (custom forms: consent, admission, survey) **[2]**
- Newsletter **[3]**
- Birthday/greeting automation **[3]**
- Emergency / SOS broadcast to all parents **[2]**
- Task / to-do assignment to staff **[2]**

## 16. Transport
- Route creation, modification, combination + stoppage mapping **[2]**
- Stops/pickup points with address + GPS coordinates **[2]**
- Fare/zone-based transport fee (link to fees) **[2]**
- Vehicle master (seating, reg., fitness, insurance, permit, PUC) **[2]**
- Driver & attendant management (details, license, contact) **[2]**
- Student route/stop allocation **[2]**
- Real-time GPS live tracking (Google Maps, ETA) **[3]**
- Geofencing + route-deviation + restricted-zone alerts **[3]**
- Speeding / harsh-braking / driver-behaviour monitoring **[3]**
- Pickup/drop & bus-approaching notifications to parents **[3]**
- In-bus attendance (RFID/biometric board & deboard) **[3]**
- Route optimization **[3]**
- Transport reports (utilization, route efficiency, fuel, ridership history) **[2/3]**
- Vehicle maintenance & document-expiry alerts **[3]**

## 17. Library
- Book catalog (title, author, ISBN, copies, categories) **[2]**
- Barcode/QR/RFID generation & scanning **[2]**
- Member management (students/staff) **[2]**
- Issue / return / renew / reserve (circulation) **[2]**
- Hold/reservation queue **[3]**
- Fines for late return (link to fees) **[2]**
- OPAC (online public access catalog, browse & reserve) **[3]**
- ISBN/title bibliographic fetch, duplicate check **[3]**
- Digital library / e-books / e-resources **[3]**
- Multi-library / multi-campus catalogs & rules **[3]**
- Stock audit & 50+ library reports (circulation, overdue, top titles, fines) **[3]**

## 18. Hostel / Dormitory
- Hostel & room master (blocks, room types, capacity) **[3]**
- Room allocation / vacate / transfer **[3]**
- Hostel attendance & night roll call **[3]**
- Mess/meal menu & attendance **[3]**
- Hostel & mess fees (link to fees) **[3]**
- Gate pass / leave / outing / visitor for hostellers **[3]**
- Warden management & complaints **[3]**
- Hostel inventory (bedding, furniture) **[3]**

## 19. Front Office & Gate
- Visitor management (log in/out, photo, purpose, pass) **[2]**
- Enquiry/walk-in log **[1]**
- Phone-call log (incoming/outgoing) **[3]**
- Postal / courier dispatch & receive register **[3]**
- Complaint desk (log & route) **[2]**
- Gate pass / early-leave approval + parent alert **[2]**
- Lost & found register **[3]**

## 20. Certificates & Documents
- Transfer Certificate (TC) with number & register **[1]**
- Bonafide / character / conduct / study certificates **[1]**
- Custom certificate builder (design own templates) **[2]**
- Student & staff ID cards (bulk, photo, QR) **[1]**
- Admit cards / hall tickets **[1]**
- Certificate issue register/log **[1]**
- Document management system (central store, tags, versions) **[2]**
- Digital signature / e-sign on documents **[3]**
- Merit/participation certificates **[3]**

## 21. Health, Discipline & Others
- Health/medical records & infirmary visit log **[3]**
- Health checkup camps & growth tracking **[3]**
- Discipline: merit/demerit points, incident log **[2]**
- Awards & achievements tracking/display **[3]**
- Canteen/cafeteria (prepaid wallet, menu, POS) **[3]**
- Biometric/RFID device integration hub **[2]**
- Placement / career management (mainly higher-ed) **[3]**
- General registers (stock, movement, misc) **[3]**

## 22. Portals, Apps & Dashboards
> Mobile = **one role-based app** (teacher/parent/student are roles, not separate apps); delivered shared-themed or dedicated-branded per plan.
- Super-admin (ERP owner) console: tenant CRUD, provisioning, plans, billing, module toggles, usage metering, platform-fee tracking, support console, monitoring, impersonation (audited), reseller/partner mgmt, white-label controls, template library **[0/1/2]**
- School web admin panel (role-scoped, all enabled modules) **[0]**
- Teacher app + web (attendance, marks, homework, timetable, leave, messaging; offline) **[0]**
- Parent app (attendance, fees + online pay, results, homework, timetable, notices, messaging, calendar, transport later; multi-child; Hindi + SMS fallback) **[0]**
- Student app/portal (timetable, homework, results, materials, online exams) **[1/2]**
- Management/owner dashboard (collection %, dues, attendance, admissions, enrollment, staff) **[1]**
- Principal dashboard (academics, attendance, results, staff) **[1]**
- Accountant portal (fees, dues, collection, reconciliation) **[0]**
- Public school website / mini-site + CMS + online admission **[2]**
- Branded/white-label mobile app ("app frame") **[2/3]**
- Role-based customizable dashboards & widgets **[1/2]**

## 23. Analytics & Reporting
- Role-based dashboards (owner/principal/teacher/accountant) **[1]**
- Standard reports: attendance, fees, exam/result, admission, staff, transport, library **[0/1]**
- Custom report builder (fields, filters, export) **[3]**
- Export to Excel / PDF / CSV / print **[0]**
- Scheduled report email (daily/weekly to owner) **[2]**
- KPI / MIS cross-module summary **[1]**
- UDISE+ / government report data export **[2]**
- Board reporting support (CBSE registration/result uploads) **[3]**
- Predictive analytics: fee-default prediction, at-risk students **[3]**
- Comparative/trend analytics (YoY, class, section) **[2]**

## 24. AI & Intelligent (mostly [3] — not a buying driver early)
- WhatsApp AI assistant (parents query fees/attendance) **[3]**
- Admin/help chatbot **[3]**
- Auto report-card remarks (AI) **[2/3]**
- Smart/auto timetable generation **[3]**
- Fee-default & at-risk prediction **[3]**
- OCR admission/data entry (scan forms → fields) **[3]**
- Doubt-solving / AI tutor (student) **[3]**
- Face-recognition attendance **[3]**
- Natural-language analytics queries **[3]**

## 25. Platform & Cross-Cutting (foundational — mostly [0])
- Multi-tenancy (tenant isolation) **[0]**
- Multi-branch / school-group consolidated management **[0/1 — v1 locked]**
- RBAC — granular roles & permissions (per module/action) **[0]**
- Multi-language: English / Hindi / Hinglish (UI + templates) **[0]**
- Data import / export / migration tooling **[0]**
- Backup & restore (per-tenant) **[0]**
- Audit logs (who/what/when) **[0/1]**
- Academic-year rollover (clean session migration) **[0/1]**
- Offline mode + sync (mobile attendance/marks) **[0/1]**
- Global search (students, staff, invoices) **[1]**
- Settings/configuration (profile, sessions, numbering, templates) **[0]**
- Module/plan feature flags (toggle by subscription) **[0]**
- White-labeling / branding / custom domain **[2]**
- Security: 2FA, encryption, session control, password policy **[1]**
- DPDP / data-privacy compliance (consent, retention, export/delete) **[1]**
- In-app help, onboarding tours, tooltips **[1]**
- Feedback & feature-request capture **[2]**
- Developer API / webhooks (partners, large schools) **[3]**
- Notification engine (channels, templates, scheduling, retries) **[0]**
- Theme customization **[2]**

## 26. Integrations (full checklist)
- Payment gateways: Razorpay / Cashfree / PayU (UPI-first) **[1]**
- SMS + WhatsApp: MSG91 / Gupshup / Kaleyra (DLT) **[0]**
- Push: Firebase Cloud Messaging **[0]**
- Email: Amazon SES / Postmark / Resend **[1]**
- Biometric/RFID devices: ESSL / Mantra / device APIs **[2]**
- Video classes: Zoom / Google Meet / Jitsi / BigBlueButton **[3]**
- Accounting: Tally / QuickBooks / Zoho Books **[2]**
- Payroll: Paybooks **[3]**
- SSO: Google Workspace / Microsoft Azure AD **[2/3]**
- Docs: Google Docs/Drive **[3]**
- Maps/GPS: Google Maps / traccar (transport) **[3]**
- e-Sign: DigiSigner / Zoho Sign **[3]**

---

## Coverage statement

This granular catalog was compiled by auditing the published sub-feature lists of Fedena, MyClassBoard, Entab, Campus365, Vidyalaya, Genius EduSoft, IITMS and multiple Indian ERP vendors, module by module. **To the best of desk research, it now covers the full sub-feature universe these products advertise**, including small items (concession request workflow, cheque/PDC tracking, geofencing alerts, OPAC, period-wise leave, receipt cancellation, etc.).

Two honest limits remain:
1. **Depth of implementation** (e.g., exactly how many report-card templates, how flexible the fee rules) can only be judged by using each competitor's live product — do this during Phase-0 competitor demos.
2. **New/vendor-specific micro-features** appear over time; treat this as a living document and update it after the competitor demo teardown.

**Strategic reminder unchanged:** the goal is *not* to build all of this. Build the **[0]** MSP, sell it, then use this list to sequence upsells. Competing on module count is a losing game against 10-year-old incumbents; you win on reliability, local support, Hindi, and fair pricing (see `../docs/market-research/BIHAR_COMPETITOR_ANALYSIS.md`).

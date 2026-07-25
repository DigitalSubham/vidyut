# Data Model — Vidyut School ERP (v1 core)

Buildable schema spec for the **complete-core** build. Prisma + PostgreSQL, multi-tenant shared-schema + RLS, **multi-branch in v1**. This defines entities, key fields, relations, enums, and RLS rules. Full detail/rationale: `architecture-context.md`. Feature meaning: `feature-catalog.md`.

---

## 1. Conventions (apply to EVERY tenant-owned table)

- **Primary key:** `id` — `String @id @default(cuid())`.
- **Tenant scoping:** `tenantId` on every tenant-owned row; **`branchId`** where the record belongs to a specific branch (most academic/operational data).
- **Timestamps:** `createdAt`, `updatedAt`. **Soft delete:** `deletedAt DateTime?` (queries exclude non-null).
- **Audit:** `createdById`, `updatedById` (User) where it matters; sensitive changes also write `AuditLog`.
- **Money:** integer **paise** (`Int`), never Float/Decimal-as-float. Currency INR implicit.
- **RLS:** every tenant table has a policy `tenantId = current_setting('app.tenant_id')`. All access via **`withTenant(tenantId, fn)`** (sets `SET LOCAL app.tenant_id` per transaction). Branch scoping is enforced in the service layer via the user's branch memberships (not RLS).
- **Enums** are Postgres enums via Prisma `enum`.
- **Naming:** tables singular PascalCase (Prisma models); fields camelCase.

---

## 2. Tenancy & Org

**Tenant** = the customer (school **owner/group**). One subscription per tenant.
- `id, name, slug (unique), status(TenantStatus), planId, appType(AppDelivery), locale(default "en"), createdAt…`
- Relations: `branches[]`, `users[]`, `subscription`, everything tenant-owned.

**Branch** = a physical school under the tenant (multi-branch v1). Single-school tenants have exactly one.
- `id, tenantId, name, code, address, board(Board), logoUrl?, isActive`
- Relations: `sessions[]`, `classes[]`, `students[]`, `staff[]`, `users (via membership)`.

**AcademicSession** — per branch, e.g. "2026–27".
- `id, tenantId, branchId, name, startDate, endDate, isCurrent(Boolean)`

Enums: `TenantStatus{ACTIVE,SUSPENDED,TRIAL,CANCELLED}` · `AppDelivery{SHARED,DEDICATED}` · `Board{CBSE,ICSE,STATE_BIHAR,OTHER}` (v1 default CBSE).

## 3. Identity, Users & RBAC

**User** — any human login (staff, parent, student). Auth via JWT; parents = phone OTP, staff = email+password+2FA.
- `id, tenantId, name, phone?, email?, passwordHash?, status, twoFactorEnabled, locale`
- Unique: `(tenantId, phone)`, `(tenantId, email)`.

**Role** — per tenant, bundles permissions. Seeded defaults + custom.
- `id, tenantId, key(RoleKey), name, isSystem`

**Permission** — static catalog (strings like `fees.collect`); **UserRole** links user↔role (optionally scoped to a branch).
- `UserRole{ id, userId, roleId, branchId? }` — branch-scoped role assignment enables multi-branch access control.
- **RolePermission{ roleId, permissionKey }**.

**BranchMembership** — which branches a user can access (drives branch scoping).
- `{ id, userId, branchId }` unique `(userId, branchId)`.

Full role list + permission matrix: `rbac.md`. Enums: `RoleKey{OWNER,PRINCIPAL,ADMIN,ACCOUNTANT,TEACHER,PARENT,STUDENT,SUPERADMIN}` · `UserStatus{ACTIVE,INACTIVE,INVITED}`.

## 4. Academic Structure

**Class** (grade) → **Section** → **Subject** → **TeacherAssignment**.
- `Class{ id, tenantId, branchId, name, order }`
- `Section{ id, tenantId, branchId, classId, name, capacity, classTeacherId? (Staff) }`
- `Subject{ id, tenantId, branchId, name, code, type(SubjectType) }`
- `ClassSubject{ classId, subjectId, isElective }` (subjects offered per class)
- `TeacherAssignment{ id, tenantId, branchId, sessionId, staffId, subjectId, sectionId }`

Enum: `SubjectType{CORE,ELECTIVE,CO_SCHOLASTIC,PRACTICAL}`.

## 5. Students, Guardians, Enrollment

**Student** — belongs to a branch; profile + status.
- `id, tenantId, branchId, admissionNo(unique per branch), rollNo?, firstName, lastName, dob, gender, bloodGroup?, category?, religion?, photoUrl?, address, status(StudentStatus), customFields(Json)`

**Guardian** — a parent/guardian (links to a User account for app login).
- `id, tenantId, userId?, name, relation(GuardianRelation), phone, email?, occupation?`

**StudentGuardian** — many-to-many + which guardian is primary/pays.
- `{ studentId, guardianId, isPrimary, canPay }`

**Enrollment** — student in a class/section for a session (history preserved for rollover).
- `id, tenantId, branchId, studentId, sessionId, classId, sectionId, rollNo?, status(EnrollmentStatus)`

Enums: `StudentStatus{ACTIVE,INACTIVE,TC_ISSUED,ALUMNI,STRUCK_OFF}` · `GuardianRelation{FATHER,MOTHER,GUARDIAN,OTHER}` · `EnrollmentStatus{ACTIVE,PROMOTED,DETAINED,LEFT}`.

## 6. Admissions (light v1)

**Enquiry** → **Application** → convert to Student.
- `Enquiry{ id, tenantId, branchId, childName, guardianName, phone, source, stage(EnquiryStage), assignedToId?, followUpAt? }`
- `Application{ id, tenantId, branchId, enquiryId?, formData(Json), classAppliedId, status(ApplicationStatus), regFeeInvoiceId? }`
Enums: `EnquiryStage{NEW,CONTACTED,VISITED,APPLIED,ADMITTED,LOST}` · `ApplicationStatus{DRAFT,SUBMITTED,OFFERED,CONFIRMED,REJECTED}`.

## 7. Staff & Leave

**Staff** — employee record (a User with staff roles).
- `id, tenantId, branchId, userId, employeeNo, designation, type(StaffType), qualifications?, joinedAt, docs(Json)`
- `LeaveRequest{ id, tenantId, branchId, staffId, type, fromDate, toDate, halfDay, status(LeaveStatus), approverId? }`
Enums: `StaffType{TEACHING,NON_TEACHING}` · `LeaveStatus{PENDING,APPROVED,REJECTED,CANCELLED}`.

## 8. Attendance

**AttendanceRecord** — per student per day (period-wise later).
- `id, tenantId, branchId, sessionId, sectionId, studentId, date, status(AttendanceStatus), markedById, source(AttendanceSource), syncedAt?`
- Unique: `(studentId, date)` (daily). Offline: client-generated `id` for idempotent sync.
Enums: `AttendanceStatus{PRESENT,ABSENT,LATE,LEAVE,HALF_DAY,HOLIDAY}` · `AttendanceSource{APP,WEB,BIOMETRIC,IMPORT}`.

## 9. Examinations & Report Cards (CBSE-first)

- `Exam{ id, tenantId, branchId, sessionId, name, type(ExamType), gradingScheme(GradingScheme), startDate?, isLocked }`
- `ExamSubject{ id, examId, classId, subjectId, maxMarks, passMarks, weightage? }`
- `MarksEntry{ id, tenantId, branchId, examSubjectId, studentId, marks(Int?), grade?, isAbsent, enteredById, lockedAt? }` — unique `(examSubjectId, studentId)`; **guard marks ≤ maxMarks**.
- `ReportCardTemplate{ id, tenantId, branchId?, name, board(Board), layout(Json) }` (config-driven).
- `ReportCard{ id, tenantId, branchId, sessionId, studentId, examId?/termId, pdfUrl?, publishedAt? }`
Enums: `ExamType{UNIT_TEST,HALF_YEARLY,ANNUAL,PRE_BOARD,PRACTICAL}` · `GradingScheme{MARKS,PERCENTAGE,GRADE,CCE,CGPA}`.

## 10. Fees (deep — #1 module)

- `FeeHead{ id, tenantId, branchId, name, type(FeeType) }` (tuition, transport, exam…)
- `FeeStructure{ id, tenantId, branchId, sessionId, classId?, name }` + `FeeStructureItem{ structureId, feeHeadId, amount(paise), frequency(FeeFrequency), dueDayOfMonth? }`
- `FeeAssignment{ id, tenantId, branchId, studentId, structureId }` (bulk/individual)
- `Concession{ id, tenantId, branchId, studentId, type(ConcessionType), value, isPercent, status, approvedById? }`
- `Invoice{ id, tenantId, branchId, studentId, sessionId, number, periodLabel, dueDate, status(InvoiceStatus) }` + `InvoiceItem{ invoiceId, feeHeadId, amount, discount, fine }`
- `Payment{ id, tenantId, branchId, invoiceId?, studentId, amount(paise), mode(PaymentMode), reference?, gatewayOrderId?, status(PaymentStatus), receivedById?, idempotencyKey(unique) }`
- `Receipt{ id, tenantId, branchId, paymentId, number, pdfUrl?, cancelledAt?, cancelReason? }`
- **Every** fee mutation writes a ledger view (derive from Invoice/Payment) + `AuditLog`. Opening balances at onboarding = seed Invoices.
Enums: `FeeType{TUITION,TRANSPORT,EXAM,ADMISSION,LAB,MISC}` · `FeeFrequency{ONE_TIME,MONTHLY,QUARTERLY,TERM,ANNUAL}` · `ConcessionType{RTE,BPL,SIBLING,STAFF,MERIT,SCHOLARSHIP,OTHER}` · `InvoiceStatus{PENDING,PARTIAL,PAID,CANCELLED,OVERDUE}` · `PaymentMode{CASH,CHEQUE,DD,CARD,UPI,NETBANKING,BANK,WALLET}` · `PaymentStatus{PENDING,SUCCESS,FAILED,REFUNDED}`.

## 11. Communication, Certificates, Timetable, Homework

- `NotificationLog{ id, tenantId, branchId, channel(NotifChannel), templateKey, toUserId?/phone, status(NotifStatus), payload(Json), sentAt? }`
- `Announcement{ id, tenantId, branchId, title, body, audience(Json: roles/classes), attachmentUrl?, publishedAt }`
- `Certificate{ id, tenantId, branchId, studentId, type(CertificateType), number, pdfUrl?, issuedAt }`
- `TimetablePeriod{ id, tenantId, branchId, sessionId, sectionId, dayOfWeek, periodNo, subjectId, staffId, room? }`
- `Homework{ id, tenantId, branchId, sectionId, subjectId, title, description, attachmentUrl?, dueDate, createdById }`
Enums: `NotifChannel{PUSH,SMS,WHATSAPP,EMAIL,IN_APP}` · `NotifStatus{QUEUED,SENT,DELIVERED,FAILED}` · `CertificateType{TC,BONAFIDE,CHARACTER,CONDUCT,CUSTOM}`.

## 12. Documents & Audit

- `Document{ id, tenantId, branchId?, ownerType, ownerId, name, key(S3), mime, size }` (student docs, uploads).
- `AuditLog{ id, tenantId, branchId?, actorId, action, entity, entityId, before(Json?), after(Json?), createdAt }`.

## 13. Platform (NOT tenant-scoped — super-admin/billing)

- `Plan{ id, key(PlanKey), name, priceYear(paise), setupFee(paise), studentLimit, userLimit, storageGb, appType(AppDelivery), modules(Json) }`
- `Subscription{ id, tenantId, planId, status, currentPeriodEnd, seats? }`
- `PlatformInvoice{ id, tenantId, amount, status, periodLabel, issuedAt }`
- `SmsWallet{ id, tenantId, balancePaise }` + `WalletTxn{...}`
- `ModuleToggle{ id, tenantId, moduleKey, enabled }` (per-tenant feature flags; default from plan)
- `AppBuild{ id, tenantId, platform, mode(AppDelivery), version, storeStatus, buildRef }` (white-label pipeline)
Enum: `PlanKey{STARTER,STANDARD,PRO,ENTERPRISE}`. Details: `plans-entitlements.md`.

---

## 14. RLS & multi-branch rules (must-follow)

1. **RLS** on all §2–§12 tables: `USING (tenantId = current_setting('app.tenant_id'))`. Platform tables (§13) are accessed only by super-admin (separate guard), not via `withTenant`.
2. **Branch scoping** is enforced in services: a user sees only rows whose `branchId ∈ their BranchMembership` (OWNER/PRINCIPAL may span all branches of the tenant; ADMIN/TEACHER/ACCOUNTANT typically one branch).
3. **Never** query tenant tables outside `withTenant()`. Add a cross-tenant + cross-branch isolation test per module.
4. **Academic-year rollover** clones structure (classes/sections/subjects/fee structures) into a new session and creates new Enrollments (promote/detain) while preserving prior sessions — never mutate historical rows.

## 15. Build order note
Unit 02 creates §2–§3 (Tenant/Branch/Session/User/Role/Permission/RLS/`withTenant`). Units 06–21 add the rest per `progress-tracker.md`. Keep migrations expand-then-contract; seed default roles + a demo tenant.

*This is the buildable v1 spec. Extend for on-demand modules (transport/library/hostel/payroll/inventory) when those units start — same conventions.*

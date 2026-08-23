import { decodeJwtPayload } from "./jwt";

const TOKEN_KEY = "vidyut_admin_token";
const BRANCH_KEY = "vidyut_admin_branch";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function getAdminBranchId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(BRANCH_KEY);
}

export function setAdminBranchId(branchId: string): void {
  window.localStorage.setItem(BRANCH_KEY, branchId);
}

interface AccessTokenClaims {
  roles?: string[];
}

/** Role list read straight from the JWT (same approach as apps/mobile) — no `GET /auth/me` endpoint exists yet to fetch permissions, so nav filtering here is role-based, not permission-based (a deliberate simplification, see progress-tracker.md). */
export function getAdminRoles(): string[] {
  const token = getAdminToken();
  if (!token) return [];
  return decodeJwtPayload<AccessTokenClaims>(token)?.roles ?? [];
}

interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}

export class AdminApiError extends Error {
  code: string;
  fields?: Record<string, string>;

  constructor(body: ApiErrorBody) {
    super(body.error?.message ?? "Unknown error");
    this.code = body.error?.code ?? "INTERNAL";
    this.fields = body.error?.fields;
  }
}

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AdminApiError(body as ApiErrorBody);
  }
  return body as T;
}

export interface Student {
  id: string;
  admissionNo: string;
  rollNo: string | null;
  firstName: string;
  lastName: string;
  status: string;
  branchId: string;
}

export interface StudentTimelineEntry {
  id: string;
  studentId: string;
  type: "DISCIPLINE" | "ACHIEVEMENT" | "NOTE";
  body: string;
  occurredAt: string;
}

export interface ClassItem {
  id: string;
  name: string;
  order: number;
}

export interface SectionItem {
  id: string;
  name: string;
  classId: string;
}

export interface InvoiceItem {
  id: string;
  number: string;
  periodLabel: string;
  status: string;
  studentId: string;
  dueDate: string;
}

// -- Unit 48: Fee Management Depth (Cheque/PDC Tracking) --------------------

export interface ChequeRow {
  id: string;
  paymentId: string;
  chequeNo: string;
  bankName: string;
  dueDate: string;
  status: "PENDING" | "CLEARED" | "BOUNCED";
  payment: { id: string; studentId: string; amount: number; invoiceId: string | null };
}

export interface AttendanceRegisterRow {
  studentId: string;
  firstName: string;
  lastName: string;
  days: Record<string, string>;
}

export interface DefaulterRow {
  studentId: string;
  firstName: string;
  lastName: string;
  attendancePercent: number;
}

export interface TenantProfile {
  id: string;
  name: string;
  address: string | null;
  logoUrl: string | null;
  admissionNoPrefix: string | null;
  invoiceNoPrefix: string | null;
}

export interface BranchItem {
  id: string;
  name: string;
  code: string;
  address: string | null;
  board: string;
  logoUrl: string | null;
  isActive: boolean;
}

export interface UserItem {
  id: string;
  name: string;
  email: string | null;
  status: string;
  userRoles: Array<{ role: { key: string; name: string } }>;
}

export interface DataDeletionRequestItem {
  id: string;
  requestedById: string;
  reason: string | null;
  status: "PENDING" | "REJECTED" | "EXECUTED";
  reviewNote: string | null;
  createdAt: string;
}

export interface RoleItem {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
  rolePermissions: Array<{ permissionKey: string }>;
}

export interface MyNotificationItem {
  id: string;
  channel: string;
  templateKey: string;
  status: string;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface ReconciliationPayment {
  id: string;
  amount: number;
  mode: string;
  reference: string | null;
  gatewayOrderId: string | null;
  studentId: string;
  needsReview?: boolean;
  receipt: { id: string; number: string; cancelledAt: string | null } | null;
}

export interface ReconciliationResult {
  online: ReconciliationPayment[];
  counter: ReconciliationPayment[];
}

export interface SearchResults {
  students: Array<{ id: string; name: string; admissionNo: string }>;
  staff: Array<{ id: string; name: string }>;
  invoices: Array<{ id: string; number: string; studentId: string }>;
}

export interface RouteItem {
  id: string;
  name: string;
}

export interface RouteStopItem {
  id: string;
  name: string;
  sequence: number;
  latitude: number | null;
  longitude: number | null;
}

export interface VehicleItem {
  id: string;
  regNo: string;
  capacity: number | null;
  routeId: string | null;
  fitnessExpiry: string | null;
  insuranceExpiry: string | null;
  permitExpiry: string | null;
}

export interface DriverItem {
  id: string;
  name: string;
  phone: string;
  licenseNo: string | null;
}

export interface AllocationItem {
  id: string;
  studentId: string;
  routeId: string;
  stopId: string;
  feeAssignmentId: string | null;
}

export interface BookItem {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
}

export interface BookCopyItem {
  id: string;
  bookId: string;
  barcode: string;
  status: "AVAILABLE" | "ISSUED" | "LOST";
}

export interface LibraryMemberItem {
  id: string;
  studentId: string | null;
  staffId: string | null;
}

export interface BookIssueItem {
  id: string;
  copyId: string;
  memberId: string;
  issuedAt: string;
  dueAt: string;
  returnedAt: string | null;
  fineInvoiceId: string | null;
}

export interface HostelBlockItem {
  id: string;
  name: string;
}

export interface RoomItem {
  id: string;
  blockId: string;
  roomNo: string;
  capacity: number;
}

export interface RoomAllocationItem {
  id: string;
  studentId: string;
  roomId: string;
  fromDate: string;
  toDate: string | null;
  feeAssignmentId: string | null;
}

export interface HostelAttendanceRecordItem {
  id: string;
  studentId: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE" | "HALF_DAY" | "HOLIDAY";
}

export interface VisitorItem {
  id: string;
  name: string;
  purpose: string;
  checkInAt: string;
  checkOutAt: string | null;
}

export interface GatePassItem {
  id: string;
  studentId: string;
  reason: string;
  exitAt: string | null;
}

export interface ComplaintDeskEntryItem {
  id: string;
  raisedByName: string;
  category: string;
  body: string;
  status: "OPEN" | "RESOLVED";
  resolution: string | null;
}

export interface CallLogEntryItem {
  id: string;
  direction: "INCOMING" | "OUTGOING";
  callerName: string;
  phone: string | null;
  notes: string | null;
}

export interface PostalLogEntryItem {
  id: string;
  direction: "INWARD" | "OUTWARD";
  refNo: string | null;
  description: string;
}

export interface HealthRecordItem {
  studentId: string;
  condition: string | null;
  notes: string | null;
  emergencyContact: string;
}

export interface DisciplineIncidentItem {
  id: string;
  studentId: string;
  type: "MERIT" | "DEMERIT";
  points: number;
  note: string | null;
}

export interface AwardItem {
  id: string;
  studentId: string;
  title: string;
  awardedAt: string;
}

export interface CanteenTxnItem {
  id: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  reason: string | null;
}

export interface CanteenWalletItem {
  id: string;
  studentId: string;
  balancePaise: number;
  txns: CanteenTxnItem[];
}

export interface LostFoundEntryItem {
  id: string;
  itemDescription: string;
  foundLocation: string | null;
  foundAt: string;
  status: "UNCLAIMED" | "CLAIMED";
}

export interface ExpenseHeadItem {
  id: string;
  name: string;
}

export interface ExpenseItem {
  id: string;
  headId: string;
  amount: number;
  vendorName: string | null;
  date: string;
  note: string | null;
}

export interface SalaryStructureItem {
  id: string;
  staffId: string;
  basic: number;
  hra: number;
  allowances: Record<string, number>;
  deductions: Record<string, number>;
}

export interface InventoryStoreItem {
  id: string;
  name: string;
}

export interface InventoryItemRow {
  id: string;
  storeId: string;
  name: string;
  quantity: number;
  lowStockAt: number | null;
}

export interface PurchaseOrderItem {
  id: string;
  vendorName: string;
  status: "PENDING" | "RECEIVED" | "CANCELLED";
}

export interface AssetItem {
  id: string;
  item: string;
  purchaseDate: string;
  purchasePricePaise: number;
}

export interface StoreCatalogItem {
  id: string;
  itemId: string;
  pricePaise: number;
}

export interface StoreOrderItem {
  id: string;
  storeItemId: string;
  studentId: string;
  quantity: number;
  invoiceId: string | null;
  status: "PENDING" | "PAID" | "CANCELLED";
}

export interface StaffTaskItem {
  id: string;
  assignedToId: string;
  title: string;
  dueDate: string | null;
  status: "OPEN" | "DONE";
}

export interface SyllabusChapterItem {
  id: string;
  subjectId: string;
  classId: string;
  title: string;
  order: number;
  completedAt: string | null;
}

export interface LessonPlanItem {
  id: string;
  staffId: string;
  subjectId: string;
  sectionId: string;
  date: string;
  topic: string;
  notes: string | null;
}

export interface ContentItemRow {
  id: string;
  title: string;
  type: "FILE" | "LINK";
  fileUrl: string | null;
  linkUrl: string | null;
  subjectId: string;
  classId: string;
}

export interface LiveClassLinkItem {
  id: string;
  sectionId: string;
  subjectId: string;
  startTime: string;
  joinUrl: string;
}

export interface NewsletterItem {
  id: string;
  title: string;
  body: string;
  sentAt: string | null;
}

export interface CommunicationPreferenceItem {
  id: string;
  channel: "PUSH" | "SMS" | "WHATSAPP" | "EMAIL" | "IN_APP";
  optedIn: boolean;
}

export type ReportType = "attendance" | "fees" | "exams" | "admissions" | "staff";

export interface KpiSummary {
  period: { from: string; to: string };
  attendance: { studentsTracked: number; averagePercent: number | null };
  fees: { totalInvoiced: number; totalCollected: number; collectionPercent: number };
  exams: { examCount: number };
  admissions: { enquiries: number; applications: number };
  staff: { headcount: number };
}

export interface SupportTicketItem {
  id: string;
  subject: string;
  body: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  response: string | null;
  createdAt: string;
}

export interface DashboardSummary {
  collectionPercent: number;
  totalDues: number;
  attendancePercent: number | null;
  admissionsFunnel: { enquiries: number; applications: number; converted: number };
  enrollmentTrend: { month: string; count: number }[];
  staffMetrics: { headcount: number; onLeaveToday: number };
}

// -- Unit 42: Staff HR Depth ---------------------------------------------------

export interface StaffItem {
  id: string;
  employeeNo: string;
  designation: string;
  type: string;
  docs: Array<{ key: string; label: string }> | null;
}

export interface StaffAttendanceRow {
  id: string;
  staffId: string;
  date: string;
  status: string;
}

// -- Unit 43: Academic Structure Depth -----------------------------------------

export interface ElectiveGroupItem {
  id: string;
  name: string;
  classId: string;
  options: Array<{ id: string; subjectId: string }>;
}

export interface HouseItem {
  id: string;
  name: string;
  color: string | null;
}

export interface HouseRosterRow {
  id: string;
  firstName: string;
  lastName: string;
  admissionNo: string;
}

// -- Unit 44: Attendance Depth --------------------------------------------------

export interface AttendanceAnalytics {
  trend: Array<{ date: string; attendancePercent: number }>;
  chronicAbsentees: Array<{ studentId: string; firstName: string; lastName: string; absences: number }>;
}

// -- Unit 46: Exams & Report Cards Depth -----------------------------------------

export interface ExamItem {
  id: string;
  name: string;
  type: string;
  gradingScheme: string;
  isLocked: boolean;
}

export interface ExamSubjectItem {
  id: string;
  classId: string;
  subjectId: string;
  maxMarks: number;
  passMarks: number;
}

export interface ExamTimetableRow {
  id: string;
  subjectId: string;
  date: string;
  startTime: string;
  room: string | null;
}

export interface CoScholasticGradeRow {
  id: string;
  studentId: string;
  activity: string;
  grade: string;
}

export interface ExamRankRow {
  studentId: string;
  firstName: string;
  lastName: string;
  obtainedMarks: number;
  maxMarks: number;
  percent: number;
  rank: number;
}

// -- Unit 47: Timetable Depth (Substitution) --------------------------------------

export interface TimetablePeriodRow {
  id: string;
  sectionId: string;
  dayOfWeek: number;
  periodNo: number;
  subjectId: string;
  staffId: string;
  room: string | null;
}

export interface SubstitutionRow {
  id: string;
  timetablePeriodId: string;
  date: string;
  substituteStaffId: string;
  room: string | null;
  reason: string | null;
  timetablePeriod: {
    periodNo: number;
    dayOfWeek: number;
    room: string | null;
    section: { name: string };
    subject: { name: string };
    staff: { id: string; user?: { name: string } };
  };
  substituteStaff: { id: string; user?: { name: string } };
}

export interface TranscriptRow {
  id: string;
  examId: string;
  sessionId: string;
  publishedAt: string | null;
}

export interface QuestionBankItemRow {
  id: string;
  classId: string;
  subjectId: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
}

export interface OnlineExamItem {
  id: string;
  title: string;
  durationMinutes: number;
  isPublished: boolean;
}

export interface OnlineExamQuestionRow {
  id: string;
  questionText: string;
  options: string[];
  marks: number;
  order: number;
  correctOptionIndex?: number;
}

export interface OnlineExamSubmissionRow {
  id: string;
  studentId: string;
  score: number;
  maxScore: number;
  submittedAt: string;
}

// -- Unit 49: Messaging & Engagement --------------------------------------------

export interface CircularItem {
  id: string;
  title: string;
  body: string;
  attachmentUrl: string | null;
  publishedAt: string;
}

export interface CircularAckRow {
  id: string;
  userId: string;
  ackedAt: string;
}

export interface PTMSlotItem {
  id: string;
  staffId: string;
  startTime: string;
  endTime: string;
  bookedByGuardianId: string | null;
}

export interface CalendarEventItem {
  id: string;
  title: string;
  date: string;
  type: string;
  description: string | null;
}

export interface ComplaintItem {
  id: string;
  raisedByUserId: string;
  category: string;
  body: string;
  status: string;
  resolution: string | null;
}

export interface SurveyQuestionItem {
  id: string;
  questionText: string;
  type: string;
  options: string[] | null;
  order: number;
}

export interface SurveyItem {
  id: string;
  title: string;
  questions: SurveyQuestionItem[];
}

export interface SurveyResultRow {
  questionId: string;
  questionText: string;
  type: string;
  tally?: Record<string, number>;
  responses?: string[];
}

export interface PublicNoticeItem {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
}

export interface GalleryAlbumItem {
  id: string;
  title: string;
  isPublic: boolean;
  createdAt: string;
}

export interface GalleryPhotoItem {
  id: string;
  key: string;
  caption: string | null;
  url: string;
}

// -- Unit 50: Certificates Depth -----------------------------------------

export interface CertificateTemplateItem {
  id: string;
  branchId: string | null;
  type: string;
  name: string;
  body: string;
}

export interface CertificateItem {
  id: string;
  branchId: string;
  studentId: string | null;
  staffId: string | null;
  templateId: string | null;
  type: string;
  number: string;
  signatureStatus: "NONE" | "REQUESTED" | "SIGNED";
  issuedAt: string;
}

export interface DocumentItem {
  id: string;
  branchId: string;
  ownerType: "STUDENT" | "STAFF";
  ownerId: string;
  key: string;
  label: string;
  tags: string[];
  createdAt: string;
  downloadUrl: string;
}

// -- Unit 51: Web Admin Panel: Remaining Modules -----------------------------------------

export interface GuardianItem {
  id: string;
  name: string;
  relation: string;
  phone: string;
  alternatePhone: string | null;
  whatsappOptIn: boolean;
  email: string | null;
  occupation: string | null;
}

export interface EnquiryItem {
  id: string;
  childName: string;
  guardianName: string;
  phone: string;
  source: string;
  stage: string;
}

export interface ApplicationItem {
  id: string;
  enquiryId: string | null;
  classAppliedId: string;
  formData: { childName: string; dob: string; guardianName: string; guardianPhone: string; priorSchool?: string };
  status: string;
}

export interface MarksEntryRow {
  id: string;
  studentId: string;
  examSubjectId: string;
  marks: number | null;
  isAbsent: boolean;
}

export interface ReportCardTemplateItem {
  id: string;
  branchId: string | null;
  name: string;
  board: string;
}

export interface ReportCardItem {
  id: string;
  examId: string;
  studentId: string;
  templateId: string;
  publishedAt: string | null;
}

export interface AnnouncementItem {
  id: string;
  branchId: string;
  title: string;
  body: string;
  audience: { roles?: string[]; classIds?: string[] } | null;
  createdAt: string;
}

export interface HomeworkItem {
  id: string;
  sectionId: string;
  subjectId: string;
  title: string;
  description: string;
  dueDate: string;
}

export interface LeaveRequestItem {
  id: string;
  staffId: string;
  type: string;
  fromDate: string;
  toDate: string;
  halfDay: boolean;
  status: string;
}

export const adminApi = {
  login: (tenantSlug: string, email: string, password: string) =>
    adminFetch<{
      data: { challenge: string; devCode?: string } | { accessToken: string; refreshToken: string };
    }>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ tenantSlug, email, password }) }),
  verifyTwoFa: (challenge: string, code: string) =>
    adminFetch<{ data: { accessToken: string; refreshToken: string } }>("/api/v1/auth/2fa/verify", {
      method: "POST",
      body: JSON.stringify({ challenge, code }),
    }),

  listClasses: (branchId: string) =>
    adminFetch<{ data: ClassItem[] }>(`/api/v1/academic/classes?branchId=${encodeURIComponent(branchId)}&pageSize=100`),
  listSections: (classId: string) =>
    adminFetch<{ data: SectionItem[] }>(`/api/v1/academic/classes/${encodeURIComponent(classId)}/sections?pageSize=100`),

  listStudents: (branchId: string, search?: string) =>
    adminFetch<{ data: Student[]; meta: { total: number } }>(
      `/api/v1/students?branchId=${encodeURIComponent(branchId)}${search ? `&search=${encodeURIComponent(search)}` : ""}&pageSize=50`
    ),
  createStudent: (input: Record<string, unknown>) =>
    adminFetch<{ data: Student }>("/api/v1/students", { method: "POST", body: JSON.stringify(input) }),
  patchStudent: (id: string, input: Record<string, unknown>) =>
    adminFetch<{ data: Student }>(`/api/v1/students/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  getStudent: (id: string) => adminFetch<{ data: Student }>(`/api/v1/students/${id}`),

  transferStudent: (id: string, input: { targetBranchId: string; targetClassId: string; targetSectionId: string }) =>
    adminFetch<{ data: Student }>(`/api/v1/students/${id}/transfer`, { method: "POST", body: JSON.stringify(input) }),
  markAlumni: (id: string) => adminFetch<{ data: Student }>(`/api/v1/students/${id}/mark-alumni`, { method: "POST" }),
  listAlumni: (branchId: string) =>
    adminFetch<{ data: Student[] }>(`/api/v1/students/alumni?branchId=${encodeURIComponent(branchId)}&pageSize=50`),
  readmitStudent: (id: string, input: { classId: string; sectionId: string }) =>
    adminFetch<{ data: Student }>(`/api/v1/students/${id}/readmit`, { method: "POST", body: JSON.stringify(input) }),
  linkSiblings: (studentIds: string[]) =>
    adminFetch<{ data: Student[] }>("/api/v1/students/link-siblings", { method: "POST", body: JSON.stringify({ studentIds }) }),
  listSiblings: (id: string) => adminFetch<{ data: Student[] }>(`/api/v1/students/${id}/siblings`),
  createTimelineEntry: (id: string, input: { type: "DISCIPLINE" | "ACHIEVEMENT" | "NOTE"; body: string }) =>
    adminFetch<{ data: StudentTimelineEntry }>(`/api/v1/students/${id}/timeline`, { method: "POST", body: JSON.stringify(input) }),
  listTimelineEntries: (id: string) =>
    adminFetch<{ data: StudentTimelineEntry[] }>(`/api/v1/students/${id}/timeline`),

  listInvoices: (branchId: string) =>
    adminFetch<{ data: InvoiceItem[]; meta: { total: number } }>(
      `/api/v1/invoices?branchId=${encodeURIComponent(branchId)}&pageSize=50`
    ),
  collectPayment: (input: {
    branchId: string;
    studentId: string;
    invoiceId: string;
    amount: number;
    mode: string;
    chequeNo?: string;
    bankName?: string;
    chequeDueDate?: string;
  }) =>
    adminFetch<{ data: { id: string } }>("/api/v1/payments", {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(input),
    }),

  listCheques: (branchId: string, status?: string) =>
    adminFetch<{ data: ChequeRow[] }>(
      `/api/v1/fees/reports/cheques?branchId=${encodeURIComponent(branchId)}${status ? `&status=${status}` : ""}`
    ),
  updateChequeStatus: (paymentId: string, status: "CLEARED" | "BOUNCED") =>
    adminFetch<{ data: ChequeRow }>(`/api/v1/payments/${paymentId}/cheque-status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  markAttendance: (input: {
    branchId: string;
    sectionId: string;
    date: string;
    source: string;
    records: Array<{ studentId: string; status: string }>;
  }) => adminFetch("/api/v1/attendance", { method: "POST", body: JSON.stringify(input) }),
  getRegister: (sectionId: string, month: number, year: number) =>
    adminFetch<{ data: AttendanceRegisterRow[] }>(
      `/api/v1/attendance/reports/register?sectionId=${sectionId}&month=${month}&year=${year}`
    ),
  getDefaulters: (branchId: string, thresholdPercent = 75) =>
    adminFetch<{ data: DefaulterRow[] }>(
      `/api/v1/attendance/reports/defaulters?branchId=${encodeURIComponent(branchId)}&thresholdPercent=${thresholdPercent}`
    ),

  getDashboardSummary: (branchId: string) =>
    adminFetch<{ data: DashboardSummary }>(`/api/v1/dashboard/summary?branchId=${encodeURIComponent(branchId)}`),

  getReport: (reportType: ReportType, branchId: string, from: string, to: string) =>
    adminFetch<{ data: Record<string, unknown>[] }>(
      `/api/v1/reports/${reportType}?branchId=${encodeURIComponent(branchId)}&from=${from}&to=${to}`
    ),
  downloadReportCsv: async (reportType: ReportType, branchId: string, from: string, to: string) => {
    const token = getAdminToken();
    const res = await fetch(
      `${API_BASE_URL}/api/v1/reports/${reportType}?branchId=${encodeURIComponent(branchId)}&from=${from}&to=${to}&format=csv`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
  getKpiSummary: (branchId: string) =>
    adminFetch<{ data: KpiSummary }>(`/api/v1/reports/kpi-summary?branchId=${encodeURIComponent(branchId)}`),
  scheduleReport: (input: { branchId: string; reportType: ReportType; cadence: "WEEKLY" | "MONTHLY"; recipientEmail: string }) =>
    adminFetch<{ data: { jobId: string } }>("/api/v1/reports/schedule", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  patchTenantProfile: (input: Record<string, unknown>) =>
    adminFetch<{ data: TenantProfile }>("/api/v1/tenants/me/profile", { method: "PATCH", body: JSON.stringify(input) }),

  createSupportTicket: (input: { subject: string; body: string; priority: "LOW" | "MEDIUM" | "HIGH" }) =>
    adminFetch<{ data: SupportTicketItem }>("/api/v1/support-tickets", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listMySupportTickets: () => adminFetch<{ data: SupportTicketItem[] }>("/api/v1/support-tickets"),

  listBranches: () => adminFetch<{ data: BranchItem[]; meta: { total: number } }>("/api/v1/academic/branches?pageSize=100"),
  createBranch: (input: Record<string, unknown>) =>
    adminFetch<{ data: BranchItem }>("/api/v1/academic/branches", { method: "POST", body: JSON.stringify(input) }),
  patchBranch: (id: string, input: Record<string, unknown>) =>
    adminFetch<{ data: BranchItem }>(`/api/v1/academic/branches/${id}`, { method: "PATCH", body: JSON.stringify(input) }),

  listUsers: (branchId: string) =>
    adminFetch<{ data: UserItem[]; meta: { total: number } }>(
      `/api/v1/users?branchId=${encodeURIComponent(branchId)}&pageSize=100`
    ),
  inviteUser: (input: Record<string, unknown>) =>
    adminFetch<{ data: { userId: string; email: string } }>("/api/v1/users/invite", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  patchUser: (id: string, input: Record<string, unknown>) =>
    adminFetch<{ data: UserItem }>(`/api/v1/users/${id}`, { method: "PATCH", body: JSON.stringify(input) }),

  listRoles: () => adminFetch<{ data: RoleItem[] }>("/api/v1/roles"),
  createRole: (input: Record<string, unknown>) =>
    adminFetch<{ data: RoleItem }>("/api/v1/roles", { method: "POST", body: JSON.stringify(input) }),
  patchRolePermissions: (id: string, permissions: string[]) =>
    adminFetch<{ data: RoleItem }>(`/api/v1/roles/${id}/permissions`, {
      method: "PATCH",
      body: JSON.stringify({ permissions }),
    }),

  search: (branchId: string, q: string) =>
    adminFetch<{ data: SearchResults }>(
      `/api/v1/search?branchId=${encodeURIComponent(branchId)}&q=${encodeURIComponent(q)}`
    ),

  getReconciliation: (branchId: string, date: string) =>
    adminFetch<{ data: ReconciliationResult }>(
      `/api/v1/fees/reconciliation?branchId=${encodeURIComponent(branchId)}&date=${encodeURIComponent(date)}`
    ),
  cancelReceipt: (id: string, reason: string) =>
    adminFetch<{ data: unknown }>(`/api/v1/receipts/${id}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    }),

  listDataDeletionRequests: () =>
    adminFetch<{ data: DataDeletionRequestItem[] }>("/api/v1/data-deletion-requests"),
  rejectDataDeletionRequest: (id: string, reviewNote: string) =>
    adminFetch<{ data: DataDeletionRequestItem }>(`/api/v1/data-deletion-requests/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reviewNote }),
    }),
  executeDataDeletionRequest: (id: string) =>
    adminFetch<{ data: DataDeletionRequestItem }>(`/api/v1/data-deletion-requests/${id}/execute`, {
      method: "POST",
    }),

  getMyNotifications: () =>
    adminFetch<{ data: MyNotificationItem[]; meta: { total: number } }>("/api/v1/me/notifications?pageSize=50"),
  markNotificationRead: (id: string) =>
    adminFetch<{ data: MyNotificationItem }>(`/api/v1/me/notifications/${id}/read`, { method: "PATCH" }),

  // -- Unit 42: Staff HR Depth ---------------------------------------------------
  listStaff: (branchId: string) =>
    adminFetch<{ data: StaffItem[]; meta: { total: number } }>(
      `/api/v1/staff?branchId=${encodeURIComponent(branchId)}&pageSize=100`
    ),
  requestStaffDocumentUpload: (staffId: string, input: { fileName: string; contentType: string; label: string }) =>
    adminFetch<{ data: { key: string; uploadUrl: string } }>(`/api/v1/staff/${staffId}/documents`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  markStaffAttendance: (input: {
    branchId: string;
    date: string;
    source: string;
    records: Array<{ staffId: string; status: string }>;
  }) => adminFetch("/api/v1/staff/attendance", { method: "POST", body: JSON.stringify(input) }),
  listStaffAttendance: (branchId: string, date: string) =>
    adminFetch<{ data: StaffAttendanceRow[] }>(
      `/api/v1/staff/attendance?branchId=${encodeURIComponent(branchId)}&date=${encodeURIComponent(date)}`
    ),
  issueCertificate: (input: {
    staffId?: string;
    studentId?: string;
    type: string;
    customTitle?: string;
    templateId?: string;
  }) =>
    adminFetch<{ data: CertificateItem }>("/api/v1/certificates", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listCertificates: (branchId: string) =>
    adminFetch<{ data: CertificateItem[] }>(`/api/v1/certificates?branchId=${encodeURIComponent(branchId)}`),

  // -- Unit 43: Academic Structure Depth -----------------------------------------
  createElectiveGroup: (input: { branchId: string; classId: string; name: string }) =>
    adminFetch<{ data: ElectiveGroupItem }>("/api/v1/academic/elective-groups", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listElectiveGroups: (classId: string) =>
    adminFetch<{ data: ElectiveGroupItem[] }>(
      `/api/v1/academic/elective-groups?classId=${encodeURIComponent(classId)}`
    ),
  addElectiveOption: (groupId: string, classSubjectId: string) =>
    adminFetch<{ data: unknown }>(`/api/v1/academic/elective-groups/${groupId}/options`, {
      method: "POST",
      body: JSON.stringify({ classSubjectId }),
    }),
  chooseElective: (groupId: string, studentId: string, classSubjectId: string) =>
    adminFetch<{ data: unknown }>(`/api/v1/academic/elective-groups/${groupId}/choice`, {
      method: "POST",
      body: JSON.stringify({ studentId, classSubjectId }),
    }),
  createHouse: (input: { branchId: string; name: string; color?: string }) =>
    adminFetch<{ data: HouseItem }>("/api/v1/academic/houses", { method: "POST", body: JSON.stringify(input) }),
  listHouses: (branchId: string) =>
    adminFetch<{ data: HouseItem[] }>(`/api/v1/academic/houses?branchId=${encodeURIComponent(branchId)}`),
  getHouseRoster: (houseId: string) =>
    adminFetch<{ data: HouseRosterRow[] }>(`/api/v1/academic/houses/${houseId}/roster`),

  // -- Unit 44: Attendance Depth --------------------------------------------------
  getAttendanceAnalytics: (branchId: string, from: string, to: string, minAbsences = 3) =>
    adminFetch<{ data: AttendanceAnalytics }>(
      `/api/v1/attendance/analytics?branchId=${encodeURIComponent(branchId)}&from=${from}&to=${to}&minAbsences=${minAbsences}`
    ),
  rotateAttendanceDeviceToken: (branchId: string) =>
    adminFetch<{ data: { deviceToken: string } }>(`/api/v1/attendance/device-token/${branchId}`, {
      method: "POST",
    }),

  // -- Unit 46: Exams & Report Cards Depth -----------------------------------------
  createExam: (input: Record<string, unknown>) =>
    adminFetch<{ data: ExamItem }>("/api/v1/exams", { method: "POST", body: JSON.stringify(input) }),
  listExams: (branchId: string) =>
    adminFetch<{ data: ExamItem[]; meta: { total: number } }>(
      `/api/v1/exams?branchId=${encodeURIComponent(branchId)}&pageSize=100`
    ),
  createExamSubject: (examId: string, input: Record<string, unknown>) =>
    adminFetch<{ data: ExamSubjectItem }>(`/api/v1/exams/${examId}/subjects`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listExamSubjects: (examId: string) =>
    adminFetch<{ data: ExamSubjectItem[] }>(`/api/v1/exams/${examId}/subjects`),
  createExamTimetable: (examId: string, input: Record<string, unknown>) =>
    adminFetch<{ data: ExamTimetableRow }>(`/api/v1/exams/${examId}/timetable`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listExamTimetable: (examId: string) =>
    adminFetch<{ data: ExamTimetableRow[] }>(`/api/v1/exams/${examId}/timetable`),
  bulkEnterCoScholasticGrades: (examId: string, entries: Array<Record<string, unknown>>) =>
    adminFetch<{ data: CoScholasticGradeRow[] }>(`/api/v1/exams/${examId}/co-scholastic`, {
      method: "POST",
      body: JSON.stringify({ entries }),
    }),
  listCoScholasticGrades: (examId: string) =>
    adminFetch<{ data: CoScholasticGradeRow[] }>(`/api/v1/exams/${examId}/co-scholastic`),
  getExamRank: (examId: string) => adminFetch<{ data: ExamRankRow[] }>(`/api/v1/exams/${examId}/results/rank`),
  getStudentTranscript: (studentId: string) =>
    adminFetch<{ data: TranscriptRow[] }>(`/api/v1/students/${studentId}/transcript`),

  createQuestionBankItem: (input: Record<string, unknown>) =>
    adminFetch<{ data: QuestionBankItemRow }>("/api/v1/question-bank", { method: "POST", body: JSON.stringify(input) }),
  listQuestionBankItems: (branchId: string, classId?: string) =>
    adminFetch<{ data: QuestionBankItemRow[]; meta: { total: number } }>(
      `/api/v1/question-bank?branchId=${encodeURIComponent(branchId)}${classId ? `&classId=${encodeURIComponent(classId)}` : ""}&pageSize=100`
    ),

  createOnlineExam: (input: Record<string, unknown>) =>
    adminFetch<{ data: OnlineExamItem }>("/api/v1/online-exams", { method: "POST", body: JSON.stringify(input) }),
  listOnlineExams: (branchId: string) =>
    adminFetch<{ data: OnlineExamItem[]; meta: { total: number } }>(
      `/api/v1/online-exams?branchId=${encodeURIComponent(branchId)}&pageSize=100`
    ),
  publishOnlineExam: (id: string) =>
    adminFetch<{ data: OnlineExamItem }>(`/api/v1/online-exams/${id}/publish`, { method: "PATCH" }),
  addOnlineExamQuestion: (examId: string, input: Record<string, unknown>) =>
    adminFetch<{ data: OnlineExamQuestionRow }>(`/api/v1/online-exams/${examId}/questions`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  addOnlineExamQuestionFromBank: (examId: string, questionBankItemId: string, marks: number) =>
    adminFetch<{ data: OnlineExamQuestionRow }>(`/api/v1/online-exams/${examId}/questions/from-bank`, {
      method: "POST",
      body: JSON.stringify({ questionBankItemId, marks }),
    }),
  listOnlineExamQuestions: (examId: string) =>
    adminFetch<{ data: OnlineExamQuestionRow[] }>(`/api/v1/online-exams/${examId}/questions`),
  listOnlineExamSubmissions: (examId: string) =>
    adminFetch<{ data: OnlineExamSubmissionRow[] }>(`/api/v1/online-exams/${examId}/submissions`),

  listTimetable: (sectionId: string) =>
    adminFetch<{ data: TimetablePeriodRow[] }>(`/api/v1/timetable?sectionId=${encodeURIComponent(sectionId)}`),
  createSubstitution: (input: Record<string, unknown>) =>
    adminFetch<{ data: SubstitutionRow }>("/api/v1/timetable/substitutions", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listSubstitutionsToday: (branchId: string) =>
    adminFetch<{ data: SubstitutionRow[] }>(
      `/api/v1/timetable/substitutions/today?branchId=${encodeURIComponent(branchId)}`
    ),

  createCircular: (input: Record<string, unknown>) =>
    adminFetch<{ data: CircularItem }>("/api/v1/circulars", { method: "POST", body: JSON.stringify(input) }),
  listCirculars: (branchId: string) =>
    adminFetch<{ data: CircularItem[] }>(`/api/v1/circulars?branchId=${encodeURIComponent(branchId)}`),
  listCircularAcks: (id: string) =>
    adminFetch<{ data: CircularAckRow[] }>(`/api/v1/circulars/${id}/acks`),

  createPTMSlot: (input: { startTime: string; endTime: string }) =>
    adminFetch<{ data: PTMSlotItem }>("/api/v1/ptm-slots", { method: "POST", body: JSON.stringify(input) }),
  listPTMSlots: (staffId: string) =>
    adminFetch<{ data: PTMSlotItem[] }>(`/api/v1/ptm-slots?staffId=${encodeURIComponent(staffId)}`),

  createCalendarEvent: (input: Record<string, unknown>) =>
    adminFetch<{ data: CalendarEventItem }>("/api/v1/calendar-events", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listCalendarEvents: (branchId: string) =>
    adminFetch<{ data: CalendarEventItem[] }>(`/api/v1/calendar-events?branchId=${encodeURIComponent(branchId)}`),

  listComplaints: (branchId: string, status?: string) =>
    adminFetch<{ data: ComplaintItem[] }>(
      `/api/v1/complaints?branchId=${encodeURIComponent(branchId)}${status ? `&status=${status}` : ""}`
    ),
  resolveComplaint: (id: string, resolution: string) =>
    adminFetch<{ data: ComplaintItem }>(`/api/v1/complaints/${id}/resolve`, {
      method: "PATCH",
      body: JSON.stringify({ resolution }),
    }),

  createSurvey: (input: Record<string, unknown>) =>
    adminFetch<{ data: SurveyItem }>("/api/v1/surveys", { method: "POST", body: JSON.stringify(input) }),
  listSurveys: (branchId: string) =>
    adminFetch<{ data: SurveyItem[] }>(`/api/v1/surveys?branchId=${encodeURIComponent(branchId)}`),
  getSurveyResults: (id: string) =>
    adminFetch<{ data: SurveyResultRow[] }>(`/api/v1/surveys/${id}/results`),

  createGalleryAlbum: (input: { branchId: string; title: string; isPublic?: boolean }) =>
    adminFetch<{ data: GalleryAlbumItem }>("/api/v1/gallery/albums", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listGalleryAlbums: (branchId: string) =>
    adminFetch<{ data: GalleryAlbumItem[] }>(`/api/v1/gallery/albums?branchId=${encodeURIComponent(branchId)}`),
  createPublicNotice: (input: { branchId: string; title: string; body: string }) =>
    adminFetch<{ data: PublicNoticeItem }>("/api/v1/public-notices", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listPublicNotices: (branchId: string) =>
    adminFetch<{ data: PublicNoticeItem[] }>(`/api/v1/public-notices?branchId=${encodeURIComponent(branchId)}`),

  requestGalleryPhotoUpload: (albumId: string, input: { fileName: string; contentType: string }) =>
    adminFetch<{ data: { photo: GalleryPhotoItem; uploadUrl: string } }>(
      `/api/v1/gallery/albums/${albumId}/photos`,
      { method: "POST", body: JSON.stringify(input) }
    ),
  listGalleryPhotos: (albumId: string) =>
    adminFetch<{ data: GalleryPhotoItem[] }>(`/api/v1/gallery/albums/${albumId}/photos`),

  // -- Unit 50: Certificates Depth -----------------------------------------
  createCertificateTemplate: (input: { branchId?: string; type: string; name: string; body: string }) =>
    adminFetch<{ data: CertificateTemplateItem }>("/api/v1/certificates/templates", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listCertificateTemplates: (branchId?: string) =>
    adminFetch<{ data: CertificateTemplateItem[] }>(
      `/api/v1/certificates/templates${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ""}`
    ),
  generateBulkIds: (sectionId: string, templateId?: string) =>
    adminFetch<{ data: CertificateItem[] }>(
      `/api/v1/certificates/bulk-ids?sectionId=${encodeURIComponent(sectionId)}${templateId ? `&templateId=${encodeURIComponent(templateId)}` : ""}`,
      { method: "POST" }
    ),
  requestCertificateSignature: (id: string) =>
    adminFetch<{ data: CertificateItem }>(`/api/v1/certificates/${id}/request-signature`, { method: "POST" }),
  requestDocumentUpload: (input: {
    branchId: string;
    ownerType: "STUDENT" | "STAFF";
    ownerId: string;
    label: string;
    fileName: string;
    contentType?: string;
    tags?: string[];
  }) =>
    adminFetch<{ data: { document: DocumentItem; uploadUrl: string } }>("/api/v1/documents", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listDocuments: (branchId: string, params?: { ownerType?: string; ownerId?: string; tag?: string }) => {
    const entries = Object.entries({ branchId, ...params }).filter(([, v]) => v !== undefined) as [string, string][];
    return adminFetch<{ data: DocumentItem[] }>(`/api/v1/documents?${new URLSearchParams(entries).toString()}`);
  },

  // -- Unit 51: Web Admin Panel: Remaining Modules -----------------------------------------
  listStudentsByClass: (branchId: string, classId: string) =>
    adminFetch<{ data: Student[]; meta: { total: number } }>(
      `/api/v1/students?branchId=${encodeURIComponent(branchId)}&classId=${encodeURIComponent(classId)}&pageSize=100`
    ),

  createGuardian: (input: { name: string; relation: string; phone: string; alternatePhone?: string; whatsappOptIn?: boolean; email?: string; occupation?: string }) =>
    adminFetch<{ data: GuardianItem }>("/api/v1/guardians", { method: "POST", body: JSON.stringify(input) }),
  listGuardians: (search?: string) =>
    adminFetch<{ data: GuardianItem[] }>(`/api/v1/guardians${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  linkGuardianToStudent: (studentId: string, guardianId: string, isPrimary?: boolean, canPay?: boolean) =>
    adminFetch(`/api/v1/students/${studentId}/guardians`, {
      method: "POST",
      body: JSON.stringify({ guardianId, isPrimary: !!isPrimary, canPay: !!canPay }),
    }),

  createEnquiry: (input: {
    branchId: string;
    childName: string;
    guardianName: string;
    phone: string;
    source: string;
  }) => adminFetch<{ data: EnquiryItem }>("/api/v1/enquiries", { method: "POST", body: JSON.stringify(input) }),
  listEnquiries: (branchId: string, stage?: string) =>
    adminFetch<{ data: EnquiryItem[] }>(
      `/api/v1/enquiries?branchId=${encodeURIComponent(branchId)}${stage ? `&stage=${encodeURIComponent(stage)}` : ""}`
    ),
  patchEnquiryStage: (id: string, stage: string) =>
    adminFetch<{ data: EnquiryItem }>(`/api/v1/enquiries/${id}`, { method: "PATCH", body: JSON.stringify({ stage }) }),
  createApplication: (input: {
    branchId: string;
    enquiryId?: string;
    classAppliedId: string;
    formData: { childName: string; dob: string; guardianName: string; guardianPhone: string; priorSchool?: string };
  }) => adminFetch<{ data: ApplicationItem }>("/api/v1/applications", { method: "POST", body: JSON.stringify(input) }),
  listApplications: (branchId: string, status?: string) =>
    adminFetch<{ data: ApplicationItem[] }>(
      `/api/v1/applications?branchId=${encodeURIComponent(branchId)}${status ? `&status=${encodeURIComponent(status)}` : ""}`
    ),
  convertApplication: (id: string, sectionId: string) =>
    adminFetch<{ data: { studentId: string } }>(`/api/v1/applications/${id}/convert`, {
      method: "POST",
      body: JSON.stringify({ sectionId }),
    }),

  createStaff: (input: Record<string, unknown>) =>
    adminFetch<{ data: { id: string } }>("/api/v1/staff", { method: "POST", body: JSON.stringify(input) }),
  createLeaveRequest: (input: { staffId: string; type: string; fromDate: string; toDate: string; halfDay?: boolean }) =>
    adminFetch<{ data: LeaveRequestItem }>("/api/v1/leave-requests", { method: "POST", body: JSON.stringify(input) }),
  listLeaveRequests: (branchId: string, status?: string) =>
    adminFetch<{ data: LeaveRequestItem[] }>(
      `/api/v1/leave-requests?branchId=${encodeURIComponent(branchId)}${status ? `&status=${encodeURIComponent(status)}` : ""}`
    ),
  decideLeaveRequest: (id: string, status: "APPROVED" | "REJECTED") =>
    adminFetch<{ data: LeaveRequestItem }>(`/api/v1/leave-requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  bulkEnterMarks: (examSubjectId: string, entries: Array<{ studentId: string; marks?: number; isAbsent?: boolean }>) =>
    adminFetch<{ data: MarksEntryRow[] }>("/api/v1/marks", {
      method: "POST",
      body: JSON.stringify({ examSubjectId, entries }),
    }),
  listMarks: (examSubjectId: string) =>
    adminFetch<{ data: MarksEntryRow[] }>(`/api/v1/marks?examSubjectId=${encodeURIComponent(examSubjectId)}`),

  createReportCardTemplate: (input: { branchId?: string; name: string; board: string; layout?: Record<string, unknown> }) =>
    adminFetch<{ data: ReportCardTemplateItem }>("/api/v1/report-card-templates", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listReportCardTemplates: (branchId?: string) =>
    adminFetch<{ data: ReportCardTemplateItem[] }>(
      `/api/v1/report-card-templates${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ""}`
    ),
  generateReportCards: (examId: string, templateId: string) =>
    adminFetch<{ data: ReportCardItem[] }>("/api/v1/report-cards/generate", {
      method: "POST",
      body: JSON.stringify({ examId, templateId }),
    }),
  listReportCards: (examId: string) =>
    adminFetch<{ data: ReportCardItem[] }>(`/api/v1/report-cards?examId=${encodeURIComponent(examId)}`),
  publishReportCard: (id: string) =>
    adminFetch<{ data: ReportCardItem }>(`/api/v1/report-cards/${id}/publish`, { method: "PATCH" }),

  createAnnouncement: (input: {
    branchId: string;
    title: string;
    body: string;
    audience?: { roles?: string[]; classIds?: string[] };
  }) => adminFetch<{ data: AnnouncementItem }>("/api/v1/announcements", { method: "POST", body: JSON.stringify(input) }),
  listAnnouncements: (branchId: string) =>
    adminFetch<{ data: AnnouncementItem[] }>(`/api/v1/announcements?branchId=${encodeURIComponent(branchId)}`),

  createHomework: (input: {
    branchId: string;
    sectionId: string;
    subjectId: string;
    title: string;
    description: string;
    dueDate: string;
  }) => adminFetch<{ data: HomeworkItem }>("/api/v1/homework", { method: "POST", body: JSON.stringify(input) }),
  listHomework: (sectionId: string) =>
    adminFetch<{ data: HomeworkItem[] }>(`/api/v1/homework?sectionId=${encodeURIComponent(sectionId)}`),

  bulkUpsertTimetable: (input: {
    branchId: string;
    sessionId: string;
    sectionId: string;
    periods: Array<{ dayOfWeek: number; periodNo: number; subjectId: string; staffId: string; room?: string }>;
  }) => adminFetch<{ data: TimetablePeriodRow[] }>("/api/v1/timetable", { method: "POST", body: JSON.stringify(input) }),

  createRoute: (input: { branchId: string; name: string }) =>
    adminFetch<{ data: RouteItem }>("/api/v1/transport/routes", { method: "POST", body: JSON.stringify(input) }),
  listRoutes: (branchId: string) =>
    adminFetch<{ data: RouteItem[] }>(`/api/v1/transport/routes?branchId=${encodeURIComponent(branchId)}`),
  createRouteStop: (routeId: string, input: { name: string; sequence: number; latitude?: number; longitude?: number }) =>
    adminFetch<{ data: RouteStopItem }>(`/api/v1/transport/routes/${routeId}/stops`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listRouteStops: (routeId: string) =>
    adminFetch<{ data: RouteStopItem[] }>(`/api/v1/transport/routes/${routeId}/stops`),
  createVehicle: (input: {
    branchId: string;
    regNo: string;
    capacity?: number;
    routeId?: string;
    fitnessExpiry?: string;
    insuranceExpiry?: string;
    permitExpiry?: string;
  }) => adminFetch<{ data: VehicleItem }>("/api/v1/transport/vehicles", { method: "POST", body: JSON.stringify(input) }),
  listVehicles: (branchId: string) =>
    adminFetch<{ data: VehicleItem[] }>(`/api/v1/transport/vehicles?branchId=${encodeURIComponent(branchId)}`),
  createDriver: (input: { branchId: string; name: string; phone: string; licenseNo?: string; vehicleId?: string }) =>
    adminFetch<{ data: DriverItem }>("/api/v1/transport/drivers", { method: "POST", body: JSON.stringify(input) }),
  listDrivers: (branchId: string) =>
    adminFetch<{ data: DriverItem[] }>(`/api/v1/transport/drivers?branchId=${encodeURIComponent(branchId)}`),
  createAllocation: (input: { studentId: string; routeId: string; stopId: string; fareAmountPaise: number }) =>
    adminFetch<{ data: AllocationItem }>("/api/v1/transport/allocations", { method: "POST", body: JSON.stringify(input) }),
  listAllocations: (routeId: string) =>
    adminFetch<{ data: AllocationItem[] }>(`/api/v1/transport/allocations?routeId=${encodeURIComponent(routeId)}`),

  createBook: (input: { branchId: string; title: string; author: string; isbn?: string }) =>
    adminFetch<{ data: BookItem }>("/api/v1/library/books", { method: "POST", body: JSON.stringify(input) }),
  listBooks: (branchId: string) =>
    adminFetch<{ data: BookItem[] }>(`/api/v1/library/books?branchId=${encodeURIComponent(branchId)}`),
  createBookCopy: (bookId: string, input: { barcode: string }) =>
    adminFetch<{ data: BookCopyItem }>(`/api/v1/library/books/${bookId}/copies`, { method: "POST", body: JSON.stringify(input) }),
  listBookCopies: (bookId: string) =>
    adminFetch<{ data: BookCopyItem[] }>(`/api/v1/library/books/${bookId}/copies`),
  createLibraryMember: (input: { branchId: string; studentId?: string; staffId?: string }) =>
    adminFetch<{ data: LibraryMemberItem }>("/api/v1/library/members", { method: "POST", body: JSON.stringify(input) }),
  listLibraryMembers: (branchId: string) =>
    adminFetch<{ data: LibraryMemberItem[] }>(`/api/v1/library/members?branchId=${encodeURIComponent(branchId)}`),
  createBookIssue: (input: { copyId: string; memberId: string }) =>
    adminFetch<{ data: BookIssueItem }>("/api/v1/library/issues", { method: "POST", body: JSON.stringify(input) }),
  listBookIssues: (memberId?: string, activeOnly?: boolean) => {
    const params = new URLSearchParams();
    if (memberId) params.set("memberId", memberId);
    if (activeOnly) params.set("activeOnly", "true");
    return adminFetch<{ data: BookIssueItem[] }>(`/api/v1/library/issues?${params.toString()}`);
  },
  renewBookIssue: (issueId: string) =>
    adminFetch<{ data: BookIssueItem }>(`/api/v1/library/issues/${issueId}/renew`, { method: "POST" }),
  returnBookIssue: (issueId: string) =>
    adminFetch<{ data: BookIssueItem }>(`/api/v1/library/issues/${issueId}/return`, { method: "POST" }),

  createHostelBlock: (input: { branchId: string; name: string }) =>
    adminFetch<{ data: HostelBlockItem }>("/api/v1/hostel/blocks", { method: "POST", body: JSON.stringify(input) }),
  listHostelBlocks: (branchId: string) =>
    adminFetch<{ data: HostelBlockItem[] }>(`/api/v1/hostel/blocks?branchId=${encodeURIComponent(branchId)}`),
  createRoom: (blockId: string, input: { roomNo: string; capacity: number }) =>
    adminFetch<{ data: RoomItem }>(`/api/v1/hostel/blocks/${blockId}/rooms`, { method: "POST", body: JSON.stringify(input) }),
  listRooms: (blockId: string) =>
    adminFetch<{ data: RoomItem[] }>(`/api/v1/hostel/blocks/${blockId}/rooms?blockId=${encodeURIComponent(blockId)}`),
  createRoomAllocation: (input: { studentId: string; roomId: string; fromDate: string; feeAmountPaise: number }) =>
    adminFetch<{ data: RoomAllocationItem }>("/api/v1/hostel/allocations", { method: "POST", body: JSON.stringify(input) }),
  listRoomAllocations: (roomId: string) =>
    adminFetch<{ data: RoomAllocationItem[] }>(`/api/v1/hostel/allocations?roomId=${encodeURIComponent(roomId)}`),
  markHostelAttendance: (input: { branchId: string; date: string; records: Array<{ studentId: string; status: string }> }) =>
    adminFetch<{ data: HostelAttendanceRecordItem[] }>("/api/v1/hostel/attendance", { method: "POST", body: JSON.stringify(input) }),
  listHostelAttendance: (branchId: string, date: string) =>
    adminFetch<{ data: HostelAttendanceRecordItem[] }>(
      `/api/v1/hostel/attendance?branchId=${encodeURIComponent(branchId)}&date=${encodeURIComponent(date)}`
    ),

  checkInVisitor: (input: { branchId: string; name: string; purpose: string; hostStaffId?: string }) =>
    adminFetch<{ data: VisitorItem }>("/api/v1/front-office/visitors", { method: "POST", body: JSON.stringify(input) }),
  checkOutVisitor: (visitorId: string) =>
    adminFetch<{ data: VisitorItem }>(`/api/v1/front-office/visitors/${visitorId}/check-out`, { method: "POST" }),
  listVisitors: (branchId: string) =>
    adminFetch<{ data: VisitorItem[] }>(`/api/v1/front-office/visitors?branchId=${encodeURIComponent(branchId)}`),
  createGatePass: (input: { branchId: string; studentId: string; reason: string }) =>
    adminFetch<{ data: GatePassItem }>("/api/v1/front-office/gate-passes", { method: "POST", body: JSON.stringify(input) }),
  exitGatePass: (gatePassId: string) =>
    adminFetch<{ data: GatePassItem }>(`/api/v1/front-office/gate-passes/${gatePassId}/exit`, { method: "POST" }),
  listGatePasses: (branchId: string) =>
    adminFetch<{ data: GatePassItem[] }>(`/api/v1/front-office/gate-passes?branchId=${encodeURIComponent(branchId)}`),
  createComplaintDeskEntry: (input: { branchId: string; raisedByName: string; category: string; body: string }) =>
    adminFetch<{ data: ComplaintDeskEntryItem }>("/api/v1/front-office/complaints", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  resolveComplaintDeskEntry: (id: string, resolution: string) =>
    adminFetch<{ data: ComplaintDeskEntryItem }>(`/api/v1/front-office/complaints/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolution }),
    }),
  listComplaintDeskEntries: (branchId: string) =>
    adminFetch<{ data: ComplaintDeskEntryItem[] }>(`/api/v1/front-office/complaints?branchId=${encodeURIComponent(branchId)}`),
  createCallLogEntry: (input: { branchId: string; direction: string; callerName: string; phone?: string; notes?: string }) =>
    adminFetch<{ data: CallLogEntryItem }>("/api/v1/front-office/call-log", { method: "POST", body: JSON.stringify(input) }),
  listCallLogEntries: (branchId: string) =>
    adminFetch<{ data: CallLogEntryItem[] }>(`/api/v1/front-office/call-log?branchId=${encodeURIComponent(branchId)}`),
  createPostalLogEntry: (input: { branchId: string; direction: string; refNo?: string; description: string }) =>
    adminFetch<{ data: PostalLogEntryItem }>("/api/v1/front-office/postal-log", { method: "POST", body: JSON.stringify(input) }),
  listPostalLogEntries: (branchId: string) =>
    adminFetch<{ data: PostalLogEntryItem[] }>(`/api/v1/front-office/postal-log?branchId=${encodeURIComponent(branchId)}`),

  upsertHealthRecord: (input: { branchId: string; studentId: string; condition?: string; notes?: string; emergencyContact: string }) =>
    adminFetch<{ data: HealthRecordItem }>("/api/v1/wellbeing/health-records", { method: "POST", body: JSON.stringify(input) }),
  getHealthRecord: (studentId: string) =>
    adminFetch<{ data: HealthRecordItem | null }>(`/api/v1/wellbeing/health-records?studentId=${encodeURIComponent(studentId)}`),
  createDisciplineIncident: (input: { branchId: string; studentId: string; type: string; points: number; note?: string }) =>
    adminFetch<{ data: DisciplineIncidentItem }>("/api/v1/wellbeing/discipline-incidents", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listDisciplineIncidents: (studentId: string) =>
    adminFetch<{ data: DisciplineIncidentItem[] }>(`/api/v1/wellbeing/discipline-incidents?studentId=${encodeURIComponent(studentId)}`),
  createAward: (input: { branchId: string; studentId: string; title: string; awardedAt: string }) =>
    adminFetch<{ data: AwardItem }>("/api/v1/wellbeing/awards", { method: "POST", body: JSON.stringify(input) }),
  listAwards: (studentId: string) =>
    adminFetch<{ data: AwardItem[] }>(`/api/v1/wellbeing/awards?studentId=${encodeURIComponent(studentId)}`),
  creditCanteenWallet: (input: { branchId: string; studentId: string; amountPaise: number; reason?: string }) =>
    adminFetch<{ data: CanteenWalletItem }>("/api/v1/wellbeing/canteen-wallet/credit", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  debitCanteenWallet: (input: { branchId: string; studentId: string; amountPaise: number; reason?: string }) =>
    adminFetch<{ data: CanteenWalletItem }>("/api/v1/wellbeing/canteen-wallet/debit", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  getCanteenWallet: (studentId: string) =>
    adminFetch<{ data: CanteenWalletItem }>(`/api/v1/wellbeing/canteen-wallet?studentId=${encodeURIComponent(studentId)}`),
  createLostFoundEntry: (input: { branchId: string; itemDescription: string; foundLocation?: string; foundAt: string }) =>
    adminFetch<{ data: LostFoundEntryItem }>("/api/v1/wellbeing/lost-found", { method: "POST", body: JSON.stringify(input) }),
  claimLostFoundEntry: (id: string) =>
    adminFetch<{ data: LostFoundEntryItem }>(`/api/v1/wellbeing/lost-found/${id}/claim`, { method: "POST" }),
  listLostFoundEntries: (branchId: string) =>
    adminFetch<{ data: LostFoundEntryItem[] }>(`/api/v1/wellbeing/lost-found?branchId=${encodeURIComponent(branchId)}`),

  createExpenseHead: (input: { branchId: string; name: string }) =>
    adminFetch<{ data: ExpenseHeadItem }>("/api/v1/accounting/expense-heads", { method: "POST", body: JSON.stringify(input) }),
  listExpenseHeads: (branchId: string) =>
    adminFetch<{ data: ExpenseHeadItem[] }>(`/api/v1/accounting/expense-heads?branchId=${encodeURIComponent(branchId)}`),
  createExpense: (input: { branchId: string; headId: string; amountPaise: number; vendorName?: string; date: string; note?: string }) =>
    adminFetch<{ data: ExpenseItem }>("/api/v1/accounting/expenses", { method: "POST", body: JSON.stringify(input) }),
  listExpenses: (branchId: string) =>
    adminFetch<{ data: ExpenseItem[] }>(`/api/v1/accounting/expenses?branchId=${encodeURIComponent(branchId)}`),
  downloadAccountingExport: async (branchId: string, from: string, to: string) => {
    const token = getAdminToken();
    const res = await fetch(
      `${API_BASE_URL}/api/v1/accounting/export/tally?branchId=${encodeURIComponent(branchId)}&from=${from}&to=${to}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "accounting-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  },

  upsertSalaryStructure: (input: {
    branchId: string;
    staffId: string;
    basicPaise: number;
    hraPaise: number;
    allowances?: Record<string, number>;
    deductions?: Record<string, number>;
  }) =>
    adminFetch<{ data: SalaryStructureItem }>("/api/v1/payroll/salary-structures", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listSalaryStructures: (branchId: string) =>
    adminFetch<{ data: SalaryStructureItem[] }>(`/api/v1/payroll/salary-structures?branchId=${encodeURIComponent(branchId)}`),
  downloadPayrollExport: async (branchId: string, month: string, year: string) => {
    const token = getAdminToken();
    const res = await fetch(
      `${API_BASE_URL}/api/v1/payroll/export?branchId=${encodeURIComponent(branchId)}&month=${month}&year=${year}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payroll-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  },

  createStore: (input: { branchId: string; name: string }) =>
    adminFetch<{ data: InventoryStoreItem }>("/api/v1/inventory/stores", { method: "POST", body: JSON.stringify(input) }),
  listStores: (branchId: string) =>
    adminFetch<{ data: InventoryStoreItem[] }>(`/api/v1/inventory/stores?branchId=${encodeURIComponent(branchId)}`),
  createInventoryItem: (storeId: string, input: { name: string; lowStockAt?: number }) =>
    adminFetch<{ data: InventoryItemRow }>(`/api/v1/inventory/stores/${storeId}/items`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listInventoryItems: (storeId: string) =>
    adminFetch<{ data: InventoryItemRow[] }>(`/api/v1/inventory/items?storeId=${encodeURIComponent(storeId)}`),
  createStockMovement: (itemId: string, input: { direction: "IN" | "OUT"; quantity: number; reason: string }) =>
    adminFetch<{ data: InventoryItemRow }>(`/api/v1/inventory/items/${itemId}/movements`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  createPurchaseOrder: (input: { branchId: string; vendorName: string }) =>
    adminFetch<{ data: PurchaseOrderItem }>("/api/v1/inventory/purchase-orders", { method: "POST", body: JSON.stringify(input) }),
  listPurchaseOrders: (branchId: string) =>
    adminFetch<{ data: PurchaseOrderItem[] }>(`/api/v1/inventory/purchase-orders?branchId=${encodeURIComponent(branchId)}`),
  receiveGrn: (purchaseOrderId: string, lines: Array<{ itemId: string; quantity: number }>) =>
    adminFetch<{ data: unknown }>(`/api/v1/inventory/purchase-orders/${purchaseOrderId}/grn`, {
      method: "POST",
      body: JSON.stringify({ lines }),
    }),
  createAsset: (input: { branchId: string; item: string; purchaseDate: string; purchasePricePaise: number; depreciationMethod?: string }) =>
    adminFetch<{ data: AssetItem }>("/api/v1/inventory/assets", { method: "POST", body: JSON.stringify(input) }),
  listAssets: (branchId: string) =>
    adminFetch<{ data: AssetItem[] }>(`/api/v1/inventory/assets?branchId=${encodeURIComponent(branchId)}`),
  createStoreItem: (input: { itemId: string; pricePaise: number }) =>
    adminFetch<{ data: StoreCatalogItem }>("/api/v1/inventory/store-items", { method: "POST", body: JSON.stringify(input) }),
  listStoreItems: (branchId: string) =>
    adminFetch<{ data: StoreCatalogItem[] }>(`/api/v1/inventory/store-items?branchId=${encodeURIComponent(branchId)}`),
  createStoreOrder: (input: { storeItemId: string; studentId: string; quantity: number }) =>
    adminFetch<{ data: StoreOrderItem }>("/api/v1/inventory/store-orders", { method: "POST", body: JSON.stringify(input) }),
  listStoreOrders: (studentId?: string) =>
    adminFetch<{ data: StoreOrderItem[] }>(`/api/v1/inventory/store-orders${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ""}`),

  createStaffTask: (input: { branchId: string; assignedToId: string; title: string; dueDate?: string }) =>
    adminFetch<{ data: StaffTaskItem }>("/api/v1/productivity/staff-tasks", { method: "POST", body: JSON.stringify(input) }),
  listStaffTasks: (branchId: string) =>
    adminFetch<{ data: StaffTaskItem[] }>(`/api/v1/productivity/staff-tasks?branchId=${encodeURIComponent(branchId)}`),
  completeStaffTask: (id: string) =>
    adminFetch<{ data: StaffTaskItem }>(`/api/v1/productivity/staff-tasks/${id}/complete`, { method: "POST" }),

  createSyllabusChapter: (input: { branchId: string; subjectId: string; classId: string; title: string; order: number }) =>
    adminFetch<{ data: SyllabusChapterItem }>("/api/v1/lms/syllabus-chapters", { method: "POST", body: JSON.stringify(input) }),
  listSyllabusChapters: (subjectId: string, classId: string) =>
    adminFetch<{ data: SyllabusChapterItem[] }>(
      `/api/v1/lms/syllabus-chapters?subjectId=${encodeURIComponent(subjectId)}&classId=${encodeURIComponent(classId)}`
    ),
  completeSyllabusChapter: (id: string) =>
    adminFetch<{ data: SyllabusChapterItem }>(`/api/v1/lms/syllabus-chapters/${id}/complete`, { method: "POST" }),

  createLessonPlan: (input: { branchId: string; subjectId: string; sectionId: string; date: string; topic: string; notes?: string }) =>
    adminFetch<{ data: LessonPlanItem }>("/api/v1/lms/lesson-plans", { method: "POST", body: JSON.stringify(input) }),
  listLessonPlans: (sectionId: string, subjectId?: string) =>
    adminFetch<{ data: LessonPlanItem[] }>(
      `/api/v1/lms/lesson-plans?sectionId=${encodeURIComponent(sectionId)}${subjectId ? `&subjectId=${encodeURIComponent(subjectId)}` : ""}`
    ),

  createContentItem: (input: { branchId: string; subjectId: string; classId: string; title: string; type: "FILE" | "LINK"; fileUrl?: string; linkUrl?: string }) =>
    adminFetch<{ data: ContentItemRow }>("/api/v1/lms/content-items", { method: "POST", body: JSON.stringify(input) }),
  listContentItems: (subjectId: string, classId: string) =>
    adminFetch<{ data: ContentItemRow[] }>(
      `/api/v1/lms/content-items?subjectId=${encodeURIComponent(subjectId)}&classId=${encodeURIComponent(classId)}`
    ),

  createLiveClassLink: (input: { branchId: string; sectionId: string; subjectId: string; startTime: string; joinUrl: string }) =>
    adminFetch<{ data: LiveClassLinkItem }>("/api/v1/lms/live-classes", { method: "POST", body: JSON.stringify(input) }),
  listLiveClassLinks: (sectionId: string) =>
    adminFetch<{ data: LiveClassLinkItem[] }>(`/api/v1/lms/live-classes?sectionId=${encodeURIComponent(sectionId)}`),

  createNewsletter: (input: { branchId: string; title: string; body: string }) =>
    adminFetch<{ data: NewsletterItem }>("/api/v1/newsletters", { method: "POST", body: JSON.stringify(input) }),
  listNewsletters: (branchId: string) =>
    adminFetch<{ data: NewsletterItem[] }>(`/api/v1/newsletters?branchId=${encodeURIComponent(branchId)}`),

  getMyCommunicationPreferences: () =>
    adminFetch<{ data: CommunicationPreferenceItem[] }>("/api/v1/me/communication-preferences"),
  setMyCommunicationPreference: (input: { channel: string; optedIn: boolean }) =>
    adminFetch<{ data: CommunicationPreferenceItem }>("/api/v1/me/communication-preferences", {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  getTourSeen: () => adminFetch<{ data: { hasSeenTour: boolean } }>("/api/v1/me/tour-seen"),
  markTourSeen: () => adminFetch<{ data: { id: string; hasSeenTour: boolean } }>("/api/v1/me/tour-seen", { method: "PATCH" }),

  createFeedback: (input: { category: string; body: string }) =>
    adminFetch<{ data: { id: string } }>("/api/v1/feedback", { method: "POST", body: JSON.stringify(input) }),

  getTeacherDashboardSummary: () =>
    adminFetch<{ data: { assignedSectionCount: number; attendanceMarkedPercent: number; homeworkPostedThisMonth: number } }>(
      "/api/v1/dashboard/teacher-summary"
    ),
  getAccountantDashboardSummary: () =>
    adminFetch<{ data: { collectedTodayPaise: number; paymentsCollectedToday: number } }>(
      "/api/v1/dashboard/accountant-summary"
    ),
};

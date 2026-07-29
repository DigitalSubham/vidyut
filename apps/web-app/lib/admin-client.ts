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

export interface DashboardSummary {
  collectionPercent: number;
  totalDues: number;
  attendancePercent: number | null;
  admissionsFunnel: { enquiries: number; applications: number; converted: number };
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

  listInvoices: (branchId: string) =>
    adminFetch<{ data: InvoiceItem[]; meta: { total: number } }>(
      `/api/v1/invoices?branchId=${encodeURIComponent(branchId)}&pageSize=50`
    ),
  collectPayment: (input: { branchId: string; studentId: string; invoiceId: string; amount: number; mode: string }) =>
    adminFetch<{ data: { id: string } }>("/api/v1/payments", {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(input),
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

  patchTenantProfile: (input: Record<string, unknown>) =>
    adminFetch<{ data: TenantProfile }>("/api/v1/tenants/me/profile", { method: "PATCH", body: JSON.stringify(input) }),

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
  issueCertificate: (input: { staffId?: string; studentId?: string; type: string }) =>
    adminFetch<{ data: { id: string; number: string } }>("/api/v1/certificates", {
      method: "POST",
      body: JSON.stringify(input),
    }),

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
};

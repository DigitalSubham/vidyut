import Constants from "expo-constants";

const API_BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? "http://localhost:4000/api/v1";

export interface ApiEnvelope<T> {
  data?: T;
  error?: { code: string; message: string; fields?: Record<string, string> };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || body.error) {
    throw new Error(body.error?.message ?? `Request failed: ${res.status}`);
  }
  return body.data as T;
}

function authedRequest<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, { ...init, headers: { Authorization: `Bearer ${accessToken}`, ...init?.headers } });
}

export interface StudentListItem {
  id: string;
  firstName: string;
  lastName: string;
  admissionNo: string;
}

export interface MyTeacherAssignment {
  id: string;
  staffId: string;
  sectionId: string;
  subjectId: string;
  section: { id: string; name: string; branchId: string; classId: string; class: { name: string } };
  subject: { id: string; name: string };
}

/** Unit 26 — closes Unit 16's flagged gap: the teacher's own sections, self-derived (no staffId param needed). */
export function listMyTeacherAssignments(accessToken: string) {
  return authedRequest<MyTeacherAssignment[]>(accessToken, "/academic/teacher-assignments/me");
}

export function listSectionStudents(accessToken: string, branchId: string, sectionId: string) {
  return authedRequest<StudentListItem[]>(
    accessToken,
    `/students?branchId=${encodeURIComponent(branchId)}&sectionId=${encodeURIComponent(sectionId)}&page=1&pageSize=200`
  );
}

export interface AttendanceRecordPush {
  id: string;
  studentId: string;
  status: string;
}

export function pushAttendance(
  accessToken: string,
  input: { branchId: string; sectionId: string; date: string; records: AttendanceRecordPush[] }
) {
  return authedRequest(accessToken, "/attendance", {
    method: "POST",
    body: JSON.stringify({ ...input, source: "APP" }),
  });
}

export interface ExamListItem {
  id: string;
  name: string;
}

export function listExams(accessToken: string, branchId: string) {
  return authedRequest<ExamListItem[]>(accessToken, `/exams?branchId=${encodeURIComponent(branchId)}`);
}

export interface ExamSubjectListItem {
  id: string;
  classId: string;
  subjectId: string;
  maxMarks: number;
}

export function listExamSubjects(accessToken: string, examId: string) {
  return authedRequest<ExamSubjectListItem[]>(accessToken, `/exams/${encodeURIComponent(examId)}/subjects`);
}

export function submitMarks(
  accessToken: string,
  input: { examSubjectId: string; entries: Array<{ studentId: string; marks?: number; isAbsent: boolean }> }
) {
  return authedRequest(accessToken, "/marks", { method: "POST", body: JSON.stringify(input) });
}

export function postHomework(
  accessToken: string,
  input: {
    branchId: string;
    sectionId: string;
    subjectId: string;
    title: string;
    description: string;
    dueDate: string;
  }
) {
  return authedRequest(accessToken, "/homework", { method: "POST", body: JSON.stringify(input) });
}

export function resolveSchoolCode(schoolCode: string) {
  return request<{ tenantSlug: string }>(`/tenants/resolve/${encodeURIComponent(schoolCode)}`);
}

export function requestOtp(tenantSlug: string, phone: string) {
  return request<{ phone: string; devCode?: string }>("/auth/otp/request", {
    method: "POST",
    body: JSON.stringify({ tenantSlug, phone }),
  });
}

export function verifyOtp(tenantSlug: string, phone: string, code: string) {
  return request<{ accessToken: string; refreshToken: string }>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ tenantSlug, phone, code }),
  });
}

export interface MyStudent {
  id: string;
  branchId: string;
  firstName: string;
  lastName: string;
  admissionNo: string;
}

/** Unit 24 — the caller's own resolved student(s): themselves (STUDENT) or linked children (PARENT). */
export function listMyStudents(accessToken: string) {
  return authedRequest<MyStudent[]>(accessToken, "/me/students");
}

export interface MyAttendanceRecord {
  id: string;
  date: string;
  status: string;
}

export function getMyAttendance(accessToken: string, studentId: string, month: number, year: number) {
  return authedRequest<MyAttendanceRecord[]>(
    accessToken,
    `/me/attendance?studentId=${encodeURIComponent(studentId)}&month=${month}&year=${year}`
  );
}

export interface MyReportCard {
  id: string;
  examId: string;
  pdfUrl: string | null;
  publishedAt: string;
}

export function getMyReportCards(accessToken: string, studentId: string) {
  return authedRequest<MyReportCard[]>(accessToken, `/me/report-cards?studentId=${encodeURIComponent(studentId)}`);
}

export interface MyHomeworkItem {
  id: string;
  title: string;
  description: string;
  dueDate: string;
}

export function getMyHomework(accessToken: string, studentId: string) {
  return authedRequest<MyHomeworkItem[]>(accessToken, `/me/homework?studentId=${encodeURIComponent(studentId)}`);
}

export interface MyTimetablePeriod {
  id: string;
  dayOfWeek: number;
  periodNo: number;
  subjectId: string;
  room: string | null;
}

export function getMyTimetable(accessToken: string, studentId: string) {
  return authedRequest<MyTimetablePeriod[]>(accessToken, `/me/timetable?studentId=${encodeURIComponent(studentId)}`);
}

export interface MyFeeLedgerEntry {
  type: "invoice" | "payment";
  date: string;
  amount: number;
  invoiceId?: string;
  periodLabel?: string;
  status?: string;
  mode?: string;
}

export function getMyFeeLedger(accessToken: string, studentId: string) {
  return authedRequest<MyFeeLedgerEntry[]>(accessToken, `/me/fees/ledger?studentId=${encodeURIComponent(studentId)}`);
}

export interface MyAnnouncement {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
}

export function getMyAnnouncements(accessToken: string, studentId: string) {
  return authedRequest<MyAnnouncement[]>(accessToken, `/me/announcements?studentId=${encodeURIComponent(studentId)}`);
}

export interface OnlinePaymentOrder {
  paymentId: string;
  gatewayOrderId: string;
  amount: number;
}

/**
 * Unit 25 — the backend's own Razorpay order creation is still a stub
 * (`createStubOrder`, Unit 13), so this only proves the initiate round trip;
 * wiring a real Razorpay Checkout SDK/WebView is deferred until that stub is
 * replaced with a real gateway call (context/feature-specs/25's Open
 * Question 2) — building a real checkout screen against a stub order would
 * be verification theatre, not a working payment flow.
 */
export function initiateOnlinePayment(
  accessToken: string,
  input: { branchId: string; studentId: string; invoiceId?: string; amount: number; mode: "UPI" | "CARD" | "NETBANKING" | "WALLET" }
) {
  return authedRequest<OnlinePaymentOrder>(accessToken, "/payments/online/initiate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

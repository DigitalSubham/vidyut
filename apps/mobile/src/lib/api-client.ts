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

/** `periodId` omitted/undefined marks daily attendance (Unit 44 — period-wise
 * is an addition alongside daily, not a replacement for it). */
export function pushAttendance(
  accessToken: string,
  input: { branchId: string; sectionId: string; date: string; periodId?: string; records: AttendanceRecordPush[] }
) {
  return authedRequest(accessToken, "/attendance", {
    method: "POST",
    body: JSON.stringify({ ...input, source: "APP" }),
  });
}

export interface TimetablePeriodItem {
  id: string;
  dayOfWeek: number;
  periodNo: number;
  subjectId: string;
  room: string | null;
}

/** Unit 44 — feeds the period picker on the teacher's attendance screen. */
export function listTimetablePeriods(accessToken: string, sectionId: string) {
  return authedRequest<TimetablePeriodItem[]>(accessToken, `/timetable?sectionId=${encodeURIComponent(sectionId)}`);
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

/** Unit 45 — teacher-facing homework list for a section, feeding the grading screen. */
export interface SectionHomeworkItem {
  id: string;
  title: string;
  dueDate: string;
}

export function listSectionHomework(accessToken: string, sectionId: string) {
  return authedRequest<SectionHomeworkItem[]>(accessToken, `/homework?sectionId=${encodeURIComponent(sectionId)}`);
}

export interface HomeworkSubmissionItem {
  id: string;
  studentId: string;
  fileUrl: string;
  submittedAt: string;
  grade: string | null;
  feedback: string | null;
}

export function listHomeworkSubmissions(accessToken: string, homeworkId: string) {
  return authedRequest<HomeworkSubmissionItem[]>(accessToken, `/homework/${encodeURIComponent(homeworkId)}/submissions`);
}

export function gradeHomeworkSubmission(accessToken: string, submissionId: string, input: { grade: string; feedback?: string }) {
  return authedRequest<HomeworkSubmissionItem>(accessToken, `/homework/submissions/${encodeURIComponent(submissionId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** Unit 45 — same two-step presigned-upload pattern as staff documents: get a
 * signed URL, PUT the file straight to the bucket, done. */
export function requestHomeworkSubmissionUpload(
  accessToken: string,
  homeworkId: string,
  input: { studentId: string; fileName: string; contentType: string }
) {
  return authedRequest<HomeworkSubmissionItem & { uploadUrl: string }>(
    accessToken,
    `/homework/${encodeURIComponent(homeworkId)}/submissions`,
    { method: "POST", body: JSON.stringify(input) }
  );
}

export type MyHomeworkCalendar = Record<string, MyHomeworkItem[]>;

export function getMyHomeworkCalendar(accessToken: string, studentId: string, month: number, year: number) {
  return authedRequest<MyHomeworkCalendar>(
    accessToken,
    `/me/homework/calendar?studentId=${encodeURIComponent(studentId)}&month=${month}&year=${year}`
  );
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
  downloadUrl: string | null;
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
  receiptId?: string | null;
  receiptDownloadUrl?: string | null;
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

// -- Unit 46: MCQ online exams (student-facing) --------------------------------

export interface MyOnlineExamListItem {
  id: string;
  title: string;
  durationMinutes: number;
  submitted: boolean;
  score?: number;
  maxScore?: number;
}

/** `GET /online-exams?branchId=` needs branch access a PARENT/STUDENT token
 * doesn't carry, so the backend grew this self-scoped `/mine` variant
 * alongside it purely to make this screen possible. */
export function listMyOnlineExams(accessToken: string, studentId: string) {
  return authedRequest<MyOnlineExamListItem[]>(accessToken, `/online-exams/mine?studentId=${encodeURIComponent(studentId)}`);
}

export interface OnlineExamQuestionForStudent {
  id: string;
  questionText: string;
  options: string[];
  marks: number;
  order: number;
}

export function getOnlineExamToTake(accessToken: string, examId: string, studentId: string) {
  return authedRequest<{
    exam: { id: string; title: string; durationMinutes: number };
    questions: OnlineExamQuestionForStudent[];
  }>(accessToken, `/online-exams/${encodeURIComponent(examId)}/take?studentId=${encodeURIComponent(studentId)}`);
}

export interface OnlineExamSubmissionResult {
  id: string;
  score: number;
  maxScore: number;
}

export function submitOnlineExam(
  accessToken: string,
  examId: string,
  input: { studentId: string; answers: number[] }
) {
  return authedRequest<OnlineExamSubmissionResult>(accessToken, `/online-exams/${encodeURIComponent(examId)}/submit`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// -- Unit 49: Messaging & Engagement --------------------------------------------

export interface MyCircular {
  id: string;
  title: string;
  body: string;
  attachmentUrl: string | null;
  publishedAt: string;
  acked: boolean;
}

/** A PARENT token carries no guardianId claim of its own — this resolves it server-side from the linked User, needed to identify the caller as a Message conversation participant. */
export function getMyGuardian(accessToken: string) {
  return authedRequest<{ id: string }>(accessToken, "/me/guardian");
}

export function getMyCirculars(accessToken: string, studentId: string) {
  return authedRequest<MyCircular[]>(accessToken, `/me/circulars?studentId=${encodeURIComponent(studentId)}`);
}

export function ackCircular(accessToken: string, circularId: string) {
  return authedRequest(accessToken, `/circulars/${encodeURIComponent(circularId)}/ack`, { method: "POST" });
}

export interface MyCalendarItem {
  id: string;
  date: string;
  type: "event" | "exam" | "homework";
  title: string;
}

/** Unified calendar (Unit 49) — merges CalendarEvent + exam dates + homework due-dates server-side, replacing the homework-only calendar this screen used before. */
export function getMyCalendar(accessToken: string, studentId: string, month: number, year: number) {
  return authedRequest<MyCalendarItem[]>(
    accessToken,
    `/me/calendar?studentId=${encodeURIComponent(studentId)}&month=${month}&year=${year}`
  );
}

export interface MyComplaint {
  id: string;
  category: string;
  body: string;
  status: "OPEN" | "RESOLVED";
  resolution: string | null;
}

export function createComplaint(accessToken: string, input: { branchId: string; category: string; body: string }) {
  return authedRequest<MyComplaint>(accessToken, "/complaints", { method: "POST", body: JSON.stringify(input) });
}

export function listMyComplaints(accessToken: string) {
  return authedRequest<MyComplaint[]>(accessToken, "/complaints/mine");
}

export interface MessageItem {
  id: string;
  staffId: string;
  guardianId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

/** Async, REST-polled chat (Unit 49, Open Question 1 — no websocket infra). */
export function listMyThreads(accessToken: string) {
  return authedRequest<MessageItem[]>(accessToken, "/messages/threads/mine");
}

export function listThread(accessToken: string, staffId: string, guardianId: string) {
  return authedRequest<MessageItem[]>(
    accessToken,
    `/messages?staffId=${encodeURIComponent(staffId)}&guardianId=${encodeURIComponent(guardianId)}`
  );
}

export function sendMessage(
  accessToken: string,
  input: { branchId: string; staffId: string; guardianId: string; body: string }
) {
  return authedRequest<MessageItem>(accessToken, "/messages", { method: "POST", body: JSON.stringify(input) });
}

// -- Unit 52: Mobile App Depth --------------------------------------------------

export interface LeaveRequestItem {
  id: string;
  staffId: string;
  type: "CASUAL" | "SICK" | "EARNED" | "OTHER";
  fromDate: string;
  toDate: string;
  halfDay: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

/** Unit 09's `POST /leave-requests` was backend-only until now — self-scoped server-side to the caller's own Staff record, so no staffId is sent here. */
export function applyLeave(
  accessToken: string,
  staffId: string,
  input: { type: LeaveRequestItem["type"]; fromDate: string; toDate: string; halfDay?: boolean }
) {
  return authedRequest<LeaveRequestItem>(accessToken, "/leave-requests", {
    method: "POST",
    body: JSON.stringify({ staffId, ...input }),
  });
}

export function listMyLeaveRequests(accessToken: string, staffId: string) {
  return authedRequest<LeaveRequestItem[]>(accessToken, `/leave-requests?staffId=${encodeURIComponent(staffId)}`);
}

export interface MyTeacherItem {
  staffId: string;
  staffName: string;
  subjectName: string;
}

/** Feeds the parent's PTM-booking teacher picker (needs a staffId to browse slots for). */
export function getMyTeachers(accessToken: string, studentId: string) {
  return authedRequest<MyTeacherItem[]>(accessToken, `/me/teachers?studentId=${encodeURIComponent(studentId)}`);
}

export interface PTMSlotItem {
  id: string;
  staffId: string;
  startTime: string;
  endTime: string;
  bookedByGuardianId: string | null;
}

export function listPTMSlots(accessToken: string, staffId: string) {
  return authedRequest<PTMSlotItem[]>(accessToken, `/ptm-slots?staffId=${encodeURIComponent(staffId)}`);
}

export function bookPTMSlot(accessToken: string, slotId: string) {
  return authedRequest<PTMSlotItem>(accessToken, `/ptm-slots/${encodeURIComponent(slotId)}/book`, { method: "PATCH" });
}

export interface MyTransportInfo {
  routeName: string;
  stopName: string;
  vehicleRegNo: string | null;
  lastLocation: { latitude: number; longitude: number; recordedAt: string } | null;
}

/** Gap-remediation pass — Unit 57's transport module had zero parent-facing view despite the geofence-alert backend already existing. */
export function getMyTransport(accessToken: string, studentId: string) {
  return authedRequest<MyTransportInfo | null>(accessToken, `/me/transport?studentId=${encodeURIComponent(studentId)}`);
}

export interface TeacherSummary {
  assignedSectionCount: number;
  attendanceMarkedPercent: number;
  homeworkPostedThisMonth: number;
}

/** Gap-remediation pass — Unit 69's teacher-summary endpoint had no UI anywhere. */
export function getTeacherSummary(accessToken: string) {
  return authedRequest<TeacherSummary>(accessToken, "/dashboard/teacher-summary");
}

export interface MyCommunicationPreference {
  id: string;
  channel: "PUSH" | "SMS" | "WHATSAPP" | "EMAIL" | "IN_APP";
  optedIn: boolean;
}

const ALL_CHANNELS = ["PUSH", "SMS", "WHATSAPP", "EMAIL"] as const;

/** Gap-remediation pass — Unit 68's per-channel opt-out toggle had an API but no UI anywhere; this is primarily a parent concern, so it belongs here. */
export function getMyCommunicationPreferences(accessToken: string) {
  return authedRequest<MyCommunicationPreference[]>(accessToken, "/me/communication-preferences");
}

export function setMyCommunicationPreference(accessToken: string, channel: string, optedIn: boolean) {
  return authedRequest<MyCommunicationPreference>(accessToken, "/me/communication-preferences", {
    method: "PUT",
    body: JSON.stringify({ channel, optedIn }),
  });
}

export { ALL_CHANNELS };

export interface MyLiveClassLink {
  id: string;
  subjectId: string;
  startTime: string;
  joinUrl: string;
}

export interface MyContentItem {
  id: string;
  title: string;
  type: "FILE" | "LINK";
  fileUrl: string | null;
  linkUrl: string | null;
}

/** Gap-remediation pass — Unit 67's LMS module was gated behind `lms.manage` (staff-only), so a student had zero access despite content library/live classes being explicitly student-facing. */
export function getMyLiveClasses(accessToken: string, studentId: string) {
  return authedRequest<MyLiveClassLink[]>(accessToken, `/me/live-classes?studentId=${encodeURIComponent(studentId)}`);
}

export function getMyContentItems(accessToken: string, studentId: string) {
  return authedRequest<MyContentItem[]>(accessToken, `/me/content-items?studentId=${encodeURIComponent(studentId)}`);
}

export interface MyTimelineEntry {
  id: string;
  type: "DISCIPLINE" | "ACHIEVEMENT" | "NOTE";
  body: string;
  occurredAt: string;
}

/** Gap-remediation pass — Unit 66's timeline/siblings endpoints were gated behind `student.view` (staff-only), so a parent had no way to see either despite both being built. */
export function getMyStudentTimeline(accessToken: string, studentId: string) {
  return authedRequest<MyTimelineEntry[]>(accessToken, `/me/student-timeline?studentId=${encodeURIComponent(studentId)}`);
}

export interface MyStoreItem {
  id: string;
  itemName: string;
  pricePaise: number;
}

export interface MyStoreOrder {
  id: string;
  storeItemId: string;
  studentId: string;
  quantity: number;
  createdAt: string;
}

/** Gap-remediation pass — Unit 64's parent store had zero parent-facing endpoint at all (the whole /inventory router was gated behind inventory.manage). */
export function getMyStoreItems(accessToken: string, branchId: string) {
  return authedRequest<MyStoreItem[]>(accessToken, `/me/store-items?branchId=${encodeURIComponent(branchId)}`);
}

export function createMyStoreOrder(accessToken: string, input: { storeItemId: string; studentId: string; quantity: number }) {
  return authedRequest<MyStoreOrder>(accessToken, "/me/store-orders", { method: "POST", body: JSON.stringify(input) });
}

export function getMyStoreOrders(accessToken: string, studentId: string) {
  return authedRequest<MyStoreOrder[]>(accessToken, `/me/store-orders?studentId=${encodeURIComponent(studentId)}`);
}

export interface MyLibraryBook {
  id: string;
  bookTitle: string;
  author: string;
  dueAt: string;
  overdue: boolean;
}

/** Gap-remediation pass — Unit 58's library module had no "my books" mobile view. */
export function getMyLibrary(accessToken: string, studentId: string) {
  return authedRequest<MyLibraryBook[]>(accessToken, `/me/library?studentId=${encodeURIComponent(studentId)}`);
}

export interface GalleryAlbumItem {
  id: string;
  title: string;
  isPublic: boolean;
}

export interface GalleryPhotoItem {
  id: string;
  albumId: string;
  caption: string | null;
  url: string;
}

/** Gap-remediation pass — the web album/photo upload had no mobile viewer for parents/students until now. */
export function listGalleryAlbums(accessToken: string, branchId: string) {
  return authedRequest<GalleryAlbumItem[]>(accessToken, `/gallery/albums?branchId=${encodeURIComponent(branchId)}`);
}

export function listGalleryPhotos(accessToken: string, albumId: string) {
  return authedRequest<GalleryPhotoItem[]>(accessToken, `/gallery/albums/${encodeURIComponent(albumId)}/photos`);
}

export interface SurveyQuestionItem {
  id: string;
  questionText: string;
  type: "SINGLE_CHOICE" | "TEXT";
  options: string[] | null;
  order: number;
}

export interface SurveyItem {
  id: string;
  title: string;
  isPoll: boolean;
  questions: SurveyQuestionItem[];
}

/** Gap-remediation pass — Unit 49's survey/poll list had no mobile response UI, web-only until now. */
export function listSurveys(accessToken: string, branchId: string) {
  return authedRequest<SurveyItem[]>(accessToken, `/surveys?branchId=${encodeURIComponent(branchId)}`);
}

export function respondSurvey(accessToken: string, surveyId: string, answers: { questionId: string; answer: string }[]) {
  return authedRequest<unknown>(accessToken, `/surveys/${encodeURIComponent(surveyId)}/respond`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}

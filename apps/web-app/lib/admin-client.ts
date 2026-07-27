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

export interface DashboardSummary {
  collectionPercent: number;
  totalDues: number;
  attendancePercent: number | null;
  admissionsFunnel: { enquiries: number; applications: number; converted: number };
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
};

const TOKEN_KEY = "vidyut_platform_token";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function getPlatformToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setPlatformToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearPlatformToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}

export class PlatformApiError extends Error {
  code: string;
  fields?: Record<string, string>;

  constructor(body: ApiErrorBody) {
    super(body.error?.message ?? "Unknown error");
    this.code = body.error?.code ?? "INTERNAL";
    this.fields = body.error?.fields;
  }
}

async function platformFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getPlatformToken();
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
    throw new PlatformApiError(body as ApiErrorBody);
  }
  return body as T;
}

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  appType: string;
  planId: string | null;
}

export interface TenantDetail extends TenantSummary {
  plan: { key: string; name: string; priceYear: number } | null;
}

export interface UsageMetric {
  used: number;
  limit: number | null;
}

export interface UsageResponse {
  students: UsageMetric;
  users: UsageMetric;
  branches: UsageMetric;
  storageGb: UsageMetric;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  planKey: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
}

export const platformApi = {
  login: (email: string, password: string) =>
    platformFetch<{ data: { accessToken: string } }>("/api/v1/platform/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  listTenants: () =>
    platformFetch<{
      data: TenantSummary[];
      meta: { page: number; pageSize: number; total: number; totalPages: number };
    }>("/api/v1/platform/tenants"),
  getTenant: (id: string) => platformFetch<{ data: TenantDetail }>(`/api/v1/platform/tenants/${id}`),
  createTenant: (input: CreateTenantInput) =>
    platformFetch<{ data: { tenant: TenantDetail; owner: { id: string; email: string } } }>(
      "/api/v1/platform/tenants",
      { method: "POST", body: JSON.stringify(input) }
    ),
  patchTenant: (id: string, input: Record<string, unknown>) =>
    platformFetch<{ data: TenantDetail }>(`/api/v1/platform/tenants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  getUsage: (id: string) => platformFetch<{ data: UsageResponse }>(`/api/v1/platform/tenants/${id}/usage`),
};

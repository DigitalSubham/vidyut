import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  createTenantSchema,
  impersonateSchema,
  logoutSchema,
  otpRequestSchema,
  otpVerifySchema,
  patchTenantSchema,
  platformLoginSchema,
  refreshSchema,
  staffLoginSchema,
  twoFaVerifySchema,
} from "@vidyut/validation";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.record(z.string()).optional(),
  }),
});

const tokenPairSchema = z.object({
  data: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
});

function registerAuthEndpoint(
  path: string,
  bodySchema: z.ZodTypeAny,
  responseSchema: z.ZodTypeAny,
  summary: string
) {
  registry.registerPath({
    method: "post",
    path,
    tags: ["Auth"],
    summary,
    request: {
      body: { content: { "application/json": { schema: bodySchema } } },
    },
    responses: {
      200: { description: "Success", content: { "application/json": { schema: responseSchema } } },
      400: { description: "Validation error", content: { "application/json": { schema: errorSchema } } },
      401: { description: "Unauthenticated", content: { "application/json": { schema: errorSchema } } },
      429: { description: "Rate limited", content: { "application/json": { schema: errorSchema } } },
    },
  });
}

registerAuthEndpoint(
  "/api/v1/auth/otp/request",
  otpRequestSchema,
  z.object({ data: z.object({ phone: z.string(), devCode: z.string().optional() }) }),
  "Request a parent login OTP"
);
registerAuthEndpoint(
  "/api/v1/auth/otp/verify",
  otpVerifySchema,
  tokenPairSchema,
  "Verify a parent login OTP"
);
registerAuthEndpoint(
  "/api/v1/auth/login",
  staffLoginSchema,
  z.union([
    tokenPairSchema,
    z.object({ data: z.object({ challenge: z.string(), devCode: z.string().optional() }) }),
  ]),
  "Staff email+password login (may return a 2FA challenge)"
);
registerAuthEndpoint(
  "/api/v1/auth/2fa/verify",
  twoFaVerifySchema,
  tokenPairSchema,
  "Verify a staff 2FA challenge"
);
registerAuthEndpoint("/api/v1/auth/refresh", refreshSchema, tokenPairSchema, "Rotate a refresh token");

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/logout",
  tags: ["Auth"],
  summary: "Revoke a refresh token",
  request: {
    body: { content: { "application/json": { schema: logoutSchema } } },
  },
  responses: {
    204: { description: "Logged out" },
  },
});

registry.registerPath({
  method: "get",
  path: "/health",
  tags: ["System"],
  summary: "Liveness probe",
  responses: {
    200: { description: "OK" },
  },
});

registry.registerPath({
  method: "get",
  path: "/ready",
  tags: ["System"],
  summary: "Readiness probe (DB + Redis)",
  responses: {
    200: { description: "Ready" },
    503: { description: "Not ready" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/jobs/demo",
  tags: ["Jobs"],
  summary: "Enqueue the demo.ping job (proves enqueue -> process -> status)",
  request: {
    body: { content: { "application/json": { schema: z.object({ message: z.string() }) } } },
  },
  responses: {
    202: { description: "Accepted", content: { "application/json": { schema: z.object({ data: z.object({ jobId: z.string() }) }) } } },
    400: { description: "Validation error", content: { "application/json": { schema: errorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/jobs/{id}",
  tags: ["Jobs"],
  summary: "Get a background job's status",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: { description: "Job status" },
    404: { description: "Job not found", content: { "application/json": { schema: errorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/platform/auth/login",
  tags: ["Platform"],
  summary: "Super-admin login (separate auth context from tenant users)",
  request: {
    body: { content: { "application/json": { schema: platformLoginSchema } } },
  },
  responses: {
    200: {
      description: "Success",
      content: { "application/json": { schema: z.object({ data: z.object({ accessToken: z.string() }) }) } },
    },
    401: { description: "Unauthenticated", content: { "application/json": { schema: errorSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/platform/tenants",
  tags: ["Platform"],
  summary: "Provision a tenant (school): branch, session, roles, owner, module toggles",
  request: {
    body: { content: { "application/json": { schema: createTenantSchema } } },
  },
  responses: {
    201: { description: "Created" },
    409: { description: "Slug already taken", content: { "application/json": { schema: errorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/platform/tenants",
  tags: ["Platform"],
  summary: "List tenants",
  responses: {
    200: { description: "Success" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/platform/tenants/{id}",
  tags: ["Platform"],
  summary: "Get a tenant",
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Success" },
    404: { description: "Not found", content: { "application/json": { schema: errorSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/platform/tenants/{id}",
  tags: ["Platform"],
  summary: "Suspend/activate/cancel a tenant, change its plan, or override a module toggle",
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: patchTenantSchema } } },
  },
  responses: {
    200: { description: "Success" },
    404: { description: "Not found", content: { "application/json": { schema: errorSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/platform/tenants/{id}/usage",
  tags: ["Platform"],
  summary: "Student/user/branch/storage usage vs plan limits",
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Success" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/platform/tenants/{id}/impersonate",
  tags: ["Platform"],
  summary: "Issue a short-lived access token for a tenant user (audited)",
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: impersonateSchema } } },
  },
  responses: {
    200: { description: "Success" },
    404: { description: "Not found", content: { "application/json": { schema: errorSchema } } },
  },
});

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Vidyut API",
      version: "v1",
      description: "School ERP API — auth, jobs, and health for now (Unit 04). Domain modules land from Unit 06 onward.",
    },
    servers: [{ url: "/" }],
  });
}

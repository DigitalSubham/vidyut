import express from "express";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@vidyut/db";
import { createApp } from "../src/app";
import { createRateLimiter } from "../src/core/rate-limit";
import { asyncHandler, ok } from "../src/core/envelope";
import { errorHandler } from "../src/core/envelope";
import { signAccessToken } from "../src/core/auth/jwt";
import { cleanupTenant, createRoleWithPermissions, createTenant } from "./helpers";

const app = createApp();
const tenantIds: string[] = [];

afterAll(async () => {
  for (const id of tenantIds) {
    await cleanupTenant(id);
  }
  await prisma.$disconnect();
});

describe("full pipeline (auth -> tenant-context -> branch-scope -> RBAC -> Zod)", () => {
  it("200s a valid, permitted, well-formed request", async () => {
    const tenant = await createTenant("pipeline-ok-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "ADMIN", ["student.view"]);

    const token = await signAccessToken({
      sub: "user-1",
      tenantId: tenant.id,
      roles: ["ADMIN"],
      branchIds: [],
    });

    const res = await request(app)
      .get("/api/v1/sample/protected?echo=hi")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.echo).toBe("hi");
    expect(res.headers["x-request-id"]).toBeTypeOf("string");
  });

  it("400s a request that fails Zod validation", async () => {
    const tenant = await createTenant("pipeline-400-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "ADMIN", ["student.view"]);

    const token = await signAccessToken({
      sub: "user-2",
      tenantId: tenant.id,
      roles: ["ADMIN"],
      branchIds: [],
    });

    const res = await request(app)
      .get("/api/v1/sample/protected?echo=way-too-long-a-value")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("401s a request with no token", async () => {
    const res = await request(app).get("/api/v1/sample/protected");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("403s a role that lacks the required permission", async () => {
    const tenant = await createTenant("pipeline-403-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "TEACHER", ["attendance.mark"]);

    const token = await signAccessToken({
      sub: "user-3",
      tenantId: tenant.id,
      roles: ["TEACHER"],
      branchIds: [],
    });

    const res = await request(app)
      .get("/api/v1/sample/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

describe("rate limiting", () => {
  it("returns 429 with Retry-After once the limit is exceeded", async () => {
    // A dedicated tiny limiter so this test doesn't need 300 requests against
    // the real pipeline-wide default (context/api-conventions.md 429 + Retry-After).
    const testApp = express();
    testApp.use(
      createRateLimiter({ windowMs: 60_000, max: 2, keyPrefix: `pipeline-test-${Date.now()}` })
    );
    testApp.get(
      "/limited",
      asyncHandler(async (_req, res) => {
        ok(res, { ok: true });
      })
    );
    testApp.use(errorHandler);

    await request(testApp).get("/limited").expect(200);
    await request(testApp).get("/limited").expect(200);
    const res = await request(testApp).get("/limited");

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("RATE_LIMITED");
    expect(res.headers["retry-after"]).toBeDefined();
  });
});

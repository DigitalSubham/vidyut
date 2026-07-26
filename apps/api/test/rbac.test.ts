import express from "express";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@vidyut/db";
import { authGuard } from "../src/core/guards/auth-guard";
import { tenantContext } from "../src/core/guards/tenant-context";
import { requirePermission } from "../src/core/guards/require-permission";
import { errorHandler, asyncHandler, ok } from "../src/core/envelope";
import { signAccessToken } from "../src/core/auth/jwt";
import { cleanupTenant, createRoleWithPermissions, createTenant } from "./helpers";

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.get(
    "/fees",
    authGuard,
    tenantContext,
    requirePermission("fees.collect"),
    asyncHandler(async (_req, res) => {
      ok(res, { ok: true });
    })
  );
  app.use(errorHandler);
  return app;
}

const app = buildTestApp();
const tenantIds: string[] = [];

afterAll(async () => {
  for (const id of tenantIds) {
    await cleanupTenant(id);
  }
  await prisma.$disconnect();
});

describe("requirePermission", () => {
  it("allows a role that has the permission", async () => {
    const tenant = await createTenant("rbac-allow-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "ACCOUNTANT", ["fees.collect"]);

    const token = await signAccessToken({
      sub: "user-1",
      tenantId: tenant.id,
      roles: ["ACCOUNTANT"],
      branchIds: [],
    });

    const res = await request(app).get("/fees").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
  });

  it("denies a role that lacks the permission", async () => {
    const tenant = await createTenant("rbac-deny-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "TEACHER", ["attendance.mark"]);

    const token = await signAccessToken({
      sub: "user-2",
      tenantId: tenant.id,
      roles: ["TEACHER"],
      branchIds: [],
    });

    const res = await request(app).get("/fees").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("rejects requests with no token", async () => {
    const res = await request(app).get("/fees");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});

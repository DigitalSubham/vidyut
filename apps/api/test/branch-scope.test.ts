import express from "express";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@vidyut/db";
import { authGuard } from "../src/core/guards/auth-guard";
import { requireBranch } from "../src/core/guards/branch-scope";
import { errorHandler, asyncHandler, ok } from "../src/core/envelope";
import { signAccessToken } from "../src/core/auth/jwt";
import { cleanupTenant, createBranch, createTenant } from "./helpers";

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.get(
    "/branches/:branchId/students",
    authGuard,
    requireBranch((req) => req.params.branchId),
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

describe("branch scoping", () => {
  it("allows a PRINCIPAL access to their own branch", async () => {
    const tenant = await createTenant("branch-allow-tenant");
    tenantIds.push(tenant.id);
    const branchA = await createBranch(tenant.id, "A");

    const token = await signAccessToken({
      sub: "principal-1",
      tenantId: tenant.id,
      roles: ["PRINCIPAL"],
      branchIds: [branchA.id],
    });

    const res = await request(app)
      .get(`/branches/${branchA.id}/students`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it("denies a PRINCIPAL on Branch A access to Branch B", async () => {
    const tenant = await createTenant("branch-deny-tenant");
    tenantIds.push(tenant.id);
    const branchA = await createBranch(tenant.id, "A");
    const branchB = await createBranch(tenant.id, "B");

    const token = await signAccessToken({
      sub: "principal-2",
      tenantId: tenant.id,
      roles: ["PRINCIPAL"],
      branchIds: [branchA.id],
    });

    const res = await request(app)
      .get(`/branches/${branchB.id}/students`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("lets OWNER access every branch of their tenant", async () => {
    const tenant = await createTenant("branch-owner-tenant");
    tenantIds.push(tenant.id);
    const branchA = await createBranch(tenant.id, "A");
    const branchB = await createBranch(tenant.id, "B");

    const token = await signAccessToken({
      sub: "owner-1",
      tenantId: tenant.id,
      roles: ["OWNER"],
      branchIds: [],
    });

    const resA = await request(app)
      .get(`/branches/${branchA.id}/students`)
      .set("Authorization", `Bearer ${token}`);
    const resB = await request(app)
      .get(`/branches/${branchB.id}/students`)
      .set("Authorization", `Bearer ${token}`);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
  });
});

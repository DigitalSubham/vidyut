import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@vidyut/db";
import { createApp } from "../src/app";
import { cleanupTenant, createTenant } from "./helpers";

const app = createApp();
const tenantIds: string[] = [];

afterAll(async () => {
  for (const id of tenantIds) {
    await cleanupTenant(id);
  }
  await prisma.$disconnect();
});

describe("GET /tenants/resolve/:schoolCode", () => {
  it("resolves a real schoolCode to its tenantSlug", async () => {
    const tenant = await createTenant("schoolcode-tenant");
    tenantIds.push(tenant.id);
    await prisma.tenant.update({ where: { id: tenant.id }, data: { schoolCode: "TEST99" } });

    const res = await request(app).get("/api/v1/tenants/resolve/TEST99");
    expect(res.status).toBe(200);
    expect(res.body.data.tenantSlug).toBe(tenant.slug);
  });

  it("resolves case-insensitively", async () => {
    const tenant = await createTenant("schoolcode-lower-tenant");
    tenantIds.push(tenant.id);
    await prisma.tenant.update({ where: { id: tenant.id }, data: { schoolCode: "ABCD12" } });

    const res = await request(app).get("/api/v1/tenants/resolve/abcd12");
    expect(res.status).toBe(200);
    expect(res.body.data.tenantSlug).toBe(tenant.slug);
  });

  it("404s an unknown school code", async () => {
    const res = await request(app).get("/api/v1/tenants/resolve/NOPE00");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("404s a suspended tenant's school code", async () => {
    const tenant = await createTenant("schoolcode-suspended-tenant");
    tenantIds.push(tenant.id);
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { schoolCode: "SUSP01", status: "SUSPENDED" },
    });

    const res = await request(app).get("/api/v1/tenants/resolve/SUSP01");
    expect(res.status).toBe(404);
  });

  it("each tenant's code resolves only to itself (tenant-isolation)", async () => {
    const tenantA = await createTenant("schoolcode-isolation-a");
    const tenantB = await createTenant("schoolcode-isolation-b");
    tenantIds.push(tenantA.id, tenantB.id);
    await prisma.tenant.update({ where: { id: tenantA.id }, data: { schoolCode: "AAAAAA" } });
    await prisma.tenant.update({ where: { id: tenantB.id }, data: { schoolCode: "BBBBBB" } });

    const resA = await request(app).get("/api/v1/tenants/resolve/AAAAAA");
    const resB = await request(app).get("/api/v1/tenants/resolve/BBBBBB");
    expect(resA.body.data.tenantSlug).toBe(tenantA.slug);
    expect(resB.body.data.tenantSlug).toBe(tenantB.slug);
    expect(resA.body.data.tenantSlug).not.toBe(resB.body.data.tenantSlug);
  });
});

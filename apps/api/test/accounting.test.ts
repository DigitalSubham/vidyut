import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { prisma, withTenant } from "@vidyut/db";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/core/auth/jwt";
import { cleanupTenant, createBranch, createRoleWithPermissions, createTenant } from "./helpers";

const app = createApp();
const tenantIds: string[] = [];

afterAll(async () => {
  for (const id of tenantIds) {
    await cleanupTenant(id);
  }
  await prisma.$disconnect();
});

async function ownerToken(tenantId: string) {
  return signAccessToken({ sub: "owner-1", tenantId, roles: ["OWNER"], branchIds: [] });
}

describe("accounting — expense log CRUD, RBAC", () => {
  it("creates an expense head and an expense against it", async () => {
    const tenant = await createTenant("accounting-crud-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["accounting.manage"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");

    const headRes = await request(app)
      .post("/api/v1/accounting/expense-heads")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, name: "Utilities" });
    expect(headRes.status).toBe(201);
    const headId = headRes.body.data.id as string;

    const expenseRes = await request(app)
      .post("/api/v1/accounting/expenses")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, headId, amountPaise: 500000, vendorName: "BSEB", date: "2026-01-05", note: "January electricity" });
    expect(expenseRes.status).toBe(201);

    const listRes = await request(app)
      .get(`/api/v1/accounting/expenses?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].amount).toBe(500000);
  });

  it("RBAC: a caller without accounting.manage is denied", async () => {
    const tenant = await createTenant("accounting-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const branch = await createBranch(tenant.id, "A");
    const teacher = await signAccessToken({ sub: "t-1", tenantId: tenant.id, roles: ["TEACHER"], branchIds: [branch.id] });

    const res = await request(app)
      .post("/api/v1/accounting/expense-heads")
      .set("Authorization", `Bearer ${teacher}`)
      .send({ branchId: branch.id, name: "X" });
    expect(res.status).toBe(403);
  });
});

describe("accounting — export merges real Payment income and Expense rows into a CSV (scope #2)", () => {
  it("exports a CSV with both an income row (from an existing payment) and an expense row", async () => {
    const tenant = await createTenant("accounting-export-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["accounting.manage"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");

    const student = await withTenant(tenant.id, (tx) =>
      tx.student.create({
        data: { tenantId: tenant.id, branchId: branch.id, admissionNo: "ADM-ACC1", firstName: "A", lastName: "One", dob: new Date("2012-01-01"), gender: "M", address: "Patna" },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.payment.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          studentId: student.id,
          amount: 100000,
          mode: "CASH",
          status: "SUCCESS",
          idempotencyKey: "accounting-export-test-1",
        },
      })
    );

    const headRes = await request(app)
      .post("/api/v1/accounting/expense-heads")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, name: "Stationery" });
    const headId = headRes.body.data.id as string;
    await request(app)
      .post("/api/v1/accounting/expenses")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, headId, amountPaise: 20000, date: new Date().toISOString().slice(0, 10) });

    const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const exportRes = await request(app)
      .get(`/api/v1/accounting/export/tally?branchId=${branch.id}&from=${from}&to=${to}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(exportRes.status).toBe(200);
    expect(exportRes.headers["content-type"]).toContain("text/csv");
    expect(exportRes.text).toContain("INCOME");
    expect(exportRes.text).toContain("EXPENSE");
    expect(exportRes.text).toContain("Stationery");
  });
});

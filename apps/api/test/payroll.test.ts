import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { prisma, withTenant } from "@vidyut/db";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/core/auth/jwt";
import { cleanupTenant, createBranch, createRoleWithPermissions, createStaffUser, createTenant } from "./helpers";

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

describe("payroll — salary structure CRUD, RBAC", () => {
  it("upserts a salary structure for a staff member (one per staff)", async () => {
    const tenant = await createTenant("payroll-crud-tenant");
    tenantIds.push(tenant.id);
    const ownerRole = await createRoleWithPermissions(tenant.id, "OWNER", ["payroll.manage"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const staffUser = await createStaffUser(tenant.id, { email: "teacher@payroll-test.com", password: "Passw0rd!", roleId: ownerRole.id, branchId: branch.id });
    const staff = await withTenant(tenant.id, (tx) =>
      tx.staff.create({
        data: { tenantId: tenant.id, branchId: branch.id, userId: staffUser.id, employeeNo: "EMP-1", designation: "Teacher", type: "TEACHING", joinedAt: new Date("2024-01-01") },
      })
    );

    const createRes = await request(app)
      .post("/api/v1/payroll/salary-structures")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, staffId: staff.id, basicPaise: 3000000, hraPaise: 1000000, allowances: { transport: 200000 }, deductions: {} });
    expect(createRes.status).toBe(200);

    const updateRes = await request(app)
      .post("/api/v1/payroll/salary-structures")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, staffId: staff.id, basicPaise: 3500000, hraPaise: 1000000, allowances: {}, deductions: {} });
    expect(updateRes.status).toBe(200);

    const all = await withTenant(tenant.id, (tx) => tx.salaryStructure.findMany({ where: { staffId: staff.id } }));
    expect(all).toHaveLength(1);
    expect(all[0]!.basic).toBe(3500000);
  });

  it("RBAC: a caller without payroll.manage is denied", async () => {
    const tenant = await createTenant("payroll-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const branch = await createBranch(tenant.id, "A");
    const teacher = await signAccessToken({ sub: "t-1", tenantId: tenant.id, roles: ["TEACHER"], branchIds: [branch.id] });

    const res = await request(app)
      .get(`/api/v1/payroll/salary-structures?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${teacher}`);
    expect(res.status).toBe(403);
  });
});

describe("payroll — export computes gross pay against real leave data (scope #2, Open Question 1's export-first resolution)", () => {
  it("reduces gross pay by real UNPAID-leave days overlapping the export month", async () => {
    const tenant = await createTenant("payroll-export-tenant");
    tenantIds.push(tenant.id);
    const ownerRole = await createRoleWithPermissions(tenant.id, "OWNER", ["payroll.manage"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const staffUser = await createStaffUser(tenant.id, { email: "teacher2@payroll-test.com", password: "Passw0rd!", roleId: ownerRole.id, branchId: branch.id });
    const staff = await withTenant(tenant.id, (tx) =>
      tx.staff.create({
        data: { tenantId: tenant.id, branchId: branch.id, userId: staffUser.id, employeeNo: "EMP-2", designation: "Teacher", type: "TEACHING", joinedAt: new Date("2024-01-01") },
      })
    );

    // basic+hra = 30,000 rupees => 1,000/day. 2 days unpaid leave => -2,000.
    await request(app)
      .post("/api/v1/payroll/salary-structures")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, staffId: staff.id, basicPaise: 2000000, hraPaise: 1000000, allowances: {}, deductions: {} });

    await withTenant(tenant.id, (tx) =>
      tx.leaveRequest.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          staffId: staff.id,
          type: "UNPAID",
          status: "APPROVED",
          fromDate: new Date("2026-03-05"),
          toDate: new Date("2026-03-06"),
        },
      })
    );

    const exportRes = await request(app)
      .get(`/api/v1/payroll/export?branchId=${branch.id}&month=3&year=2026`)
      .set("Authorization", `Bearer ${owner}`);
    expect(exportRes.status).toBe(200);
    expect(exportRes.headers["content-type"]).toContain("text/csv");
    expect(exportRes.text).toContain("EMP-2");
    // gross = 30,000 - 2*1,000 = 28,000 rupees = 2,800,000 paise.
    expect(exportRes.text).toContain("2800000");
  });
});

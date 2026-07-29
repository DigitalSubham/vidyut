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

async function seed(tenantId: string, branchId: string) {
  const student = await withTenant(tenantId, (tx) =>
    tx.student.create({
      data: {
        tenantId,
        branchId,
        admissionNo: "SRCH-0001",
        firstName: "Aarav",
        lastName: "Kumar",
        dob: new Date("2012-01-01"),
        gender: "M",
        address: "Patna",
      },
    })
  );

  const teacherRole = await createRoleWithPermissions(tenantId, "TEACHER", []);
  const staffUser = await createStaffUser(tenantId, {
    email: "priya.teacher@example.com",
    password: "Password123!",
    roleId: teacherRole.id,
    branchId,
  });
  await withTenant(tenantId, (tx) =>
    tx.user.update({ where: { id: staffUser.id }, data: { name: "Priya Sharma" } })
  );
  await withTenant(tenantId, (tx) =>
    tx.staff.create({
      data: {
        tenantId,
        branchId,
        userId: staffUser.id,
        employeeNo: "EMP-01",
        designation: "Teacher",
        type: "TEACHING",
        joinedAt: new Date("2024-01-01"),
      },
    })
  );

  const session = await withTenant(tenantId, (tx) =>
    tx.academicSession.create({
      data: { tenantId, branchId, name: "2025-26", startDate: new Date("2025-04-01"), endDate: new Date("2026-03-31"), isCurrent: true },
    })
  );
  const invoice = await withTenant(tenantId, (tx) =>
    tx.invoice.create({
      data: {
        tenantId,
        branchId,
        studentId: student.id,
        sessionId: session.id,
        number: "SEARCH-INV-9001",
        periodLabel: "Term 1",
        dueDate: new Date("2026-01-01"),
      },
    })
  );

  return { student, invoice };
}

describe("Unit 37 — Global Search", () => {
  it("finds a student by first name, a staff member by name, and an invoice by number, all branch-scoped", async () => {
    const tenant = await createTenant("search-tenant");
    tenantIds.push(tenant.id);
    const branch = await createBranch(tenant.id, "MAIN");
    await createRoleWithPermissions(tenant.id, "OWNER", ["student.view", "fee.view"]);
    const { student, invoice } = await seed(tenant.id, branch.id);
    const owner = await signAccessToken({ sub: "owner-1", tenantId: tenant.id, roles: ["OWNER"], branchIds: [] });

    const studentRes = await request(app)
      .get("/api/v1/search")
      .query({ branchId: branch.id, q: "Aarav" })
      .set("Authorization", `Bearer ${owner}`);
    expect(studentRes.status).toBe(200);
    expect(studentRes.body.data.students.some((s: { id: string }) => s.id === student.id)).toBe(true);

    const staffRes = await request(app)
      .get("/api/v1/search")
      .query({ branchId: branch.id, q: "Priya" })
      .set("Authorization", `Bearer ${owner}`);
    expect(staffRes.status).toBe(200);
    expect(staffRes.body.data.staff.some((s: { name: string }) => s.name === "Priya Sharma")).toBe(true);

    const invoiceRes = await request(app)
      .get("/api/v1/search")
      .query({ branchId: branch.id, q: "SEARCH-INV-9001" })
      .set("Authorization", `Bearer ${owner}`);
    expect(invoiceRes.status).toBe(200);
    expect(invoiceRes.body.data.invoices.some((i: { id: string }) => i.id === invoice.id)).toBe(true);
  });

  it("omits a category the caller lacks permission for (fee.view missing => no invoice results)", async () => {
    const tenant = await createTenant("search-perm-tenant");
    tenantIds.push(tenant.id);
    const branch = await createBranch(tenant.id, "MAIN");
    await createRoleWithPermissions(tenant.id, "OWNER", ["student.view"]); // no fee.view
    await seed(tenant.id, branch.id);
    const owner = await signAccessToken({ sub: "owner-1", tenantId: tenant.id, roles: ["OWNER"], branchIds: [] });

    const res = await request(app)
      .get("/api/v1/search")
      .query({ branchId: branch.id, q: "SEARCH-INV-9001" })
      .set("Authorization", `Bearer ${owner}`);
    expect(res.status).toBe(200);
    expect(res.body.data.invoices).toHaveLength(0);
  });

  it("tenant-isolation: a search in tenant A never returns tenant B's matching student", async () => {
    const tenantA = await createTenant("search-tenant-a");
    const tenantB = await createTenant("search-tenant-b");
    tenantIds.push(tenantA.id, tenantB.id);
    const branchA = await createBranch(tenantA.id, "MAIN");
    const branchB = await createBranch(tenantB.id, "MAIN");
    await createRoleWithPermissions(tenantA.id, "OWNER", ["student.view"]);
    await createRoleWithPermissions(tenantB.id, "OWNER", ["student.view"]);
    await seed(tenantA.id, branchA.id);
    await withTenant(tenantB.id, (tx) =>
      tx.student.create({
        data: {
          tenantId: tenantB.id,
          branchId: branchB.id,
          admissionNo: "SRCH-0001",
          firstName: "Aarav",
          lastName: "Other",
          dob: new Date("2012-01-01"),
          gender: "M",
          address: "Patna",
        },
      })
    );
    const ownerA = await signAccessToken({ sub: "owner-a", tenantId: tenantA.id, roles: ["OWNER"], branchIds: [] });

    const res = await request(app)
      .get("/api/v1/search")
      .query({ branchId: branchA.id, q: "Aarav" })
      .set("Authorization", `Bearer ${ownerA}`);
    expect(res.status).toBe(200);
    expect(res.body.data.students).toHaveLength(1);
    expect(res.body.data.students[0].lastName ?? res.body.data.students[0].name).not.toContain("Other");
  });

  it("branch-scope: a PRINCIPAL on a different branch is denied", async () => {
    const tenant = await createTenant("search-branch-tenant");
    tenantIds.push(tenant.id);
    const branch = await createBranch(tenant.id, "MAIN");
    const otherBranch = await createBranch(tenant.id, "OTHER");
    await createRoleWithPermissions(tenant.id, "PRINCIPAL", ["student.view"]);
    await seed(tenant.id, branch.id);
    const principal = await signAccessToken({
      sub: "principal-1",
      tenantId: tenant.id,
      roles: ["PRINCIPAL"],
      branchIds: [otherBranch.id],
    });

    const res = await request(app)
      .get("/api/v1/search")
      .query({ branchId: branch.id, q: "Aarav" })
      .set("Authorization", `Bearer ${principal}`);
    expect(res.status).toBe(403);
  });
});

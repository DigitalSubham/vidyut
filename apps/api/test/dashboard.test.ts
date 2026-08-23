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

async function adminToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "admin-1", tenantId, roles: ["ADMIN"], branchIds: [branchId] });
}

describe("GET /dashboard/summary — aggregated KPIs, RBAC, branch-scope", () => {
  it("returns numbers that match a direct recomputation from the underlying rows", async () => {
    const tenant = await createTenant("dashboard-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["dashboard.owner"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const cls = await withTenant(tenant.id, (tx) =>
      tx.class.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "Class A", order: 1 } })
    );
    const session = await withTenant(tenant.id, (tx) =>
      tx.academicSession.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          name: "2025-26",
          startDate: new Date("2025-04-01"),
          endDate: new Date("2026-03-31"),
          isCurrent: true,
        },
      })
    );
    const section = await withTenant(tenant.id, (tx) =>
      tx.section.create({ data: { tenantId: tenant.id, branchId: branch.id, classId: cls.id, name: "A-A" } })
    );
    const student = await withTenant(tenant.id, (tx) =>
      tx.student.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          admissionNo: "ADM-1",
          firstName: "S",
          lastName: "One",
          dob: new Date("2012-01-01"),
          gender: "M",
          address: "Patna",
        },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.enrollment.create({
        data: { tenantId: tenant.id, branchId: branch.id, studentId: student.id, sessionId: session.id, classId: cls.id, sectionId: section.id },
      })
    );

    const feeHead = await withTenant(tenant.id, (tx) =>
      tx.feeHead.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "Tuition", type: "TUITION" } })
    );
    const invoice = await withTenant(tenant.id, (tx) =>
      tx.invoice.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          studentId: student.id,
          sessionId: session.id,
          number: "INV-1",
          periodLabel: "This month",
          dueDate: new Date(),
          items: { create: { tenantId: tenant.id, feeHeadId: feeHead.id, amount: 100000 } },
        },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.payment.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          studentId: student.id,
          invoiceId: invoice.id,
          amount: 40000,
          mode: "CASH",
          status: "SUCCESS",
          idempotencyKey: "dash-test-1",
        },
      })
    );

    await withTenant(tenant.id, (tx) =>
      tx.attendanceRecord.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          sessionId: session.id,
          sectionId: section.id,
          studentId: student.id,
          date: new Date(),
          status: "PRESENT",
          markedById: "seed-user",
          source: "WEB",
        },
      })
    );

    await withTenant(tenant.id, (tx) =>
      tx.enquiry.create({
        data: { tenantId: tenant.id, branchId: branch.id, childName: "C", guardianName: "G", phone: "+919812340099", source: "walk-in" },
      })
    );

    // Unit 53 — a staff member on approved leave covering today, feeding staffMetrics.
    const staffUser = await withTenant(tenant.id, (tx) =>
      tx.user.create({ data: { tenantId: tenant.id, name: "T One", phone: "+919812340098", status: "ACTIVE" } })
    );
    const staff = await withTenant(tenant.id, (tx) =>
      tx.staff.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          userId: staffUser.id,
          employeeNo: "EMP-1",
          designation: "Teacher",
          type: "TEACHING",
          joinedAt: new Date("2020-01-01"),
        },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.leaveRequest.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          staffId: staff.id,
          type: "SICK",
          fromDate: new Date(),
          toDate: new Date(),
          status: "APPROVED",
        },
      })
    );

    const res = await request(app)
      .get(`/api/v1/dashboard/summary?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(res.status).toBe(200);
    expect(res.body.data.collectionPercent).toBe(40);
    expect(res.body.data.totalDues).toBe(60000);
    expect(res.body.data.attendancePercent).toBe(100);
    expect(res.body.data.admissionsFunnel.enquiries).toBe(1);

    // Unit 53 — enrollment trend covers the last 12 months, this month's enrollment counted once.
    expect(res.body.data.enrollmentTrend).toHaveLength(12);
    expect(res.body.data.enrollmentTrend[11].count).toBe(1);
    expect(res.body.data.enrollmentTrend.reduce((sum: number, m: { count: number }) => sum + m.count, 0)).toBe(1);

    // Unit 53 — staff metrics: 1 staff member, on leave today.
    expect(res.body.data.staffMetrics).toEqual({ headcount: 1, onLeaveToday: 1 });
  });

  it("RBAC: dashboard.owner/dashboard.principal roles pass; ADMIN/TEACHER denied", async () => {
    const tenant = await createTenant("dashboard-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "ADMIN", []);
    const branch = await createBranch(tenant.id, "A");
    const admin = await adminToken(tenant.id, branch.id);

    const res = await request(app)
      .get(`/api/v1/dashboard/summary?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${admin}`);
    expect(res.status).toBe(403);
  });

  it("branch-scope: a PRINCIPAL on Branch A is denied Branch B's summary", async () => {
    const tenant = await createTenant("dashboard-branch-scope-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "PRINCIPAL", ["dashboard.principal"]);
    const branchA = await createBranch(tenant.id, "A");
    const branchB = await createBranch(tenant.id, "B");
    const principal = await signAccessToken({
      sub: "principal-1",
      tenantId: tenant.id,
      roles: ["PRINCIPAL"],
      branchIds: [branchA.id],
    });

    const res = await request(app)
      .get(`/api/v1/dashboard/summary?branchId=${branchB.id}`)
      .set("Authorization", `Bearer ${principal}`);
    expect(res.status).toBe(403);
  });
});

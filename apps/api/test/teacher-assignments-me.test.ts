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

describe("GET /academic/teacher-assignments/me — self-scoped section lookup (Unit 26)", () => {
  it("returns only the caller's own assignments, resolved from their own Staff row", async () => {
    const tenant = await createTenant("teacher-assignments-me-tenant");
    tenantIds.push(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const cls = await withTenant(tenant.id, (tx) =>
      tx.class.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "Class A", order: 1 } })
    );
    const subject = await withTenant(tenant.id, (tx) =>
      tx.subject.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "Subject A", code: "SUB-A" } })
    );
    const section = await withTenant(tenant.id, (tx) =>
      tx.section.create({ data: { tenantId: tenant.id, branchId: branch.id, classId: cls.id, name: "A-A" } })
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

    const teacherRole = await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const teacherUser = await createStaffUser(tenant.id, {
      email: "teacher-me@example.com",
      password: "Passw0rd!",
      roleId: teacherRole.id,
      branchId: branch.id,
    });
    const teacherStaff = await withTenant(tenant.id, (tx) =>
      tx.staff.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          userId: teacherUser.id,
          employeeNo: "EMP-ME-1",
          designation: "Teacher",
          type: "TEACHING",
          joinedAt: new Date("2020-01-01"),
        },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.teacherAssignment.create({
        data: { tenantId: tenant.id, branchId: branch.id, sessionId: session.id, staffId: teacherStaff.id, subjectId: subject.id, sectionId: section.id },
      })
    );

    const otherUser = await createStaffUser(tenant.id, {
      email: "teacher-other@example.com",
      password: "Passw0rd!",
      roleId: teacherRole.id,
      branchId: branch.id,
    });
    const otherStaff = await withTenant(tenant.id, (tx) =>
      tx.staff.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          userId: otherUser.id,
          employeeNo: "EMP-ME-2",
          designation: "Teacher",
          type: "TEACHING",
          joinedAt: new Date("2020-01-01"),
        },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.teacherAssignment.create({
        data: { tenantId: tenant.id, branchId: branch.id, sessionId: session.id, staffId: otherStaff.id, subjectId: subject.id, sectionId: section.id },
      })
    );

    const token = await signAccessToken({ sub: teacherUser.id, tenantId: tenant.id, roles: ["TEACHER"], branchIds: [branch.id] });

    const res = await request(app)
      .get("/api/v1/academic/teacher-assignments/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].staffId).toBe(teacherStaff.id);
  });
});

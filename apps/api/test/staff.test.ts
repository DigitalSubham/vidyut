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

async function principalToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "principal-1", tenantId, roles: ["PRINCIPAL"], branchIds: [branchId] });
}

async function createStaffViaApi(
  tenantId: string,
  ownerJwt: string,
  branchId: string,
  opts: { role: "TEACHER" | "ADMIN" | "PRINCIPAL" | "ACCOUNTANT"; employeeNo: string; email: string }
) {
  const res = await request(app)
    .post("/api/v1/staff")
    .set("Authorization", `Bearer ${ownerJwt}`)
    .send({
      branchId,
      role: opts.role,
      email: opts.email,
      password: "StaffPass123!",
      name: `Staff ${opts.employeeNo}`,
      employeeNo: opts.employeeNo,
      designation: "Teacher",
      type: "TEACHING",
      joinedAt: "2024-06-01",
    });
  expect(res.status).toBe(201);
  return res.body.data as { id: string; userId: string };
}

describe("staff — CRUD, RBAC (staff.manage restricted to OWNER/PRINCIPAL, ADMIN denied)", () => {
  it("OWNER creates a staff member with a working linked login; ADMIN is denied", async () => {
    const tenant = await createTenant("staff-crud-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["staff.manage"]);
    await createRoleWithPermissions(tenant.id, "ADMIN", []);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");

    const staff = await createStaffViaApi(tenant.id, owner, branch.id, {
      role: "TEACHER",
      employeeNo: "EMP-001",
      email: `teacher-${branch.id}@school.test`,
    });

    const getRes = await request(app).get(`/api/v1/staff/${staff.id}`).set("Authorization", `Bearer ${owner}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.employeeNo).toBe("EMP-001");

    const admin = await adminToken(tenant.id, branch.id);
    const adminCreate = await request(app)
      .post("/api/v1/staff")
      .set("Authorization", `Bearer ${admin}`)
      .send({
        branchId: branch.id,
        role: "TEACHER",
        email: "should-fail@school.test",
        password: "StaffPass123!",
        name: "Should Fail",
        employeeNo: "EMP-002",
        designation: "Teacher",
        type: "TEACHING",
        joinedAt: "2024-06-01",
      });
    expect(adminCreate.status).toBe(403);
    expect(adminCreate.body.error.code).toBe("FORBIDDEN");

    // Reads are broad — TEACHER (no staff.manage) can still list the directory.
    const teacherToken = await signAccessToken({
      sub: "some-teacher",
      tenantId: tenant.id,
      roles: ["TEACHER"],
      branchIds: [branch.id],
    });
    const listRes = await request(app)
      .get(`/api/v1/staff?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${teacherToken}`);
    expect(listRes.status).toBe(200);
  });

  it("cross-tenant staff are invisible even to an unscoped query", async () => {
    const tenantA = await createTenant("staff-isolation-a");
    const tenantB = await createTenant("staff-isolation-b");
    tenantIds.push(tenantA.id, tenantB.id);
    const branch = await createBranch(tenantA.id, "A");
    const user = await withTenant(tenantA.id, (tx) =>
      tx.user.create({ data: { tenantId: tenantA.id, name: "Iso Staff", email: "iso@school.test", status: "ACTIVE" } })
    );
    await withTenant(tenantA.id, (tx) =>
      tx.staff.create({
        data: {
          tenantId: tenantA.id,
          branchId: branch.id,
          userId: user.id,
          employeeNo: "ISO-1",
          designation: "Teacher",
          type: "TEACHING",
          joinedAt: new Date("2024-06-01"),
        },
      })
    );

    const scoped = await withTenant(tenantB.id, (tx) => tx.staff.findMany());
    expect(scoped).toHaveLength(0);

    const unscoped = await prisma.staff.findMany({ where: { tenantId: tenantA.id } });
    expect(unscoped).toHaveLength(0);
  });
});

describe("teacher-assignment + class-teacher (Unit 06's deferred placeholder activated)", () => {
  it("assigns a class teacher and creates a teacher-subject-section assignment", async () => {
    const tenant = await createTenant("staff-teacherassignment-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["staff.manage", "class.manage", "subject.manage"]);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");

    const staff = await createStaffViaApi(tenant.id, owner, branch.id, {
      role: "TEACHER",
      employeeNo: "EMP-TA-1",
      email: `ta-teacher-${branch.id}@school.test`,
    });

    const cls = await withTenant(tenant.id, (tx) =>
      tx.class.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "Class 9", order: 9 } })
    );
    const section = await withTenant(tenant.id, (tx) =>
      tx.section.create({ data: { tenantId: tenant.id, branchId: branch.id, classId: cls.id, name: "9-A" } })
    );
    const subject = await withTenant(tenant.id, (tx) =>
      tx.subject.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "Science", code: "SCI" } })
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

    const classTeacherRes = await request(app)
      .patch(`/api/v1/academic/classes/${cls.id}/sections/${section.id}`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ classTeacherId: staff.id });
    expect(classTeacherRes.status).toBe(200);
    expect(classTeacherRes.body.data.classTeacherId).toBe(staff.id);

    const assignRes = await request(app)
      .post("/api/v1/academic/teacher-assignments")
      .set("Authorization", `Bearer ${owner}`)
      .send({ staffId: staff.id, subjectId: subject.id, sectionId: section.id, sessionId: session.id });
    expect(assignRes.status).toBe(201);

    const listRes = await request(app)
      .get(`/api/v1/academic/teacher-assignments?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
  });
});

describe("leave — apply/approve, ownership, branch scope", () => {
  it("a staff member's own leave application succeeds; someone else's staffId is rejected", async () => {
    const tenant = await createTenant("staff-leave-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["staff.manage"]);
    await createRoleWithPermissions(tenant.id, "TEACHER", ["leave.apply"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");

    const staffA = await createStaffViaApi(tenant.id, owner, branch.id, {
      role: "TEACHER",
      employeeNo: "EMP-LV-1",
      email: `leaveA-${branch.id}@school.test`,
    });
    const staffB = await createStaffViaApi(tenant.id, owner, branch.id, {
      role: "TEACHER",
      employeeNo: "EMP-LV-2",
      email: `leaveB-${branch.id}@school.test`,
    });

    const teacherAToken = await signAccessToken({
      sub: staffA.userId,
      tenantId: tenant.id,
      roles: ["TEACHER"],
      branchIds: [branch.id],
    });

    const ownRes = await request(app)
      .post("/api/v1/leave-requests")
      .set("Authorization", `Bearer ${teacherAToken}`)
      .send({ staffId: staffA.id, type: "CASUAL", fromDate: "2026-01-05", toDate: "2026-01-06", halfDay: false });
    expect(ownRes.status).toBe(201);

    const spoofRes = await request(app)
      .post("/api/v1/leave-requests")
      .set("Authorization", `Bearer ${teacherAToken}`)
      .send({ staffId: staffB.id, type: "CASUAL", fromDate: "2026-01-05", toDate: "2026-01-06", halfDay: false });
    expect(spoofRes.status).toBe(403);
    expect(spoofRes.body.error.code).toBe("FORBIDDEN");
  });

  it("denies leave.approve to TEACHER; enforces branch scope on approval", async () => {
    const tenant = await createTenant("staff-leave-approve-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["staff.manage"]);
    await createRoleWithPermissions(tenant.id, "TEACHER", ["leave.apply"]);
    await createRoleWithPermissions(tenant.id, "PRINCIPAL", ["leave.approve"]);
    const owner = await ownerToken(tenant.id);
    const branchA = await createBranch(tenant.id, "A");
    const branchB = await createBranch(tenant.id, "B");

    const staffA = await createStaffViaApi(tenant.id, owner, branchA.id, {
      role: "TEACHER",
      employeeNo: "EMP-APR-1",
      email: `aprA-${branchA.id}@school.test`,
    });

    const teacherAToken = await signAccessToken({
      sub: staffA.userId,
      tenantId: tenant.id,
      roles: ["TEACHER"],
      branchIds: [branchA.id],
    });
    const leaveRes = await request(app)
      .post("/api/v1/leave-requests")
      .set("Authorization", `Bearer ${teacherAToken}`)
      .send({ staffId: staffA.id, type: "SICK", fromDate: "2026-02-01", toDate: "2026-02-02", halfDay: false });
    expect(leaveRes.status).toBe(201);
    const leaveId = leaveRes.body.data.id as string;

    const teacherApprove = await request(app)
      .patch(`/api/v1/leave-requests/${leaveId}`)
      .set("Authorization", `Bearer ${teacherAToken}`)
      .send({ status: "APPROVED" });
    expect(teacherApprove.status).toBe(403);
    expect(teacherApprove.body.error.code).toBe("FORBIDDEN");

    const principalB = await principalToken(tenant.id, branchB.id);
    const crossBranchApprove = await request(app)
      .patch(`/api/v1/leave-requests/${leaveId}`)
      .set("Authorization", `Bearer ${principalB}`)
      .send({ status: "APPROVED" });
    expect(crossBranchApprove.status).toBe(403);
    expect(crossBranchApprove.body.error.code).toBe("FORBIDDEN");

    const principalA = await principalToken(tenant.id, branchA.id);
    const approveRes = await request(app)
      .patch(`/api/v1/leave-requests/${leaveId}`)
      .set("Authorization", `Bearer ${principalA}`)
      .send({ status: "APPROVED" });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe("APPROVED");
  });
});

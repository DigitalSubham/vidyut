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

async function principalToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "principal-1", tenantId, roles: ["PRINCIPAL"], branchIds: [branchId] });
}

async function setup(tenantId: string, code: string) {
  const branch = await createBranch(tenantId, code);
  const cls = await withTenant(tenantId, (tx) =>
    tx.class.create({ data: { tenantId, branchId: branch.id, name: `Class ${code}`, order: 1 } })
  );
  const session = await withTenant(tenantId, (tx) =>
    tx.academicSession.create({
      data: {
        tenantId,
        branchId: branch.id,
        name: `2025-26 ${code}`,
        startDate: new Date("2025-04-01"),
        endDate: new Date("2026-03-31"),
        isCurrent: true,
      },
    })
  );
  const section = await withTenant(tenantId, (tx) =>
    tx.section.create({ data: { tenantId, branchId: branch.id, classId: cls.id, name: `${code}-A` } })
  );
  return { branch, cls, session, section };
}

async function enrollStudent(
  tenantId: string,
  branchId: string,
  classId: string,
  sectionId: string,
  sessionId: string,
  tag: string
) {
  const student = await withTenant(tenantId, (tx) =>
    tx.student.create({
      data: {
        tenantId,
        branchId,
        admissionNo: `ADM-${tag}`,
        firstName: tag,
        lastName: "Student",
        dob: new Date("2015-01-01"),
        gender: "M",
        address: "Patna",
      },
    })
  );
  await withTenant(tenantId, (tx) =>
    tx.enrollment.create({ data: { tenantId, branchId, studentId: student.id, sessionId, classId, sectionId } })
  );
  return student;
}

async function createTeacherStaff(tenantId: string, branchId: string, tag: string) {
  const user = await withTenant(tenantId, (tx) =>
    tx.user.create({ data: { tenantId, name: `Teacher ${tag}`, email: `teacher-${tag}-${branchId}@school.test`, status: "ACTIVE" } })
  );
  const staff = await withTenant(tenantId, (tx) =>
    tx.staff.create({
      data: {
        tenantId,
        branchId,
        userId: user.id,
        employeeNo: `EMP-${tag}`,
        designation: "Teacher",
        type: "TEACHING",
        joinedAt: new Date("2024-06-01"),
      },
    })
  );
  return { user, staff };
}

describe("attendance — bulk mark (upsert), branch/section scope", () => {
  it("marks a section's attendance in bulk, upserts on re-mark, and restricts an unassigned TEACHER", async () => {
    const tenant = await createTenant("attendance-mark-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "PRINCIPAL", ["attendance.mark", "attendance.view"]);
    await createRoleWithPermissions(tenant.id, "TEACHER", ["attendance.mark", "attendance.view"]);
    const { branch, cls, session, section } = await setup(tenant.id, "A");
    const s1 = await enrollStudent(tenant.id, branch.id, cls.id, section.id, session.id, "S1");
    const s2 = await enrollStudent(tenant.id, branch.id, cls.id, section.id, session.id, "S2");
    const principal = await principalToken(tenant.id, branch.id);

    const markRes = await request(app)
      .post("/api/v1/attendance")
      .set("Authorization", `Bearer ${principal}`)
      .send({
        branchId: branch.id,
        sectionId: section.id,
        date: "2025-06-10",
        records: [
          { studentId: s1.id, status: "PRESENT" },
          { studentId: s2.id, status: "ABSENT" },
        ],
      });
    expect(markRes.status).toBe(201);
    expect(markRes.body.data).toHaveLength(2);

    // Re-mark the same day — upserts, doesn't error or duplicate.
    const remarkRes = await request(app)
      .post("/api/v1/attendance")
      .set("Authorization", `Bearer ${principal}`)
      .send({
        branchId: branch.id,
        sectionId: section.id,
        date: "2025-06-10",
        records: [{ studentId: s1.id, status: "LATE" }],
      });
    expect(remarkRes.status).toBe(201);

    const recordCount = await withTenant(tenant.id, (tx) =>
      tx.attendanceRecord.count({ where: { studentId: s1.id } })
    );
    expect(recordCount).toBe(1);
    const updated = await withTenant(tenant.id, (tx) => tx.attendanceRecord.findFirst({ where: { studentId: s1.id } }));
    expect(updated?.status).toBe("LATE");

    // An unassigned TEACHER can't mark this section.
    const { user: otherTeacherUser } = await createTeacherStaff(tenant.id, branch.id, "OTHER");
    const otherTeacherToken = await signAccessToken({
      sub: otherTeacherUser.id,
      tenantId: tenant.id,
      roles: ["TEACHER"],
      branchIds: [branch.id],
    });
    const deniedRes = await request(app)
      .post("/api/v1/attendance")
      .set("Authorization", `Bearer ${otherTeacherToken}`)
      .send({
        branchId: branch.id,
        sectionId: section.id,
        date: "2025-06-11",
        records: [{ studentId: s1.id, status: "PRESENT" }],
      });
    expect(deniedRes.status).toBe(403);
    expect(deniedRes.body.error.code).toBe("FORBIDDEN");

    // A TEACHER actually assigned to the section can mark it.
    const { user: assignedTeacherUser, staff: assignedStaff } = await createTeacherStaff(tenant.id, branch.id, "ASSIGNED");
    const subject = await withTenant(tenant.id, (tx) =>
      tx.subject.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "Maths", code: "MATH" } })
    );
    await withTenant(tenant.id, (tx) =>
      tx.teacherAssignment.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          sessionId: session.id,
          staffId: assignedStaff.id,
          subjectId: subject.id,
          sectionId: section.id,
        },
      })
    );
    const assignedTeacherToken = await signAccessToken({
      sub: assignedTeacherUser.id,
      tenantId: tenant.id,
      roles: ["TEACHER"],
      branchIds: [branch.id],
    });
    const allowedRes = await request(app)
      .post("/api/v1/attendance")
      .set("Authorization", `Bearer ${assignedTeacherToken}`)
      .send({
        branchId: branch.id,
        sectionId: section.id,
        date: "2025-06-11",
        records: [{ studentId: s1.id, status: "PRESENT" }],
      });
    expect(allowedRes.status).toBe(201);
  });

  it("cross-tenant attendance records are invisible even to an unscoped query", async () => {
    const tenantA = await createTenant("attendance-isolation-a");
    const tenantB = await createTenant("attendance-isolation-b");
    tenantIds.push(tenantA.id, tenantB.id);
    const { branch, cls, session, section } = await setup(tenantA.id, "A");
    const student = await enrollStudent(tenantA.id, branch.id, cls.id, section.id, session.id, "S1");

    await withTenant(tenantA.id, (tx) =>
      tx.attendanceRecord.create({
        data: {
          tenantId: tenantA.id,
          branchId: branch.id,
          sessionId: session.id,
          sectionId: section.id,
          studentId: student.id,
          date: new Date("2025-06-10"),
          status: "PRESENT",
          markedById: "owner-1",
        },
      })
    );

    const scoped = await withTenant(tenantB.id, (tx) => tx.attendanceRecord.findMany());
    expect(scoped).toHaveLength(0);

    const unscoped = await prisma.attendanceRecord.findMany({ where: { tenantId: tenantA.id } });
    expect(unscoped).toHaveLength(0);
  });

  it("branch-scope: a TEACHER on Branch A is denied Branch B's attendance", async () => {
    const tenant = await createTenant("attendance-branchscope-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "TEACHER", ["attendance.view"]);
    const branchA = await createBranch(tenant.id, "A");
    const branchB = await createBranch(tenant.id, "B");
    const teacherA = await signAccessToken({
      sub: "teacher-1",
      tenantId: tenant.id,
      roles: ["TEACHER"],
      branchIds: [branchA.id],
    });

    const res = await request(app)
      .get(`/api/v1/attendance?branchId=${branchB.id}`)
      .set("Authorization", `Bearer ${teacherA}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

describe("attendance — regularize (audited correction path)", () => {
  it("regularize is restricted to OWNER/PRINCIPAL/ADMIN and writes an AuditLog entry", async () => {
    const tenant = await createTenant("attendance-regularize-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["attendance.regularize"]);
    await createRoleWithPermissions(tenant.id, "TEACHER", ["attendance.mark"]);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, session, section } = await setup(tenant.id, "A");
    const student = await enrollStudent(tenant.id, branch.id, cls.id, section.id, session.id, "S1");

    const record = await withTenant(tenant.id, (tx) =>
      tx.attendanceRecord.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          sessionId: session.id,
          sectionId: section.id,
          studentId: student.id,
          date: new Date("2025-06-01"),
          status: "ABSENT",
          markedById: "teacher-1",
        },
      })
    );

    const teacherToken = await signAccessToken({
      sub: "teacher-1",
      tenantId: tenant.id,
      roles: ["TEACHER"],
      branchIds: [branch.id],
    });
    const teacherAttempt = await request(app)
      .patch(`/api/v1/attendance/${record.id}`)
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({ status: "PRESENT", reason: "Was actually present" });
    expect(teacherAttempt.status).toBe(403);
    expect(teacherAttempt.body.error.code).toBe("FORBIDDEN");

    const regularizeRes = await request(app)
      .patch(`/api/v1/attendance/${record.id}`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ status: "PRESENT", reason: "Was actually present, teacher marked wrong" });
    expect(regularizeRes.status).toBe(200);
    expect(regularizeRes.body.data.status).toBe("PRESENT");
    expect(regularizeRes.body.data.regularizedById).toBeTypeOf("string");

    const auditLogs = await withTenant(tenant.id, (tx) =>
      tx.auditLog.findMany({ where: { entity: "AttendanceRecord", entityId: record.id } })
    );
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]?.action).toBe("attendance.regularize");
  });
});

describe("attendance — register + defaulter reports", () => {
  it("returns an accurate register grid and defaulter list", async () => {
    const tenant = await createTenant("attendance-reports-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["attendance.view"]);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, session, section } = await setup(tenant.id, "A");
    const goodStudent = await enrollStudent(tenant.id, branch.id, cls.id, section.id, session.id, "Good");
    const poorStudent = await enrollStudent(tenant.id, branch.id, cls.id, section.id, session.id, "Poor");

    // Good student: present both days. Poor student: absent both days.
    for (const day of [1, 2]) {
      await withTenant(tenant.id, (tx) =>
        tx.attendanceRecord.create({
          data: {
            tenantId: tenant.id,
            branchId: branch.id,
            sessionId: session.id,
            sectionId: section.id,
            studentId: goodStudent.id,
            date: new Date(Date.UTC(2025, 5, day)),
            status: "PRESENT",
            markedById: "owner-1",
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
            studentId: poorStudent.id,
            date: new Date(Date.UTC(2025, 5, day)),
            status: "ABSENT",
            markedById: "owner-1",
          },
        })
      );
    }

    const registerRes = await request(app)
      .get(`/api/v1/attendance/reports/register?sectionId=${section.id}&month=6&year=2025`)
      .set("Authorization", `Bearer ${owner}`);
    expect(registerRes.status).toBe(200);
    expect(registerRes.body.data).toHaveLength(2);
    const goodRow = registerRes.body.data.find((r: { studentId: string }) => r.studentId === goodStudent.id);
    expect(goodRow.days["1"]).toBe("PRESENT");

    const defaultersRes = await request(app)
      .get(`/api/v1/attendance/reports/defaulters?branchId=${branch.id}&thresholdPercent=75`)
      .set("Authorization", `Bearer ${owner}`);
    expect(defaultersRes.status).toBe(200);
    expect(defaultersRes.body.data).toHaveLength(1);
    expect(defaultersRes.body.data[0].studentId).toBe(poorStudent.id);
  });
});

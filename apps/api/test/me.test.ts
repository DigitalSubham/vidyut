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

async function setup(tenantId: string, code: string) {
  const branch = await createBranch(tenantId, code);
  const cls = await withTenant(tenantId, (tx) =>
    tx.class.create({ data: { tenantId, branchId: branch.id, name: `Class ${code}`, order: 1 } })
  );
  const subject = await withTenant(tenantId, (tx) =>
    tx.subject.create({ data: { tenantId, branchId: branch.id, name: `Subject ${code}`, code: `SUB-${code}` } })
  );
  const section = await withTenant(tenantId, (tx) =>
    tx.section.create({ data: { tenantId, branchId: branch.id, classId: cls.id, name: `${code}-A` } })
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
  return { branch, cls, subject, section, session };
}

async function createStudentWithEnrollment(
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
        dob: new Date("2012-01-01"),
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

async function linkStudentLogin(tenantId: string, studentId: string, phone: string) {
  const user = await withTenant(tenantId, (tx) =>
    tx.user.create({ data: { tenantId, name: phone, phone, status: "ACTIVE" } })
  );
  await withTenant(tenantId, (tx) => tx.student.update({ where: { id: studentId }, data: { userId: user.id } }));
  return signAccessToken({ sub: user.id, tenantId, roles: ["STUDENT"], branchIds: [] });
}

async function linkParentToStudent(tenantId: string, studentId: string, phone: string) {
  const user = await withTenant(tenantId, (tx) =>
    tx.user.create({ data: { tenantId, name: phone, phone, status: "ACTIVE" } })
  );
  const guardian = await withTenant(tenantId, (tx) =>
    tx.guardian.create({ data: { tenantId, name: "Parent", relation: "FATHER", phone, userId: user.id } })
  );
  await withTenant(tenantId, (tx) =>
    tx.studentGuardian.create({
      data: { tenantId, studentId, guardianId: guardian.id, isPrimary: true, canPay: true },
    })
  );
  return signAccessToken({ sub: user.id, tenantId, roles: ["PARENT"], branchIds: [] });
}

describe("me — self-scope /me endpoints (attendance, report cards, homework, timetable)", () => {
  it("a PARENT can fetch their own child's attendance/homework/timetable but not an unrelated student's", async () => {
    const tenant = await createTenant("me-parent-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", []);
    const { branch, cls, subject, section, session } = await setup(tenant.id, "A");
    const child = await createStudentWithEnrollment(tenant.id, branch.id, cls.id, section.id, session.id, "C1");
    const otherChild = await createStudentWithEnrollment(tenant.id, branch.id, cls.id, section.id, session.id, "C2");
    const parentToken = await linkParentToStudent(tenant.id, child.id, "+919812340090");

    await withTenant(tenant.id, (tx) =>
      tx.attendanceRecord.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          sessionId: session.id,
          sectionId: section.id,
          studentId: child.id,
          date: new Date("2025-06-10"),
          status: "PRESENT",
          markedById: "seed-user",
          source: "WEB",
        },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.homework.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          sectionId: section.id,
          subjectId: subject.id,
          title: "HW",
          description: "Do it",
          dueDate: new Date("2025-06-20"),
          createdById: "seed-user",
        },
      })
    );

    const myStudentsRes = await request(app)
      .get("/api/v1/me/students")
      .set("Authorization", `Bearer ${parentToken}`);
    expect(myStudentsRes.status).toBe(200);
    expect(myStudentsRes.body.data).toHaveLength(1);
    expect(myStudentsRes.body.data[0].id).toBe(child.id);

    const attendanceRes = await request(app)
      .get(`/api/v1/me/attendance?studentId=${child.id}&month=6&year=2025`)
      .set("Authorization", `Bearer ${parentToken}`);
    expect(attendanceRes.status).toBe(200);
    expect(attendanceRes.body.data).toHaveLength(1);

    const homeworkRes = await request(app)
      .get(`/api/v1/me/homework?studentId=${child.id}`)
      .set("Authorization", `Bearer ${parentToken}`);
    expect(homeworkRes.status).toBe(200);
    expect(homeworkRes.body.data).toHaveLength(1);

    const deniedRes = await request(app)
      .get(`/api/v1/me/attendance?studentId=${otherChild.id}&month=6&year=2025`)
      .set("Authorization", `Bearer ${parentToken}`);
    expect(deniedRes.status).toBe(403);
  });

  it("a STUDENT with a direct login can fetch their own timetable", async () => {
    const tenant = await createTenant("me-student-tenant");
    tenantIds.push(tenant.id);
    const { branch, cls, subject, section, session } = await setup(tenant.id, "A");
    const student = await createStudentWithEnrollment(tenant.id, branch.id, cls.id, section.id, session.id, "S1");
    const staffRole = await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const staffUser = await withTenant(tenant.id, (tx) =>
      tx.user.create({ data: { tenantId: tenant.id, name: "T", email: "t@example.com", passwordHash: "x", status: "ACTIVE" } })
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
    void staffRole;
    await withTenant(tenant.id, (tx) =>
      tx.timetablePeriod.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          sessionId: session.id,
          sectionId: section.id,
          dayOfWeek: 0,
          periodNo: 1,
          subjectId: subject.id,
          staffId: staff.id,
        },
      })
    );
    const studentToken = await linkStudentLogin(tenant.id, student.id, "+919812340091");

    const res = await request(app)
      .get(`/api/v1/me/timetable?studentId=${student.id}`)
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("GET /me/report-cards never returns an unpublished ReportCard", async () => {
    const tenant = await createTenant("me-reportcards-tenant");
    tenantIds.push(tenant.id);
    const { branch, cls, subject, section, session } = await setup(tenant.id, "A");
    const student = await createStudentWithEnrollment(tenant.id, branch.id, cls.id, section.id, session.id, "S1");
    const exam = await withTenant(tenant.id, (tx) =>
      tx.exam.create({
        data: { tenantId: tenant.id, branchId: branch.id, sessionId: session.id, name: "Exam", type: "UNIT_TEST", gradingScheme: "MARKS" },
      })
    );
    const template = await withTenant(tenant.id, (tx) =>
      tx.reportCardTemplate.create({
        data: { tenantId: tenant.id, branchId: branch.id, name: "T", board: "CBSE", layout: {} },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.reportCard.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          sessionId: session.id,
          studentId: student.id,
          examId: exam.id,
          templateId: template.id,
          publishedAt: new Date(),
        },
      })
    );
    const secondExam = await withTenant(tenant.id, (tx) =>
      tx.exam.create({
        data: { tenantId: tenant.id, branchId: branch.id, sessionId: session.id, name: "Exam 2", type: "UNIT_TEST", gradingScheme: "MARKS" },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.reportCard.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          sessionId: session.id,
          studentId: student.id,
          examId: secondExam.id,
          templateId: template.id,
        },
      })
    );
    void subject;
    const studentToken = await linkStudentLogin(tenant.id, student.id, "+919812340092");

    const res = await request(app)
      .get(`/api/v1/me/report-cards?studentId=${student.id}`)
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].publishedAt).not.toBeNull();
  });

  it("GET /me/fees/ledger returns a self-scoped student's invoice+payment history", async () => {
    const tenant = await createTenant("me-ledger-tenant");
    tenantIds.push(tenant.id);
    const { branch, cls, section, session } = await setup(tenant.id, "A");
    const student = await createStudentWithEnrollment(tenant.id, branch.id, cls.id, section.id, session.id, "S1");
    const feeHead = await withTenant(tenant.id, (tx) =>
      tx.feeHead.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "Tuition", type: "TUITION" } })
    );
    await withTenant(tenant.id, (tx) =>
      tx.invoice.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          studentId: student.id,
          sessionId: session.id,
          number: "INV-ME-1",
          periodLabel: "Apr 2025",
          dueDate: new Date("2025-04-05"),
          items: { create: { tenantId: tenant.id, feeHeadId: feeHead.id, amount: 100000 } },
        },
      })
    );
    const parentToken = await linkParentToStudent(tenant.id, student.id, "+919812340093");

    const res = await request(app)
      .get(`/api/v1/me/fees/ledger?studentId=${student.id}`)
      .set("Authorization", `Bearer ${parentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].type).toBe("invoice");
  });

  it("GET /me/announcements only returns notices matching the student's audience (or a global one)", async () => {
    const tenant = await createTenant("me-announcements-tenant");
    tenantIds.push(tenant.id);
    const { branch, cls, section, session } = await setup(tenant.id, "A");
    const student = await createStudentWithEnrollment(tenant.id, branch.id, cls.id, section.id, session.id, "S1");
    await withTenant(tenant.id, (tx) =>
      tx.announcement.create({
        data: { tenantId: tenant.id, branchId: branch.id, title: "Global", body: "Everyone", createdById: "seed-user" },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.announcement.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          title: "This class",
          body: "Matched",
          audience: { classIds: [cls.id] },
          createdById: "seed-user",
        },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.announcement.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          title: "Teachers only",
          body: "Unmatched",
          audience: { roles: ["TEACHER"] },
          createdById: "seed-user",
        },
      })
    );
    const parentToken = await linkParentToStudent(tenant.id, student.id, "+919812340094");

    const res = await request(app)
      .get(`/api/v1/me/announcements?studentId=${student.id}`)
      .set("Authorization", `Bearer ${parentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    const titles = res.body.data.map((a: { title: string }) => a.title).sort();
    expect(titles).toEqual(["Global", "This class"]);
  });
});

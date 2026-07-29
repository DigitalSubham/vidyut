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

// homework.manage is PRINCIPAL/TEACHER only (Unit 23's own RBAC test) — OWNER
// is deliberately denied, so grading/listing submissions uses PRINCIPAL here.
async function principalToken(tenantId: string, branchIds: string[] = []) {
  return signAccessToken({ sub: "principal-1", tenantId, roles: ["PRINCIPAL"], branchIds });
}

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

describe("Unit 45 — Homework Depth (submission, grading, calendar)", () => {
  it("a parent submits homework for their own child only, and a teacher grades it", async () => {
    const tenant = await createTenant("homework-submission-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "PRINCIPAL", ["homework.manage"]);
    const { branch, cls, subject, section, session } = await setup(tenant.id, "HW");
    const principal = await principalToken(tenant.id, [branch.id]);
    const child = await createStudentWithEnrollment(tenant.id, branch.id, cls.id, section.id, session.id, "C1");
    const otherChild = await createStudentWithEnrollment(tenant.id, branch.id, cls.id, section.id, session.id, "C2");
    const parentToken = await linkParentToStudent(tenant.id, child.id, "+919812340091");

    const homework = await withTenant(tenant.id, (tx) =>
      tx.homework.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          sectionId: section.id,
          subjectId: subject.id,
          title: "Algebra sheet",
          description: "Solve all",
          dueDate: new Date("2026-07-25"),
          createdById: "seed-user",
        },
      })
    );

    // Wrong student is rejected before touching storage.
    const deniedRes = await request(app)
      .post(`/api/v1/homework/${homework.id}/submissions`)
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ studentId: otherChild.id, fileName: "hw.pdf", contentType: "application/pdf" });
    expect(deniedRes.status).toBe(403);

    const submitRes = await request(app)
      .post(`/api/v1/homework/${homework.id}/submissions`)
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ studentId: child.id, fileName: "hw.pdf", contentType: "application/pdf" });
    expect(submitRes.status).toBe(201);
    expect(submitRes.body.data.uploadUrl).toBeTruthy();
    expect(submitRes.body.data.fileUrl).toContain(child.id);
    const submissionId = submitRes.body.data.id;

    // Re-submitting upserts, doesn't create a second row.
    const resubmitRes = await request(app)
      .post(`/api/v1/homework/${homework.id}/submissions`)
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ studentId: child.id, fileName: "hw-v2.pdf", contentType: "application/pdf" });
    expect(resubmitRes.status).toBe(201);
    const rows = await withTenant(tenant.id, (tx) =>
      tx.homeworkSubmission.findMany({ where: { homeworkId: homework.id, studentId: child.id } })
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.fileUrl).toContain("hw-v2.pdf");

    const listRes = await request(app)
      .get(`/api/v1/homework/${homework.id}/submissions`)
      .set("Authorization", `Bearer ${principal}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const gradeRes = await request(app)
      .patch(`/api/v1/homework/submissions/${submissionId}`)
      .set("Authorization", `Bearer ${principal}`)
      .send({ grade: "A", feedback: "Well done" });
    expect(gradeRes.status).toBe(200);
    expect(gradeRes.body.data.grade).toBe("A");
    expect(gradeRes.body.data.gradedById).toBeTruthy();

    // A parent may not grade — permission-gated, not self-scoped.
    const parentGradeAttempt = await request(app)
      .patch(`/api/v1/homework/submissions/${submissionId}`)
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ grade: "B" });
    expect(parentGradeAttempt.status).toBe(403);
  });

  it("GET /me/homework/calendar groups homework by due-date day within the requested month", async () => {
    const tenant = await createTenant("homework-calendar-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "PRINCIPAL", ["homework.manage"]);
    const { branch, cls, subject, section, session } = await setup(tenant.id, "CAL");
    const child = await createStudentWithEnrollment(tenant.id, branch.id, cls.id, section.id, session.id, "C1");
    const parentToken = await linkParentToStudent(tenant.id, child.id, "+919812340092");

    await withTenant(tenant.id, (tx) =>
      tx.homework.createMany({
        data: [
          {
            tenantId: tenant.id,
            branchId: branch.id,
            sectionId: section.id,
            subjectId: subject.id,
            title: "HW1",
            description: "d",
            dueDate: new Date("2026-07-10"),
            createdById: "seed-user",
          },
          {
            tenantId: tenant.id,
            branchId: branch.id,
            sectionId: section.id,
            subjectId: subject.id,
            title: "HW2",
            description: "d",
            dueDate: new Date("2026-07-10"),
            createdById: "seed-user",
          },
          {
            tenantId: tenant.id,
            branchId: branch.id,
            sectionId: section.id,
            subjectId: subject.id,
            title: "HW3-next-month",
            description: "d",
            dueDate: new Date("2026-08-01"),
            createdById: "seed-user",
          },
        ],
      })
    );

    const calendarRes = await request(app)
      .get("/api/v1/me/homework/calendar")
      .query({ studentId: child.id, month: 7, year: 2026 })
      .set("Authorization", `Bearer ${parentToken}`);
    expect(calendarRes.status).toBe(200);
    expect(Object.keys(calendarRes.body.data)).toEqual(["10"]);
    expect(calendarRes.body.data["10"]).toHaveLength(2);
  });
});

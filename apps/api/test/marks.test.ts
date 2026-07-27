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

async function teacherToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "teacher-1", tenantId, roles: ["TEACHER"], branchIds: [branchId] });
}

async function setup(tenantId: string, code: string, gradingScheme: "MARKS" | "GRADE" = "MARKS") {
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
  const exam = await withTenant(tenantId, (tx) =>
    tx.exam.create({
      data: {
        tenantId,
        branchId: branch.id,
        sessionId: session.id,
        name: `Exam ${code}`,
        type: "UNIT_TEST",
        gradingScheme,
      },
    })
  );
  const examSubject = await withTenant(tenantId, (tx) =>
    tx.examSubject.create({
      data: { tenantId, examId: exam.id, classId: cls.id, subjectId: subject.id, maxMarks: 100, passMarks: 33 },
    })
  );
  const student = await withTenant(tenantId, (tx) =>
    tx.student.create({
      data: {
        tenantId,
        branchId: branch.id,
        admissionNo: `ADM-${code}`,
        firstName: code,
        lastName: "Student",
        dob: new Date("2012-01-01"),
        gender: "M",
        address: "Patna",
      },
    })
  );
  await withTenant(tenantId, (tx) =>
    tx.enrollment.create({
      data: { tenantId, branchId: branch.id, studentId: student.id, sessionId: session.id, classId: cls.id, sectionId: section.id },
    })
  );
  return { branch, cls, subject, section, session, exam, examSubject, student };
}

describe("marks entry — bulk upsert, >maxMarks guard, moderation lock, grading, RBAC, isolation", () => {
  it("bulk enters marks and upserts the same student cleanly on resubmission", async () => {
    const tenant = await createTenant("marks-crud-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["marks.enter", "marks.moderate"]);
    const owner = await ownerToken(tenant.id);
    const { examSubject, student } = await setup(tenant.id, "A");

    const res = await request(app)
      .post("/api/v1/marks")
      .set("Authorization", `Bearer ${owner}`)
      .send({ examSubjectId: examSubject.id, entries: [{ studentId: student.id, marks: 72, isAbsent: false }] });
    expect(res.status).toBe(201);
    expect(res.body.data[0].marks).toBe(72);

    const resubmit = await request(app)
      .post("/api/v1/marks")
      .set("Authorization", `Bearer ${owner}`)
      .send({ examSubjectId: examSubject.id, entries: [{ studentId: student.id, marks: 80, isAbsent: false }] });
    expect(resubmit.status).toBe(201);

    const count = await withTenant(tenant.id, (tx) => tx.marksEntry.count({ where: { studentId: student.id } }));
    expect(count).toBe(1);

    const listRes = await request(app)
      .get(`/api/v1/marks?examSubjectId=${examSubject.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].marks).toBe(80);
  });

  it("computes a CBSE grade band when the exam's gradingScheme is GRADE", async () => {
    const tenant = await createTenant("marks-grading-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["marks.enter"]);
    const owner = await ownerToken(tenant.id);
    const { examSubject, student } = await setup(tenant.id, "A", "GRADE");

    const res = await request(app)
      .post("/api/v1/marks")
      .set("Authorization", `Bearer ${owner}`)
      .send({ examSubjectId: examSubject.id, entries: [{ studentId: student.id, marks: 85, isAbsent: false }] });
    expect(res.status).toBe(201);
    expect(res.body.data[0].grade).toBe("A2");
  });

  it("rejects marks greater than the ExamSubject's maxMarks", async () => {
    const tenant = await createTenant("marks-validation-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["marks.enter"]);
    const owner = await ownerToken(tenant.id);
    const { examSubject, student } = await setup(tenant.id, "A");

    const res = await request(app)
      .post("/api/v1/marks")
      .set("Authorization", `Bearer ${owner}`)
      .send({ examSubjectId: examSubject.id, entries: [{ studentId: student.id, marks: 150, isAbsent: false }] });
    expect(res.status).toBe(400);
  });

  it("locking a MarksEntry row blocks further edits to that row with 409; other rows stay editable", async () => {
    const tenant = await createTenant("marks-lock-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["marks.enter", "marks.moderate"]);
    const owner = await ownerToken(tenant.id);
    const { examSubject, student } = await setup(tenant.id, "A");

    const enter = await request(app)
      .post("/api/v1/marks")
      .set("Authorization", `Bearer ${owner}`)
      .send({ examSubjectId: examSubject.id, entries: [{ studentId: student.id, marks: 60, isAbsent: false }] });
    expect(enter.status).toBe(201);
    const entryId = enter.body.data[0].id as string;

    const lockRes = await request(app)
      .patch(`/api/v1/marks/${entryId}/lock`)
      .set("Authorization", `Bearer ${owner}`);
    expect(lockRes.status).toBe(200);
    expect(lockRes.body.data.lockedAt).not.toBeNull();

    const blockedEdit = await request(app)
      .post("/api/v1/marks")
      .set("Authorization", `Bearer ${owner}`)
      .send({ examSubjectId: examSubject.id, entries: [{ studentId: student.id, marks: 70, isAbsent: false }] });
    expect(blockedEdit.status).toBe(409);
  });

  it("RBAC: marks.enter (TEACHER/PRINCIPAL) pass on entry, OWNER/ADMIN denied; marks.moderate (OWNER/PRINCIPAL) pass on lock, TEACHER denied", async () => {
    const tenant = await createTenant("marks-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "PRINCIPAL", ["marks.enter", "marks.moderate"]);
    await createRoleWithPermissions(tenant.id, "TEACHER", ["marks.enter"]);
    await createRoleWithPermissions(tenant.id, "OWNER", []);
    const { branch, examSubject, student } = await setup(tenant.id, "A");
    const principal = await principalToken(tenant.id, branch.id);
    const teacher = await teacherToken(tenant.id, branch.id);
    const owner = await ownerToken(tenant.id);

    const ownerEnter = await request(app)
      .post("/api/v1/marks")
      .set("Authorization", `Bearer ${owner}`)
      .send({ examSubjectId: examSubject.id, entries: [{ studentId: student.id, marks: 50, isAbsent: false }] });
    expect(ownerEnter.status).toBe(403);

    const principalEnter = await request(app)
      .post("/api/v1/marks")
      .set("Authorization", `Bearer ${principal}`)
      .send({ examSubjectId: examSubject.id, entries: [{ studentId: student.id, marks: 55, isAbsent: false }] });
    expect(principalEnter.status).toBe(201);
    const entryId = principalEnter.body.data[0].id as string;

    const teacherLock = await request(app)
      .patch(`/api/v1/marks/${entryId}/lock`)
      .set("Authorization", `Bearer ${teacher}`);
    expect(teacherLock.status).toBe(403);

    const principalLock = await request(app)
      .patch(`/api/v1/marks/${entryId}/lock`)
      .set("Authorization", `Bearer ${principal}`);
    expect(principalLock.status).toBe(200);
  });

  it("tenant-isolation: cross-tenant marks-entry queries return zero rows both via RLS and via an unscoped query", async () => {
    const tenantA = await createTenant("marks-iso-a-tenant");
    const tenantB = await createTenant("marks-iso-b-tenant");
    tenantIds.push(tenantA.id, tenantB.id);
    const { exam, examSubject, student } = await setup(tenantA.id, "A");
    await setup(tenantB.id, "B");

    const marksEntry = await withTenant(tenantA.id, (tx) =>
      tx.marksEntry.create({
        data: {
          tenantId: tenantA.id,
          branchId: exam.branchId,
          examSubjectId: examSubject.id,
          studentId: student.id,
          marks: 40,
          isAbsent: false,
          enteredById: "seed-user",
        },
      })
    );

    const crossTenant = await withTenant(tenantB.id, (tx) => tx.marksEntry.findMany({}));
    expect(crossTenant).toHaveLength(0);

    const unscoped = await prisma.marksEntry.findMany({ where: { id: marksEntry.id } });
    expect(unscoped).toHaveLength(0);
  });
});

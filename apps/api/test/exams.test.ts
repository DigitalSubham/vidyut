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

async function ownerToken(tenantId: string, branchIds: string[] = []) {
  return signAccessToken({ sub: "owner-1", tenantId, roles: ["OWNER"], branchIds });
}

async function teacherToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "teacher-1", tenantId, roles: ["TEACHER"], branchIds: [branchId] });
}

async function adminToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "admin-1", tenantId, roles: ["ADMIN"], branchIds: [branchId] });
}

async function accountantToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "accountant-1", tenantId, roles: ["ACCOUNTANT"], branchIds: [branchId] });
}

async function setup(tenantId: string, code: string) {
  const branch = await createBranch(tenantId, code);
  const cls = await withTenant(tenantId, (tx) =>
    tx.class.create({ data: { tenantId, branchId: branch.id, name: `Class ${code}`, order: 1 } })
  );
  const subject = await withTenant(tenantId, (tx) =>
    tx.subject.create({ data: { tenantId, branchId: branch.id, name: `Subject ${code}`, code: `SUB-${code}` } })
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
  return { branch, cls, subject, session };
}

describe("exams — CRUD, lock semantics, RBAC, branch + tenant isolation", () => {
  it("creates an exam and its exam-subjects end to end", async () => {
    const tenant = await createTenant("exam-crud-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["exam.manage"]);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, subject, session } = await setup(tenant.id, "A");

    const createRes = await request(app)
      .post("/api/v1/exams")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        sessionId: session.id,
        name: "Half-Yearly 2025",
        type: "HALF_YEARLY",
        gradingScheme: "MARKS",
      });
    expect(createRes.status).toBe(201);
    const examId = createRes.body.data.id as string;

    const subjectRes = await request(app)
      .post(`/api/v1/exams/${examId}/subjects`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ classId: cls.id, subjectId: subject.id, maxMarks: 100, passMarks: 33 });
    expect(subjectRes.status).toBe(201);

    const listRes = await request(app)
      .get(`/api/v1/exams?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const subjectsListRes = await request(app)
      .get(`/api/v1/exams/${examId}/subjects`)
      .set("Authorization", `Bearer ${owner}`);
    expect(subjectsListRes.status).toBe(200);
    expect(subjectsListRes.body.data).toHaveLength(1);
  });

  it("rejects an ExamSubject whose passMarks exceeds maxMarks", async () => {
    const tenant = await createTenant("exam-validation-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["exam.manage"]);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, subject, session } = await setup(tenant.id, "A");

    const exam = await withTenant(tenant.id, (tx) =>
      tx.exam.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          sessionId: session.id,
          name: "Unit Test 1",
          type: "UNIT_TEST",
          gradingScheme: "MARKS",
        },
      })
    );

    const res = await request(app)
      .post(`/api/v1/exams/${exam.id}/subjects`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ classId: cls.id, subjectId: subject.id, maxMarks: 50, passMarks: 60 });
    expect(res.status).toBe(400);
  });

  it("locking an exam (isLocked=true) blocks further subject/exam mutations with 409; a deliberate unlock PATCH reopens it", async () => {
    const tenant = await createTenant("exam-lock-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["exam.manage"]);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, subject, session } = await setup(tenant.id, "A");

    const exam = await withTenant(tenant.id, (tx) =>
      tx.exam.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          sessionId: session.id,
          name: "Annual 2025",
          type: "ANNUAL",
          gradingScheme: "MARKS",
        },
      })
    );

    const lockRes = await request(app)
      .patch(`/api/v1/exams/${exam.id}`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ isLocked: true });
    expect(lockRes.status).toBe(200);
    expect(lockRes.body.data.isLocked).toBe(true);

    const blockedPatch = await request(app)
      .patch(`/api/v1/exams/${exam.id}`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ name: "Renamed" });
    expect(blockedPatch.status).toBe(409);

    const blockedSubject = await request(app)
      .post(`/api/v1/exams/${exam.id}/subjects`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ classId: cls.id, subjectId: subject.id, maxMarks: 100, passMarks: 33 });
    expect(blockedSubject.status).toBe(409);

    const unlockRes = await request(app)
      .patch(`/api/v1/exams/${exam.id}`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ isLocked: false });
    expect(unlockRes.status).toBe(200);
    expect(unlockRes.body.data.isLocked).toBe(false);

    const nowAllowedSubject = await request(app)
      .post(`/api/v1/exams/${exam.id}/subjects`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ classId: cls.id, subjectId: subject.id, maxMarks: 100, passMarks: 33 });
    expect(nowAllowedSubject.status).toBe(201);
  });

  it("RBAC: exam.manage roles pass on mutations; TEACHER/ACCOUNTANT are denied; reads work for any authenticated staff role", async () => {
    const tenant = await createTenant("exam-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["exam.manage"]);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    await createRoleWithPermissions(tenant.id, "ACCOUNTANT", []);
    const owner = await ownerToken(tenant.id);
    const { branch, session } = await setup(tenant.id, "A");
    const teacher = await teacherToken(tenant.id, branch.id);
    const accountant = await accountantToken(tenant.id, branch.id);

    const teacherCreate = await request(app)
      .post("/api/v1/exams")
      .set("Authorization", `Bearer ${teacher}`)
      .send({ branchId: branch.id, sessionId: session.id, name: "Denied Exam", type: "UNIT_TEST", gradingScheme: "MARKS" });
    expect(teacherCreate.status).toBe(403);

    const accountantCreate = await request(app)
      .post("/api/v1/exams")
      .set("Authorization", `Bearer ${accountant}`)
      .send({ branchId: branch.id, sessionId: session.id, name: "Denied Exam", type: "UNIT_TEST", gradingScheme: "MARKS" });
    expect(accountantCreate.status).toBe(403);

    const ownerCreate = await request(app)
      .post("/api/v1/exams")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, sessionId: session.id, name: "Allowed Exam", type: "UNIT_TEST", gradingScheme: "MARKS" });
    expect(ownerCreate.status).toBe(201);

    const teacherRead = await request(app)
      .get(`/api/v1/exams?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${teacher}`);
    expect(teacherRead.status).toBe(200);
  });

  it("branch-scope: an ADMIN on Branch A is denied Branch B's exams", async () => {
    const tenant = await createTenant("exam-branch-scope-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "ADMIN", ["exam.manage"]);
    const { branch: branchA } = await setup(tenant.id, "A");
    const { branch: branchB } = await setup(tenant.id, "B");
    const scopedAdmin = await adminToken(tenant.id, branchA.id);

    const res = await request(app)
      .get(`/api/v1/exams?branchId=${branchB.id}`)
      .set("Authorization", `Bearer ${scopedAdmin}`);
    expect(res.status).toBe(403);

    const okRes = await request(app)
      .get(`/api/v1/exams?branchId=${branchA.id}`)
      .set("Authorization", `Bearer ${scopedAdmin}`);
    expect(okRes.status).toBe(200);
  });

  it("tenant-isolation: cross-tenant exam/exam-subject queries return zero rows both via RLS and via an unscoped query", async () => {
    const tenantA = await createTenant("exam-iso-a-tenant");
    const tenantB = await createTenant("exam-iso-b-tenant");
    tenantIds.push(tenantA.id, tenantB.id);
    const { branch: branchA, cls: clsA, subject: subjectA, session: sessionA } = await setup(tenantA.id, "A");
    await setup(tenantB.id, "B");

    const examA = await withTenant(tenantA.id, (tx) =>
      tx.exam.create({
        data: {
          tenantId: tenantA.id,
          branchId: branchA.id,
          sessionId: sessionA.id,
          name: "Tenant A Exam",
          type: "UNIT_TEST",
          gradingScheme: "MARKS",
        },
      })
    );
    await withTenant(tenantA.id, (tx) =>
      tx.examSubject.create({
        data: { tenantId: tenantA.id, examId: examA.id, classId: clsA.id, subjectId: subjectA.id, maxMarks: 100, passMarks: 33 },
      })
    );

    const crossTenantExams = await withTenant(tenantB.id, (tx) => tx.exam.findMany({}));
    expect(crossTenantExams).toHaveLength(0);
    const crossTenantSubjects = await withTenant(tenantB.id, (tx) => tx.examSubject.findMany({}));
    expect(crossTenantSubjects).toHaveLength(0);

    // Even a deliberately unscoped query (plain `prisma`, no withTenant/app.tenant_id
    // set) is blocked by FORCE ROW LEVEL SECURITY — RLS is the backstop that
    // holds even if a service layer forgets to scope a query.
    const unscopedExams = await prisma.exam.findMany({ where: { tenantId: tenantA.id } });
    expect(unscopedExams).toHaveLength(0);
  });
});

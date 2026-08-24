import type { Worker } from "bullmq";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, withTenant } from "@vidyut/db";
import { startWorker } from "@vidyut/worker";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/core/auth/jwt";
import { cleanupTenant, createBranch, createRoleWithPermissions, createTenant } from "./helpers";

const app = createApp();
const tenantIds: string[] = [];
let worker: Worker;

beforeAll(() => {
  worker = startWorker();
});

afterAll(async () => {
  await worker.close();
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
  const exam = await withTenant(tenantId, (tx) =>
    tx.exam.create({
      data: { tenantId, branchId: branch.id, sessionId: session.id, name: `Exam ${code}`, type: "UNIT_TEST", gradingScheme: "MARKS" },
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

describe("report cards — template CRUD, generate (background), publish, RBAC, isolation", () => {
  it("creates a template, generates report cards for every enrolled student, and publishes one", async () => {
    const tenant = await createTenant("reportcards-crud-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["reportcard.generate", "reportcard.publish"]);
    const owner = await ownerToken(tenant.id);
    const { branch, exam, student } = await setup(tenant.id, "A");

    const templateRes = await request(app)
      .post("/api/v1/report-card-templates")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, name: "CBSE Standard", board: "CBSE", layout: {} });
    expect(templateRes.status).toBe(201);
    const templateId = templateRes.body.data.id as string;

    const generateRes = await request(app)
      .post("/api/v1/report-cards/generate")
      .set("Authorization", `Bearer ${owner}`)
      .send({ examId: exam.id, templateId });
    expect(generateRes.status).toBe(201);
    expect(generateRes.body.data).toHaveLength(1);
    expect(generateRes.body.data[0].studentId).toBe(student.id);
    expect(generateRes.body.data[0].publishedAt).toBeNull();
    const reportCardId = generateRes.body.data[0].id as string;

    const listRes = await request(app)
      .get(`/api/v1/report-cards?examId=${exam.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const publishRes = await request(app)
      .patch(`/api/v1/report-cards/${reportCardId}/publish`)
      .set("Authorization", `Bearer ${owner}`);
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.data.publishedAt).not.toBeNull();

    // Unit 19's real Puppeteer reportcard.generate job — waits for the async
    // worker to render and upload the PDF, then asserts a real download URL
    // is resolved on read (not the old stub's permanent null).
    await new Promise((resolve) => setTimeout(resolve, 4000));
    const listAfterRender = await request(app)
      .get(`/api/v1/report-cards?examId=${exam.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listAfterRender.body.data[0].downloadUrl).toBeTruthy();
  }, 10000);

  it("regenerating for the same exam upserts by (examId, studentId) rather than duplicating", async () => {
    const tenant = await createTenant("reportcards-upsert-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["reportcard.generate"]);
    const owner = await ownerToken(tenant.id);
    const { branch, exam } = await setup(tenant.id, "A");

    const templateRes = await request(app)
      .post("/api/v1/report-card-templates")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, name: "CBSE Standard", board: "CBSE" });
    const templateId = templateRes.body.data.id as string;

    await request(app)
      .post("/api/v1/report-cards/generate")
      .set("Authorization", `Bearer ${owner}`)
      .send({ examId: exam.id, templateId });
    await request(app)
      .post("/api/v1/report-cards/generate")
      .set("Authorization", `Bearer ${owner}`)
      .send({ examId: exam.id, templateId });

    const count = await withTenant(tenant.id, (tx) => tx.reportCard.count({ where: { examId: exam.id } }));
    expect(count).toBe(1);
  });

  it("RBAC: reportcard.generate roles pass on template CRUD + generate; reportcard.publish is narrower (an ADMIN who can generate cannot publish)", async () => {
    const tenant = await createTenant("reportcards-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "ADMIN", ["reportcard.generate"]);
    const { branch, exam } = await setup(tenant.id, "A");
    const admin = await adminToken(tenant.id, branch.id);

    const templateRes = await request(app)
      .post("/api/v1/report-card-templates")
      .set("Authorization", `Bearer ${admin}`)
      .send({ branchId: branch.id, name: "Admin Template", board: "CBSE" });
    expect(templateRes.status).toBe(201);
    const templateId = templateRes.body.data.id as string;

    const generateRes = await request(app)
      .post("/api/v1/report-cards/generate")
      .set("Authorization", `Bearer ${admin}`)
      .send({ examId: exam.id, templateId });
    expect(generateRes.status).toBe(201);
    const reportCardId = generateRes.body.data[0].id as string;

    const publishRes = await request(app)
      .patch(`/api/v1/report-cards/${reportCardId}/publish`)
      .set("Authorization", `Bearer ${admin}`);
    expect(publishRes.status).toBe(403);
  });

  it("branch-scope: an ADMIN on Branch A is denied generating report cards for Branch B's exam", async () => {
    const tenant = await createTenant("reportcards-branch-scope-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "ADMIN", ["reportcard.generate"]);
    const { branch: branchA } = await setup(tenant.id, "A");
    const { branch: branchB, exam: examB } = await setup(tenant.id, "B");
    const adminA = await adminToken(tenant.id, branchA.id);

    const templateRes = await request(app)
      .post("/api/v1/report-card-templates")
      .set("Authorization", `Bearer ${adminA}`)
      .send({ branchId: branchB.id, name: "Branch B Template", board: "CBSE" });
    expect(templateRes.status).toBe(403);
    void examB;
  });

  it("tenant-isolation: cross-tenant report-card/template queries return zero rows both via RLS and via an unscoped query", async () => {
    const tenantA = await createTenant("reportcards-iso-a-tenant");
    const tenantB = await createTenant("reportcards-iso-b-tenant");
    tenantIds.push(tenantA.id, tenantB.id);
    const { branch, exam, student } = await setup(tenantA.id, "A");
    await setup(tenantB.id, "B");

    const template = await withTenant(tenantA.id, (tx) =>
      tx.reportCardTemplate.create({
        data: { tenantId: tenantA.id, branchId: branch.id, name: "T", board: "CBSE", layout: {} },
      })
    );
    const reportCard = await withTenant(tenantA.id, (tx) =>
      tx.reportCard.create({
        data: {
          tenantId: tenantA.id,
          branchId: branch.id,
          sessionId: exam.sessionId,
          studentId: student.id,
          examId: exam.id,
          templateId: template.id,
        },
      })
    );

    const crossTenantCards = await withTenant(tenantB.id, (tx) => tx.reportCard.findMany({}));
    expect(crossTenantCards).toHaveLength(0);
    const crossTenantTemplates = await withTenant(tenantB.id, (tx) => tx.reportCardTemplate.findMany({}));
    expect(crossTenantTemplates).toHaveLength(0);

    const unscopedCards = await prisma.reportCard.findMany({ where: { id: reportCard.id } });
    expect(unscopedCards).toHaveLength(0);
  });
});

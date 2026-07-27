import type { Worker } from "bullmq";
import request from "supertest";
import * as XLSX from "xlsx";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, withTenant } from "@vidyut/db";
import { startWorker } from "@vidyut/worker";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/core/auth/jwt";
import { getUploadUrl } from "../src/core/storage";
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

async function teacherToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "teacher-1", tenantId, roles: ["TEACHER"], branchIds: [branchId] });
}

async function setupBranchWithClassAndSession(tenantId: string, branchCode: string) {
  const branch = await createBranch(tenantId, branchCode);
  const cls = await withTenant(tenantId, (tx) =>
    tx.class.create({ data: { tenantId, branchId: branch.id, name: `Class 6 ${branchCode}`, order: 6 } })
  );
  const section = await withTenant(tenantId, (tx) =>
    tx.section.create({ data: { tenantId, branchId: branch.id, classId: cls.id, name: `6-A ${branchCode}` } })
  );
  const session = await withTenant(tenantId, (tx) =>
    tx.academicSession.create({
      data: {
        tenantId,
        branchId: branch.id,
        name: `2025-26 ${branchCode}`,
        startDate: new Date("2025-04-01"),
        endDate: new Date("2026-03-31"),
        isCurrent: true,
      },
    })
  );
  return { branch, cls, section, session };
}

describe("students — CRUD, RBAC, branch scope", () => {
  it("OWNER creates a student with auto-generated sequential admissionNo, then lists/gets/patches/deletes it", async () => {
    const tenant = await createTenant("students-crud-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["student.view", "student.edit", "student.delete"]);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, section } = await setupBranchWithClassAndSession(tenant.id, "A");

    const createRes = await request(app)
      .post("/api/v1/students")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        classId: cls.id,
        sectionId: section.id,
        firstName: "Aman",
        lastName: "Kumar",
        dob: "2015-05-01",
        gender: "M",
        address: "Patna, Bihar",
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.admissionNo).toBe("0001");
    const studentId = createRes.body.data.id as string;

    const listRes = await request(app)
      .get(`/api/v1/students?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((s: { id: string }) => s.id === studentId)).toBe(true);

    const getRes = await request(app)
      .get(`/api/v1/students/${studentId}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.firstName).toBe("Aman");

    const patchRes = await request(app)
      .patch(`/api/v1/students/${studentId}`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ rollNo: "12" });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.rollNo).toBe("12");

    const deleteRes = await request(app)
      .delete(`/api/v1/students/${studentId}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(deleteRes.status).toBe(204);

    const afterDelete = await request(app)
      .get(`/api/v1/students/${studentId}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(afterDelete.status).toBe(404);
  });

  it("rejects student creation when the branch has no current academic session", async () => {
    const tenant = await createTenant("students-nosession-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["student.edit"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const cls = await withTenant(tenant.id, (tx) =>
      tx.class.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "Class 7", order: 7 } })
    );
    const section = await withTenant(tenant.id, (tx) =>
      tx.section.create({ data: { tenantId: tenant.id, branchId: branch.id, classId: cls.id, name: "7-A" } })
    );

    const res = await request(app)
      .post("/api/v1/students")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        classId: cls.id,
        sectionId: section.id,
        firstName: "No",
        lastName: "Session",
        dob: "2015-05-01",
        gender: "F",
        address: "Patna",
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("denies TEACHER from mutating students but allows reads; enforces branch scope", async () => {
    const tenant = await createTenant("students-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["student.edit"]);
    await createRoleWithPermissions(tenant.id, "TEACHER", ["student.view"]);
    const owner = await ownerToken(tenant.id);
    const { branch: branchA, cls, section } = await setupBranchWithClassAndSession(tenant.id, "A");
    const { branch: branchB } = await setupBranchWithClassAndSession(tenant.id, "B");
    const teacherA = await teacherToken(tenant.id, branchA.id);

    const createRes = await request(app)
      .post("/api/v1/students")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branchA.id,
        classId: cls.id,
        sectionId: section.id,
        firstName: "Riya",
        lastName: "Singh",
        dob: "2014-01-01",
        gender: "F",
        address: "Patna",
      });
    expect(createRes.status).toBe(201);

    const teacherMutate = await request(app)
      .patch(`/api/v1/students/${createRes.body.data.id}`)
      .set("Authorization", `Bearer ${teacherA}`)
      .send({ rollNo: "1" });
    expect(teacherMutate.status).toBe(403);
    expect(teacherMutate.body.error.code).toBe("FORBIDDEN");

    const teacherReadOwnBranch = await request(app)
      .get(`/api/v1/students?branchId=${branchA.id}`)
      .set("Authorization", `Bearer ${teacherA}`);
    expect(teacherReadOwnBranch.status).toBe(200);

    const teacherReadOtherBranch = await request(app)
      .get(`/api/v1/students?branchId=${branchB.id}`)
      .set("Authorization", `Bearer ${teacherA}`);
    expect(teacherReadOtherBranch.status).toBe(403);
    expect(teacherReadOtherBranch.body.error.code).toBe("FORBIDDEN");
  });

  it("cross-tenant students are invisible even to an unscoped query", async () => {
    const tenantA = await createTenant("students-isolation-a");
    const tenantB = await createTenant("students-isolation-b");
    tenantIds.push(tenantA.id, tenantB.id);
    const { branch, cls, section, session } = await setupBranchWithClassAndSession(tenantA.id, "A");

    const student = await withTenant(tenantA.id, (tx) =>
      tx.student.create({
        data: {
          tenantId: tenantA.id,
          branchId: branch.id,
          admissionNo: "0001",
          firstName: "Iso",
          lastName: "Test",
          dob: new Date("2015-01-01"),
          gender: "M",
          address: "Patna",
        },
      })
    );
    await withTenant(tenantA.id, (tx) =>
      tx.enrollment.create({
        data: {
          tenantId: tenantA.id,
          branchId: branch.id,
          studentId: student.id,
          sessionId: session.id,
          classId: cls.id,
          sectionId: section.id,
        },
      })
    );

    const scoped = await withTenant(tenantB.id, (tx) => tx.student.findMany());
    expect(scoped).toHaveLength(0);

    const unscoped = await prisma.student.findMany({ where: { tenantId: tenantA.id } });
    expect(unscoped).toHaveLength(0);
  });
});

describe("students — bulk import (real .xlsx round trip via MinIO + worker)", () => {
  it("uploads a sheet, enqueues, and reports per-row success/error counts", async () => {
    const tenant = await createTenant("students-import-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["student.import"]);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, section } = await setupBranchWithClassAndSession(tenant.id, "A");

    const rows = [
      {
        className: cls.name,
        sectionName: section.name,
        firstName: "Valid",
        lastName: "Row",
        dob: "2015-06-15",
        gender: "M",
        address: "Patna",
      },
      {
        className: "No Such Class",
        sectionName: "No Such Section",
        firstName: "Bad",
        lastName: "Class",
        dob: "2015-06-15",
        gender: "F",
        address: "Patna",
      },
      {
        className: cls.name,
        sectionName: section.name,
        firstName: "",
        lastName: "MissingFirstName",
        dob: "2015-06-15",
        gender: "F",
        address: "Patna",
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, worksheet, "Students");
    const fileBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const fileKey = `imports/${tenant.id}/${branch.id}/test-import.xlsx`;
    const uploadUrl = await getUploadUrl(
      fileKey,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    const putRes = await fetch(uploadUrl, { method: "PUT", body: fileBuffer });
    expect(putRes.status).toBe(200);

    const importRes = await request(app)
      .post("/api/v1/students/import")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, fileKey });
    expect(importRes.status).toBe(202);
    const jobId = importRes.body.data.jobId as string;

    const start = Date.now();
    let status: { state?: string; returnValue?: { succeeded: number; failed: number; total: number } } = {};
    while (Date.now() - start < 10000) {
      const res = await request(app).get(`/api/v1/jobs/${jobId}`);
      status = res.body.data ?? {};
      if (status.state === "failed" || (status.state === "completed" && status.returnValue != null)) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    expect(status.state).toBe("completed");
    expect(status.returnValue?.total).toBe(3);
    expect(status.returnValue?.succeeded).toBe(1);
    expect(status.returnValue?.failed).toBe(2);
  }, 15000);
});

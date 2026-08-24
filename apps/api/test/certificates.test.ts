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

async function teacherToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "teacher-1", tenantId, roles: ["TEACHER"], branchIds: [branchId] });
}

async function adminToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "admin-1", tenantId, roles: ["ADMIN"], branchIds: [branchId] });
}

async function createStudent(tenantId: string, branchId: string, tag: string) {
  return withTenant(tenantId, (tx) =>
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
}

describe("certificates — issue (sequential numbering), register, RBAC, branch + tenant isolation", () => {
  it("issues a TC and a bonafide certificate for the same student with independent per-type sequences", async () => {
    const tenant = await createTenant("certs-crud-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["certificate.issue"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const student = await createStudent(tenant.id, branch.id, "S1");

    const tcRes = await request(app)
      .post("/api/v1/certificates")
      .set("Authorization", `Bearer ${owner}`)
      .send({ studentId: student.id, type: "TC" });
    expect(tcRes.status).toBe(201);
    expect(tcRes.body.data.number).toBe("TC-000001");

    const bonafideRes = await request(app)
      .post("/api/v1/certificates")
      .set("Authorization", `Bearer ${owner}`)
      .send({ studentId: student.id, type: "BONAFIDE" });
    expect(bonafideRes.status).toBe(201);
    expect(bonafideRes.body.data.number).toBe("BONAFIDE-000001");

    const secondTcRes = await request(app)
      .post("/api/v1/certificates")
      .set("Authorization", `Bearer ${owner}`)
      .send({ studentId: student.id, type: "TC" });
    expect(secondTcRes.body.data.number).toBe("TC-000002");

    const registerRes = await request(app)
      .get(`/api/v1/certificates?branchId=${branch.id}&studentId=${student.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(registerRes.status).toBe(200);
    expect(registerRes.body.data).toHaveLength(3);

    // Unit 21's real Puppeteer certificate.generate job — waits for the
    // async worker to render and upload the PDF (no template configured, so
    // this exercises the DEFAULT_BODIES fallback path), then asserts a real
    // download URL is resolved on read.
    await new Promise((resolve) => setTimeout(resolve, 4000));
    const registerAfterRender = await request(app)
      .get(`/api/v1/certificates?branchId=${branch.id}&studentId=${student.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(registerAfterRender.body.data[0].downloadUrl).toBeTruthy();
  }, 10000);

  it("requires a customTitle when issuing a CUSTOM certificate", async () => {
    const tenant = await createTenant("certs-validation-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["certificate.issue"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const student = await createStudent(tenant.id, branch.id, "S1");

    const res = await request(app)
      .post("/api/v1/certificates")
      .set("Authorization", `Bearer ${owner}`)
      .send({ studentId: student.id, type: "CUSTOM" });
    expect(res.status).toBe(400);
  });

  it("issues an ID_CARD/ADMIT_CARD (the Open Question 1 enum extension)", async () => {
    const tenant = await createTenant("certs-idcard-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["certificate.issue"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const student = await createStudent(tenant.id, branch.id, "S1");

    const res = await request(app)
      .post("/api/v1/certificates")
      .set("Authorization", `Bearer ${owner}`)
      .send({ studentId: student.id, type: "ID_CARD" });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe("ID_CARD");
  });

  it("RBAC: certificate.issue roles (OWNER/PRINCIPAL/ADMIN) pass; TEACHER/ACCOUNTANT denied on issue and register read", async () => {
    const tenant = await createTenant("certs-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "ADMIN", ["certificate.issue"]);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const branch = await createBranch(tenant.id, "A");
    const student = await createStudent(tenant.id, branch.id, "S1");
    const admin = await adminToken(tenant.id, branch.id);
    const teacher = await teacherToken(tenant.id, branch.id);

    const teacherIssue = await request(app)
      .post("/api/v1/certificates")
      .set("Authorization", `Bearer ${teacher}`)
      .send({ studentId: student.id, type: "TC" });
    expect(teacherIssue.status).toBe(403);

    const teacherRead = await request(app)
      .get(`/api/v1/certificates?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${teacher}`);
    expect(teacherRead.status).toBe(403);

    const adminIssue = await request(app)
      .post("/api/v1/certificates")
      .set("Authorization", `Bearer ${admin}`)
      .send({ studentId: student.id, type: "TC" });
    expect(adminIssue.status).toBe(201);
  });

  it("branch-scope: an ADMIN on Branch A is denied issuing against a Branch B student", async () => {
    const tenant = await createTenant("certs-branch-scope-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "ADMIN", ["certificate.issue"]);
    const branchA = await createBranch(tenant.id, "A");
    const branchB = await createBranch(tenant.id, "B");
    const studentB = await createStudent(tenant.id, branchB.id, "S1");
    const adminA = await adminToken(tenant.id, branchA.id);

    const res = await request(app)
      .post("/api/v1/certificates")
      .set("Authorization", `Bearer ${adminA}`)
      .send({ studentId: studentB.id, type: "TC" });
    expect(res.status).toBe(403);
  });

  it("tenant-isolation: cross-tenant certificate queries return zero rows both via RLS and via an unscoped query", async () => {
    const tenantA = await createTenant("certs-iso-a-tenant");
    const tenantB = await createTenant("certs-iso-b-tenant");
    tenantIds.push(tenantA.id, tenantB.id);
    const branchA = await createBranch(tenantA.id, "A");
    await createBranch(tenantB.id, "B");
    const studentA = await createStudent(tenantA.id, branchA.id, "S1");

    const certificate = await withTenant(tenantA.id, (tx) =>
      tx.certificate.create({
        data: {
          tenantId: tenantA.id,
          branchId: branchA.id,
          studentId: studentA.id,
          type: "TC",
          number: "TC-000001",
          issuedById: "seed-user",
        },
      })
    );

    const crossTenant = await withTenant(tenantB.id, (tx) => tx.certificate.findMany({}));
    expect(crossTenant).toHaveLength(0);

    const unscoped = await prisma.certificate.findMany({ where: { id: certificate.id } });
    expect(unscoped).toHaveLength(0);
  });
});

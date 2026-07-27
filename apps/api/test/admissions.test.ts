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

async function teacherToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "teacher-1", tenantId, roles: ["TEACHER"], branchIds: [branchId] });
}

async function accountantToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "accountant-1", tenantId, roles: ["ACCOUNTANT"], branchIds: [branchId] });
}

async function adminToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "admin-1", tenantId, roles: ["ADMIN"], branchIds: [branchId] });
}

async function setupBranchWithClassSectionSession(tenantId: string, code: string) {
  const branch = await createBranch(tenantId, code);
  const cls = await withTenant(tenantId, (tx) =>
    tx.class.create({ data: { tenantId, branchId: branch.id, name: `Class ${code}`, order: 1 } })
  );
  const section = await withTenant(tenantId, (tx) =>
    tx.section.create({ data: { tenantId, branchId: branch.id, classId: cls.id, name: `${code}-A` } })
  );
  await withTenant(tenantId, (tx) =>
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
  return { branch, cls, section };
}

describe("admissions — enquiry -> application -> convert-to-student", () => {
  it("full pipeline: create enquiry, create application, convert to a real enrolled student", async () => {
    const tenant = await createTenant("admissions-pipeline-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["admission.manage"]);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, section } = await setupBranchWithClassSectionSession(tenant.id, "A");

    const enquiryRes = await request(app)
      .post("/api/v1/enquiries")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        childName: "Aarav Kumar",
        guardianName: "Ravi Kumar",
        phone: "+919812340001",
        source: "walk-in",
      });
    expect(enquiryRes.status).toBe(201);
    const enquiryId = enquiryRes.body.data.id as string;

    const stageRes = await request(app)
      .patch(`/api/v1/enquiries/${enquiryId}`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ stage: "APPLIED" });
    expect(stageRes.status).toBe(200);
    expect(stageRes.body.data.stage).toBe("APPLIED");

    const applicationRes = await request(app)
      .post("/api/v1/applications")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        enquiryId,
        classAppliedId: cls.id,
        formData: {
          childName: "Aarav Kumar",
          dob: "2016-03-10",
          guardianName: "Ravi Kumar",
          guardianPhone: "+919812340001",
          priorSchool: "ABC Play School",
        },
        status: "SUBMITTED",
      });
    expect(applicationRes.status).toBe(201);
    const applicationId = applicationRes.body.data.id as string;

    const convertRes = await request(app)
      .post(`/api/v1/applications/${applicationId}/convert`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ sectionId: section.id });
    expect(convertRes.status).toBe(200);
    expect(convertRes.body.data.status).toBe("CONFIRMED");
    const studentId = convertRes.body.data.studentId as string;
    expect(studentId).toBeTypeOf("string");

    const enrollment = await withTenant(tenant.id, (tx) =>
      tx.enrollment.findFirst({ where: { studentId, classId: cls.id, sectionId: section.id } })
    );
    expect(enrollment).not.toBeNull();

    const reconvert = await request(app)
      .post(`/api/v1/applications/${applicationId}/convert`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ sectionId: section.id });
    expect(reconvert.status).toBe(409);
    expect(reconvert.body.error.code).toBe("CONFLICT");
  });

  it("cross-tenant enquiries/applications are invisible even to an unscoped query", async () => {
    const tenantA = await createTenant("admissions-isolation-a");
    const tenantB = await createTenant("admissions-isolation-b");
    tenantIds.push(tenantA.id, tenantB.id);
    const { branch, cls } = await setupBranchWithClassSectionSession(tenantA.id, "A");

    const enquiry = await withTenant(tenantA.id, (tx) =>
      tx.enquiry.create({
        data: {
          tenantId: tenantA.id,
          branchId: branch.id,
          childName: "Iso Child",
          guardianName: "Iso Guardian",
          phone: "+919812340099",
          source: "phone",
        },
      })
    );
    await withTenant(tenantA.id, (tx) =>
      tx.application.create({
        data: {
          tenantId: tenantA.id,
          branchId: branch.id,
          enquiryId: enquiry.id,
          classAppliedId: cls.id,
          formData: { childName: "Iso Child" },
          status: "DRAFT",
        },
      })
    );

    const scopedEnquiries = await withTenant(tenantB.id, (tx) => tx.enquiry.findMany());
    const scopedApplications = await withTenant(tenantB.id, (tx) => tx.application.findMany());
    expect(scopedEnquiries).toHaveLength(0);
    expect(scopedApplications).toHaveLength(0);

    const unscopedEnquiries = await prisma.enquiry.findMany({ where: { tenantId: tenantA.id } });
    const unscopedApplications = await prisma.application.findMany({ where: { tenantId: tenantA.id } });
    expect(unscopedEnquiries).toHaveLength(0);
    expect(unscopedApplications).toHaveLength(0);
  });

  it("RBAC: admission.manage roles pass; TEACHER/ACCOUNTANT get 403 FORBIDDEN", async () => {
    const tenant = await createTenant("admissions-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "ADMIN", ["admission.manage"]);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    await createRoleWithPermissions(tenant.id, "ACCOUNTANT", []);
    const branch = await createBranch(tenant.id, "A");
    const admin = await adminToken(tenant.id, branch.id);
    const teacher = await teacherToken(tenant.id, branch.id);
    const accountant = await accountantToken(tenant.id, branch.id);

    const adminCreate = await request(app)
      .post("/api/v1/enquiries")
      .set("Authorization", `Bearer ${admin}`)
      .send({
        branchId: branch.id,
        childName: "RBAC Child",
        guardianName: "RBAC Guardian",
        phone: "+919812340002",
        source: "referral",
      });
    expect(adminCreate.status).toBe(201);

    const teacherCreate = await request(app)
      .post("/api/v1/enquiries")
      .set("Authorization", `Bearer ${teacher}`)
      .send({
        branchId: branch.id,
        childName: "Denied Child",
        guardianName: "Denied Guardian",
        phone: "+919812340003",
        source: "referral",
      });
    expect(teacherCreate.status).toBe(403);
    expect(teacherCreate.body.error.code).toBe("FORBIDDEN");

    const accountantCreate = await request(app)
      .post("/api/v1/enquiries")
      .set("Authorization", `Bearer ${accountant}`)
      .send({
        branchId: branch.id,
        childName: "Denied Child 2",
        guardianName: "Denied Guardian 2",
        phone: "+919812340004",
        source: "referral",
      });
    expect(accountantCreate.status).toBe(403);
    expect(accountantCreate.body.error.code).toBe("FORBIDDEN");
  });

  it("branch-scope: an ADMIN on Branch A is denied Branch B's enquiries", async () => {
    const tenant = await createTenant("admissions-branchscope-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "ADMIN", ["admission.manage"]);
    const branchA = await createBranch(tenant.id, "A");
    const branchB = await createBranch(tenant.id, "B");
    const adminA = await adminToken(tenant.id, branchA.id);

    const crossBranch = await request(app)
      .post("/api/v1/enquiries")
      .set("Authorization", `Bearer ${adminA}`)
      .send({
        branchId: branchB.id,
        childName: "Cross Branch Child",
        guardianName: "Cross Branch Guardian",
        phone: "+919812340005",
        source: "referral",
      });
    expect(crossBranch.status).toBe(403);
    expect(crossBranch.body.error.code).toBe("FORBIDDEN");
  });
});

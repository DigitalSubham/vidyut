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

async function accountantToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "accountant-1", tenantId, roles: ["ACCOUNTANT"], branchIds: [branchId] });
}

async function principalToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "principal-1", tenantId, roles: ["PRINCIPAL"], branchIds: [branchId] });
}

async function teacherToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "teacher-1", tenantId, roles: ["TEACHER"], branchIds: [branchId] });
}

async function setupBranchWithClassAndSession(tenantId: string, code: string) {
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
  return { branch, cls, session };
}

async function enrollStudent(tenantId: string, branchId: string, classId: string, sessionId: string, tag: string) {
  const section = await withTenant(tenantId, (tx) =>
    tx.section.create({ data: { tenantId, branchId, classId, name: `${tag}-A` } })
  );
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
    tx.enrollment.create({
      data: { tenantId, branchId, studentId: student.id, sessionId, classId, sectionId: section.id },
    })
  );
  return student;
}

describe("fee setup — heads, structures, items, fine rules", () => {
  it("OWNER creates a fee head + structure + item + fine rule; PRINCIPAL denied mutation", async () => {
    const tenant = await createTenant("fees-setup-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["fee.setup", "fee.view"]);
    await createRoleWithPermissions(tenant.id, "PRINCIPAL", ["fee.view"]);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, session } = await setupBranchWithClassAndSession(tenant.id, "A");

    const headRes = await request(app)
      .post("/api/v1/fee-heads")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, name: "Tuition", type: "TUITION" });
    expect(headRes.status).toBe(201);
    const feeHeadId = headRes.body.data.id as string;

    const structureRes = await request(app)
      .post("/api/v1/fee-structures")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, sessionId: session.id, classId: cls.id, name: "Class A Structure" });
    expect(structureRes.status).toBe(201);
    const structureId = structureRes.body.data.id as string;

    const itemRes = await request(app)
      .post(`/api/v1/fee-structures/${structureId}/items`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ feeHeadId, amount: 500000, frequency: "MONTHLY", dueDayOfMonth: 5 });
    expect(itemRes.status).toBe(201);
    const itemId = itemRes.body.data.id as string;

    const fineRes = await request(app)
      .post(`/api/v1/fee-structures/${structureId}/items/${itemId}/fine-rule`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ graceDays: 5, isPercent: false, value: 5000 });
    expect(fineRes.status).toBe(201);

    const principal = await principalToken(tenant.id, branch.id);
    const principalMutate = await request(app)
      .post("/api/v1/fee-heads")
      .set("Authorization", `Bearer ${principal}`)
      .send({ branchId: branch.id, name: "Transport", type: "TRANSPORT" });
    expect(principalMutate.status).toBe(403);
    expect(principalMutate.body.error.code).toBe("FORBIDDEN");

    const principalRead = await request(app)
      .get(`/api/v1/fee-structures/${structureId}/items`)
      .set("Authorization", `Bearer ${principal}`);
    expect(principalRead.status).toBe(200);
    expect(principalRead.body.data).toHaveLength(1);
    expect(principalRead.body.data[0].fineRule.graceDays).toBe(5);
  });

  it("bulk-assigns a fee structure to every enrolled student in a class, without duplicating on re-run", async () => {
    const tenant = await createTenant("fees-bulkassign-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["fee.setup", "fee.view"]);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, session } = await setupBranchWithClassAndSession(tenant.id, "A");
    await enrollStudent(tenant.id, branch.id, cls.id, session.id, "S1");
    await enrollStudent(tenant.id, branch.id, cls.id, session.id, "S2");

    const structure = await withTenant(tenant.id, (tx) =>
      tx.feeStructure.create({
        data: { tenantId: tenant.id, branchId: branch.id, sessionId: session.id, classId: cls.id, name: "Bulk Structure" },
      })
    );

    const firstAssign = await request(app)
      .post(`/api/v1/fee-structures/${structure.id}/assign`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ classId: cls.id });
    expect(firstAssign.status).toBe(200);
    expect(firstAssign.body.data.assigned).toBe(2);

    const secondAssign = await request(app)
      .post(`/api/v1/fee-structures/${structure.id}/assign`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ classId: cls.id });
    expect(secondAssign.status).toBe(200);
    expect(secondAssign.body.data.assigned).toBe(0);

    const assignments = await withTenant(tenant.id, (tx) =>
      tx.feeAssignment.findMany({ where: { structureId: structure.id } })
    );
    expect(assignments).toHaveLength(2);
  });

  it("cross-tenant fee heads/structures/concessions are invisible even to an unscoped query", async () => {
    const tenantA = await createTenant("fees-isolation-a");
    const tenantB = await createTenant("fees-isolation-b");
    tenantIds.push(tenantA.id, tenantB.id);
    const branch = await createBranch(tenantA.id, "A");

    await withTenant(tenantA.id, (tx) =>
      tx.feeHead.create({ data: { tenantId: tenantA.id, branchId: branch.id, name: "Iso Head", type: "MISC" } })
    );

    const scoped = await withTenant(tenantB.id, (tx) => tx.feeHead.findMany());
    expect(scoped).toHaveLength(0);

    const unscoped = await prisma.feeHead.findMany({ where: { tenantId: tenantA.id } });
    expect(unscoped).toHaveLength(0);
  });

  it("branch-scope: an ACCOUNTANT on Branch A is denied Branch B's fee structures", async () => {
    const tenant = await createTenant("fees-branchscope-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "ACCOUNTANT", ["fee.setup"]);
    const branchA = await createBranch(tenant.id, "A");
    const branchB = await createBranch(tenant.id, "B");
    const accountantA = await accountantToken(tenant.id, branchA.id);

    const crossBranch = await request(app)
      .post("/api/v1/fee-structures")
      .set("Authorization", `Bearer ${accountantA}`)
      .send({ branchId: branchB.id, sessionId: "irrelevant", name: "Cross Branch Structure" });
    expect(crossBranch.status).toBe(403);
    expect(crossBranch.body.error.code).toBe("FORBIDDEN");
  });
});

describe("concessions — apply -> approve/reject", () => {
  it("applies a concession as PENDING, then approves it (approverId set)", async () => {
    const tenant = await createTenant("fees-concession-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["fee.setup", "fee.concession.approve", "fee.view"]);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, session } = await setupBranchWithClassAndSession(tenant.id, "A");
    const student = await enrollStudent(tenant.id, branch.id, cls.id, session.id, "C1");

    const createRes = await request(app)
      .post("/api/v1/concessions")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, studentId: student.id, type: "SIBLING", value: 10, isPercent: true });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe("PENDING");
    const concessionId = createRes.body.data.id as string;

    const teacher = await teacherToken(tenant.id, branch.id);
    const teacherDecide = await request(app)
      .patch(`/api/v1/concessions/${concessionId}/decide`)
      .set("Authorization", `Bearer ${teacher}`)
      .send({ status: "APPROVED" });
    expect(teacherDecide.status).toBe(403);
    expect(teacherDecide.body.error.code).toBe("FORBIDDEN");

    const decideRes = await request(app)
      .patch(`/api/v1/concessions/${concessionId}/decide`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ status: "APPROVED" });
    expect(decideRes.status).toBe(200);
    expect(decideRes.body.data.status).toBe("APPROVED");
    expect(decideRes.body.data.approvedById).toBeTypeOf("string");

    const redecide = await request(app)
      .patch(`/api/v1/concessions/${concessionId}/decide`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ status: "REJECTED" });
    expect(redecide.status).toBe(409);
    expect(redecide.body.error.code).toBe("CONFLICT");
  });
});

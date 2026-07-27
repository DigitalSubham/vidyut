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

async function principalToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "principal-1", tenantId, roles: ["PRINCIPAL"], branchIds: [branchId] });
}

async function setupStudent(tenantId: string, branchCode: string) {
  const branch = await createBranch(tenantId, branchCode);
  const cls = await withTenant(tenantId, (tx) =>
    tx.class.create({ data: { tenantId, branchId: branch.id, name: `Class ${branchCode}`, order: 1 } })
  );
  const section = await withTenant(tenantId, (tx) =>
    tx.section.create({ data: { tenantId, branchId: branch.id, classId: cls.id, name: `${branchCode}-A` } })
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
  const student = await withTenant(tenantId, (tx) =>
    tx.student.create({
      data: {
        tenantId,
        branchId: branch.id,
        admissionNo: `S-${branchCode}`,
        firstName: "Child",
        lastName: branchCode,
        dob: new Date("2015-01-01"),
        gender: "M",
        address: "Patna",
      },
    })
  );
  await withTenant(tenantId, (tx) =>
    tx.enrollment.create({
      data: {
        tenantId,
        branchId: branch.id,
        studentId: student.id,
        sessionId: session.id,
        classId: cls.id,
        sectionId: section.id,
      },
    })
  );
  return { branch, cls, section, student };
}

describe("guardians — CRUD + RBAC", () => {
  it("OWNER creates/lists/gets/patches a guardian; TEACHER is denied mutation", async () => {
    const tenant = await createTenant("guardians-crud-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["guardian.manage"]);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const owner = await ownerToken(tenant.id);
    const teacher = await teacherToken(tenant.id, "irrelevant-branch");

    const createRes = await request(app)
      .post("/api/v1/guardians")
      .set("Authorization", `Bearer ${owner}`)
      .send({ name: "Ramesh Kumar", relation: "FATHER", phone: "+919812340001" });
    expect(createRes.status).toBe(201);
    const guardianId = createRes.body.data.id as string;

    const teacherCreate = await request(app)
      .post("/api/v1/guardians")
      .set("Authorization", `Bearer ${teacher}`)
      .send({ name: "Someone", relation: "MOTHER", phone: "+919812340002" });
    expect(teacherCreate.status).toBe(403);
    expect(teacherCreate.body.error.code).toBe("FORBIDDEN");

    const listRes = await request(app)
      .get("/api/v1/guardians")
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((g: { id: string }) => g.id === guardianId)).toBe(true);

    const patchRes = await request(app)
      .patch(`/api/v1/guardians/${guardianId}`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ occupation: "Farmer" });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.occupation).toBe("Farmer");
  });

  it("links and unlinks a guardian to a student, enforcing branch scope on link", async () => {
    const tenant = await createTenant("guardians-link-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["guardian.manage"]);
    await createRoleWithPermissions(tenant.id, "PRINCIPAL", ["guardian.manage"]);
    const owner = await ownerToken(tenant.id);
    const { branch: branchA, student } = await setupStudent(tenant.id, "A");
    const { branch: branchB } = await setupStudent(tenant.id, "B");
    const principalB = await principalToken(tenant.id, branchB.id);

    const guardian = await withTenant(tenant.id, (tx) =>
      tx.guardian.create({ data: { tenantId: tenant.id, name: "Link Guardian", relation: "MOTHER", phone: "+919812340010" } })
    );

    const crossBranchLink = await request(app)
      .post(`/api/v1/students/${student.id}/guardians`)
      .set("Authorization", `Bearer ${principalB}`)
      .send({ guardianId: guardian.id, isPrimary: true, canPay: true });
    expect(crossBranchLink.status).toBe(403);
    expect(crossBranchLink.body.error.code).toBe("FORBIDDEN");

    const linkRes = await request(app)
      .post(`/api/v1/students/${student.id}/guardians`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ guardianId: guardian.id, isPrimary: true, canPay: true });
    expect(linkRes.status).toBe(201);

    const unlinkRes = await request(app)
      .delete(`/api/v1/students/${student.id}/guardians/${guardian.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(unlinkRes.status).toBe(204);

    const remaining = await withTenant(tenant.id, (tx) =>
      tx.studentGuardian.findMany({ where: { studentId: student.id } })
    );
    expect(remaining).toHaveLength(0);
    void branchA;
  });

  it("cross-tenant guardians are invisible even to an unscoped query", async () => {
    const tenantA = await createTenant("guardians-isolation-a");
    const tenantB = await createTenant("guardians-isolation-b");
    tenantIds.push(tenantA.id, tenantB.id);

    await withTenant(tenantA.id, (tx) =>
      tx.guardian.create({
        data: { tenantId: tenantA.id, name: "Iso Guardian", relation: "FATHER", phone: "+919812340099" },
      })
    );

    const scoped = await withTenant(tenantB.id, (tx) => tx.guardian.findMany());
    expect(scoped).toHaveLength(0);

    const unscoped = await prisma.guardian.findMany({ where: { tenantId: tenantA.id } });
    expect(unscoped).toHaveLength(0);
  });
});

describe("guardians — invite + self-scope resolver", () => {
  it("invites a guardian, creating a working PARENT login (OTP request/verify succeeds)", async () => {
    const tenant = await createTenant("guardians-invite-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["guardian.manage"]);
    await createRoleWithPermissions(tenant.id, "PARENT", []);
    const owner = await ownerToken(tenant.id);
    const phone = "+919812340020";

    const guardian = await withTenant(tenant.id, (tx) =>
      tx.guardian.create({ data: { tenantId: tenant.id, name: "Invitee", relation: "FATHER", phone } })
    );

    const inviteRes = await request(app)
      .post(`/api/v1/guardians/${guardian.id}/invite`)
      .set("Authorization", `Bearer ${owner}`);
    expect(inviteRes.status).toBe(200);
    expect(inviteRes.body.data.devCode).toBeTypeOf("string");

    const updatedGuardian = await withTenant(tenant.id, (tx) => tx.guardian.findUnique({ where: { id: guardian.id } }));
    expect(updatedGuardian?.userId).toBeTypeOf("string");

    const verifyRes = await request(app)
      .post("/api/v1/auth/otp/verify")
      .send({ tenantSlug: tenant.slug, phone, code: inviteRes.body.data.devCode });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.accessToken).toBeTypeOf("string");
  });

  it("GET /guardians/me/children returns exactly a parent's own linked children", async () => {
    const tenant = await createTenant("guardians-mychildren-tenant");
    tenantIds.push(tenant.id);
    const { student: studentA } = await setupStudent(tenant.id, "A");
    const { student: studentB } = await setupStudent(tenant.id, "B");

    const parentUser = await withTenant(tenant.id, (tx) =>
      tx.user.create({ data: { tenantId: tenant.id, name: "Parent One", phone: "+919812340030", status: "ACTIVE" } })
    );
    const guardian = await withTenant(tenant.id, (tx) =>
      tx.guardian.create({
        data: { tenantId: tenant.id, userId: parentUser.id, name: "Parent One", relation: "FATHER", phone: "+919812340030" },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.studentGuardian.create({ data: { tenantId: tenant.id, studentId: studentA.id, guardianId: guardian.id, isPrimary: true, canPay: true } })
    );

    const otherParentUser = await withTenant(tenant.id, (tx) =>
      tx.user.create({ data: { tenantId: tenant.id, name: "Parent Two", phone: "+919812340031", status: "ACTIVE" } })
    );
    const otherGuardian = await withTenant(tenant.id, (tx) =>
      tx.guardian.create({
        data: { tenantId: tenant.id, userId: otherParentUser.id, name: "Parent Two", relation: "MOTHER", phone: "+919812340031" },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.studentGuardian.create({ data: { tenantId: tenant.id, studentId: studentB.id, guardianId: otherGuardian.id, isPrimary: true, canPay: true } })
    );

    const parentToken = await signAccessToken({ sub: parentUser.id, tenantId: tenant.id, roles: ["PARENT"], branchIds: [] });
    const res = await request(app)
      .get("/api/v1/guardians/me/children")
      .set("Authorization", `Bearer ${parentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(studentA.id);
    expect(res.body.data[0].id).not.toBe(studentB.id);

    const unlinkedParentToken = await signAccessToken({
      sub: "no-such-guardian-user",
      tenantId: tenant.id,
      roles: ["PARENT"],
      branchIds: [],
    });
    const emptyRes = await request(app)
      .get("/api/v1/guardians/me/children")
      .set("Authorization", `Bearer ${unlinkedParentToken}`);
    expect(emptyRes.status).toBe(200);
    expect(emptyRes.body.data).toHaveLength(0);
  });
});

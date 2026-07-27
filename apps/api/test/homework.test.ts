import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { prisma, withTenant } from "@vidyut/db";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/core/auth/jwt";
import { cleanupTenant, createBranch, createRoleWithPermissions, createStaffUser, createTenant } from "./helpers";

const app = createApp();
const tenantIds: string[] = [];

afterAll(async () => {
  for (const id of tenantIds) {
    await cleanupTenant(id);
  }
  await prisma.$disconnect();
});

async function principalToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "principal-1", tenantId, roles: ["PRINCIPAL"], branchIds: [branchId] });
}

async function ownerToken(tenantId: string) {
  return signAccessToken({ sub: "owner-1", tenantId, roles: ["OWNER"], branchIds: [] });
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
  return { branch, cls, subject, section };
}

async function createTeacherWithAssignment(
  tenantId: string,
  branchId: string,
  sectionId: string,
  subjectId: string,
  tag: string
) {
  const existingRole = await withTenant(tenantId, (tx) => tx.role.findFirst({ where: { key: "TEACHER" } }));
  const role = existingRole ?? (await createRoleWithPermissions(tenantId, "TEACHER", ["homework.manage"]));
  const user = await createStaffUser(tenantId, {
    email: `teacher-${tag}@example.com`,
    password: "Passw0rd!",
    roleId: role.id,
    branchId,
  });
  const staff = await withTenant(tenantId, (tx) =>
    tx.staff.create({
      data: {
        tenantId,
        branchId,
        userId: user.id,
        employeeNo: `EMP-${tag}`,
        designation: "Teacher",
        type: "TEACHING",
        joinedAt: new Date("2020-01-01"),
      },
    })
  );
  const session = await withTenant(tenantId, (tx) =>
    tx.academicSession.create({
      data: {
        tenantId,
        branchId,
        name: `2025-26 ${tag}`,
        startDate: new Date("2025-04-01"),
        endDate: new Date("2026-03-31"),
        isCurrent: true,
      },
    })
  );
  await withTenant(tenantId, (tx) =>
    tx.teacherAssignment.create({
      data: { tenantId, branchId, sessionId: session.id, staffId: staff.id, subjectId, sectionId },
    })
  );
  const token = await signAccessToken({ sub: user.id, tenantId, roles: ["TEACHER"], branchIds: [branchId] });
  return { user, staff, token };
}

describe("homework — CRUD, TEACHER section-scoping, RBAC, branch + tenant isolation", () => {
  it("a section-assigned TEACHER can create, list, patch and delete homework", async () => {
    const tenant = await createTenant("homework-crud-tenant");
    tenantIds.push(tenant.id);
    const { branch, subject, section } = await setup(tenant.id, "A");
    const { token } = await createTeacherWithAssignment(tenant.id, branch.id, section.id, subject.id, "A");

    const createRes = await request(app)
      .post("/api/v1/homework")
      .set("Authorization", `Bearer ${token}`)
      .send({
        branchId: branch.id,
        sectionId: section.id,
        subjectId: subject.id,
        title: "Chapter 3 exercises",
        description: "Do questions 1-10",
        dueDate: "2025-07-01",
      });
    expect(createRes.status).toBe(201);
    const id = createRes.body.data.id as string;

    const listRes = await request(app)
      .get(`/api/v1/homework?sectionId=${section.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const patchRes = await request(app)
      .patch(`/api/v1/homework/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Chapter 3 exercises (revised)" });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.title).toBe("Chapter 3 exercises (revised)");

    const deleteRes = await request(app)
      .delete(`/api/v1/homework/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(deleteRes.status).toBe(204);
  });

  it("denies a TEACHER not assigned to the section, allows a PRINCIPAL regardless of assignment", async () => {
    const tenant = await createTenant("homework-scope-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "PRINCIPAL", ["homework.manage"]);
    const { branch, subject, section } = await setup(tenant.id, "A");
    const otherSection = await withTenant(tenant.id, (tx) =>
      tx.section.create({ data: { tenantId: tenant.id, branchId: branch.id, classId: section.classId, name: "A-B" } })
    );
    const { token: unassignedTeacherToken } = await createTeacherWithAssignment(
      tenant.id,
      branch.id,
      otherSection.id,
      subject.id,
      "A"
    );
    const principal = await principalToken(tenant.id, branch.id);

    const deniedRes = await request(app)
      .post("/api/v1/homework")
      .set("Authorization", `Bearer ${unassignedTeacherToken}`)
      .send({
        branchId: branch.id,
        sectionId: section.id,
        subjectId: subject.id,
        title: "Denied",
        description: "Denied",
        dueDate: "2025-07-01",
      });
    expect(deniedRes.status).toBe(403);

    const principalRes = await request(app)
      .post("/api/v1/homework")
      .set("Authorization", `Bearer ${principal}`)
      .send({
        branchId: branch.id,
        sectionId: section.id,
        subjectId: subject.id,
        title: "Allowed",
        description: "Allowed",
        dueDate: "2025-07-01",
      });
    expect(principalRes.status).toBe(201);
  });

  it("RBAC: homework.manage is PRINCIPAL/TEACHER only — OWNER/ADMIN/ACCOUNTANT denied; reads open to any authenticated staff role", async () => {
    const tenant = await createTenant("homework-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", []);
    const { branch, subject, section } = await setup(tenant.id, "A");
    const owner = await ownerToken(tenant.id);

    const ownerCreate = await request(app)
      .post("/api/v1/homework")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        sectionId: section.id,
        subjectId: subject.id,
        title: "Denied",
        description: "Denied",
        dueDate: "2025-07-01",
      });
    expect(ownerCreate.status).toBe(403);

    const ownerRead = await request(app)
      .get(`/api/v1/homework?sectionId=${section.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(ownerRead.status).toBe(200);
  });

  it("branch-scope: a TEACHER on Branch A is denied Branch B's homework", async () => {
    const tenant = await createTenant("homework-branch-scope-tenant");
    tenantIds.push(tenant.id);
    const { branch: branchA, subject: subjectA, section: sectionA } = await setup(tenant.id, "A");
    const { branch: branchB, subject: subjectB, section: sectionB } = await setup(tenant.id, "B");
    const { token } = await createTeacherWithAssignment(tenant.id, branchA.id, sectionA.id, subjectA.id, "A");

    const res = await request(app)
      .post("/api/v1/homework")
      .set("Authorization", `Bearer ${token}`)
      .send({
        branchId: branchB.id,
        sectionId: sectionB.id,
        subjectId: subjectB.id,
        title: "Denied",
        description: "Denied",
        dueDate: "2025-07-01",
      });
    expect(res.status).toBe(403);
  });

  it("tenant-isolation: cross-tenant homework queries return zero rows both via RLS and via an unscoped query", async () => {
    const tenantA = await createTenant("homework-iso-a-tenant");
    const tenantB = await createTenant("homework-iso-b-tenant");
    tenantIds.push(tenantA.id, tenantB.id);
    const { branch, subject, section } = await setup(tenantA.id, "A");
    await setup(tenantB.id, "B");

    const homework = await withTenant(tenantA.id, (tx) =>
      tx.homework.create({
        data: {
          tenantId: tenantA.id,
          branchId: branch.id,
          sectionId: section.id,
          subjectId: subject.id,
          title: "T",
          description: "D",
          dueDate: new Date("2025-07-01"),
          createdById: "seed-user",
        },
      })
    );

    const crossTenant = await withTenant(tenantB.id, (tx) => tx.homework.findMany({}));
    expect(crossTenant).toHaveLength(0);

    const unscoped = await prisma.homework.findMany({ where: { id: homework.id } });
    expect(unscoped).toHaveLength(0);
  });
});

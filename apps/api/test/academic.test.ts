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

describe("academic structure — classes/sections/subjects/sessions", () => {
  it("OWNER can create and list classes; TEACHER can read but not mutate", async () => {
    const tenant = await createTenant("academic-crud-tenant");
    tenantIds.push(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    await createRoleWithPermissions(tenant.id, "OWNER", ["class.manage", "subject.manage", "session.manage"]);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);

    const owner = await ownerToken(tenant.id);
    const teacher = await teacherToken(tenant.id, branch.id);

    const createRes = await request(app)
      .post("/api/v1/academic/classes")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, name: "Class 8", order: 8 });
    expect(createRes.status).toBe(201);
    const classId = createRes.body.data.id as string;

    const teacherCreate = await request(app)
      .post("/api/v1/academic/classes")
      .set("Authorization", `Bearer ${teacher}`)
      .send({ branchId: branch.id, name: "Class 9", order: 9 });
    expect(teacherCreate.status).toBe(403);
    expect(teacherCreate.body.error.code).toBe("FORBIDDEN");

    const teacherList = await request(app)
      .get(`/api/v1/academic/classes?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${teacher}`);
    expect(teacherList.status).toBe(200);
    expect(teacherList.body.data.some((c: { id: string }) => c.id === classId)).toBe(true);
    expect(teacherList.body.meta.total).toBe(1);
  });

  it("creates a section under a class and enforces branch scope on a cross-branch PRINCIPAL", async () => {
    const tenant = await createTenant("academic-section-tenant");
    tenantIds.push(tenant.id);
    const branchA = await createBranch(tenant.id, "A");
    const branchB = await createBranch(tenant.id, "B");
    await createRoleWithPermissions(tenant.id, "PRINCIPAL", ["class.manage"]);

    const principalA = await principalToken(tenant.id, branchA.id);
    const principalB = await principalToken(tenant.id, branchB.id);

    const cls = await withTenant(tenant.id, (tx) =>
      tx.class.create({ data: { tenantId: tenant.id, branchId: branchA.id, name: "Class 6", order: 6 } })
    );

    const sectionRes = await request(app)
      .post(`/api/v1/academic/classes/${cls.id}/sections`)
      .set("Authorization", `Bearer ${principalA}`)
      .send({ name: "6-A", capacity: 40 });
    expect(sectionRes.status).toBe(201);

    const crossBranchRes = await request(app)
      .post(`/api/v1/academic/classes/${cls.id}/sections`)
      .set("Authorization", `Bearer ${principalB}`)
      .send({ name: "6-B", capacity: 40 });
    expect(crossBranchRes.status).toBe(403);
    expect(crossBranchRes.body.error.code).toBe("FORBIDDEN");
  });

  it("assigns a subject to a class via ClassSubject", async () => {
    const tenant = await createTenant("academic-classsubject-tenant");
    tenantIds.push(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    await createRoleWithPermissions(tenant.id, "OWNER", ["class.manage", "subject.manage"]);
    const owner = await ownerToken(tenant.id);

    const cls = await withTenant(tenant.id, (tx) =>
      tx.class.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "Class 7", order: 7 } })
    );
    const subject = await withTenant(tenant.id, (tx) =>
      tx.subject.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "Maths", code: "MATH" } })
    );

    const res = await request(app)
      .post(`/api/v1/academic/classes/${cls.id}/subjects`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ subjectId: subject.id, isElective: false });
    expect(res.status).toBe(201);

    const listRes = await request(app)
      .get(`/api/v1/academic/classes/${cls.id}/subjects`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
  });

  it("cross-tenant classes are invisible even to an unscoped query", async () => {
    const tenantA = await createTenant("academic-isolation-a");
    const tenantB = await createTenant("academic-isolation-b");
    tenantIds.push(tenantA.id, tenantB.id);
    const branchA = await createBranch(tenantA.id, "A");

    await withTenant(tenantA.id, (tx) =>
      tx.class.create({ data: { tenantId: tenantA.id, branchId: branchA.id, name: "Class 10", order: 10 } })
    );

    const scoped = await withTenant(tenantB.id, (tx) => tx.class.findMany());
    expect(scoped).toHaveLength(0);

    const unscoped = await prisma.class.findMany({ where: { tenantId: tenantA.id } });
    expect(unscoped).toHaveLength(0);
  });
});

describe("academic sessions — current-session flip", () => {
  it("setting a new current session unsets the previous one, atomically", async () => {
    const tenant = await createTenant("academic-session-tenant");
    tenantIds.push(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    await createRoleWithPermissions(tenant.id, "OWNER", ["session.manage"]);
    const owner = await ownerToken(tenant.id);

    const first = await request(app)
      .post("/api/v1/academic/sessions")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        name: "2025-26",
        startDate: "2025-04-01",
        endDate: "2026-03-31",
        isCurrent: true,
      });
    expect(first.status).toBe(201);
    expect(first.body.data.isCurrent).toBe(true);

    const second = await request(app)
      .post("/api/v1/academic/sessions")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        name: "2026-27",
        startDate: "2026-04-01",
        endDate: "2027-03-31",
        isCurrent: true,
      });
    expect(second.status).toBe(201);
    expect(second.body.data.isCurrent).toBe(true);

    const sessions = await withTenant(tenant.id, (tx) =>
      tx.academicSession.findMany({ where: { branchId: branch.id } })
    );
    const currentOnes = sessions.filter((s) => s.isCurrent);
    expect(currentOnes).toHaveLength(1);
    expect(currentOnes[0]!.id).toBe(second.body.data.id);
  });

  it("denies TEACHER from managing sessions", async () => {
    const tenant = await createTenant("academic-session-rbac-tenant");
    tenantIds.push(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const teacher = await teacherToken(tenant.id, branch.id);

    const res = await request(app)
      .post("/api/v1/academic/sessions")
      .set("Authorization", `Bearer ${teacher}`)
      .send({ branchId: branch.id, name: "2025-26", startDate: "2025-04-01", endDate: "2026-03-31" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

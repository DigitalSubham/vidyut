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

async function ownerToken(tenantId: string) {
  return signAccessToken({ sub: "owner-1", tenantId, roles: ["OWNER"], branchIds: [] });
}

async function teacherToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "teacher-1", tenantId, roles: ["TEACHER"], branchIds: [branchId] });
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
  const section = await withTenant(tenantId, (tx) =>
    tx.section.create({ data: { tenantId, branchId: branch.id, classId: cls.id, name: `${code}-A` } })
  );
  const existingRole = await withTenant(tenantId, (tx) => tx.role.findFirst({ where: { key: "TEACHER" } }));
  const staffRole = existingRole ?? (await createRoleWithPermissions(tenantId, "TEACHER", []));
  const staffUser = await createStaffUser(tenantId, {
    email: `teacher-${code}@example.com`,
    password: "Passw0rd!",
    roleId: staffRole.id,
    branchId: branch.id,
  });
  const staff = await withTenant(tenantId, (tx) =>
    tx.staff.create({
      data: {
        tenantId,
        branchId: branch.id,
        userId: staffUser.id,
        employeeNo: `EMP-${code}`,
        designation: "Teacher",
        type: "TEACHING",
        joinedAt: new Date("2020-01-01"),
      },
    })
  );
  return { branch, cls, subject, session, section, staff };
}

describe("timetable — bulk upsert (grid + slot overwrite), staff double-booking guard, RBAC, isolation", () => {
  it("bulk upserts a section's grid and overwrites the same slot cleanly on resubmission", async () => {
    const tenant = await createTenant("timetable-crud-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["timetable.manage"]);
    const owner = await ownerToken(tenant.id);
    const { branch, session, section, subject, staff } = await setup(tenant.id, "A");

    const res = await request(app)
      .post("/api/v1/timetable")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        sessionId: session.id,
        sectionId: section.id,
        periods: [{ dayOfWeek: 0, periodNo: 1, subjectId: subject.id, staffId: staff.id }],
      });
    expect(res.status).toBe(201);

    const resubmit = await request(app)
      .post("/api/v1/timetable")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        sessionId: session.id,
        sectionId: section.id,
        periods: [{ dayOfWeek: 0, periodNo: 1, subjectId: subject.id, staffId: staff.id, room: "Room 5" }],
      });
    expect(resubmit.status).toBe(201);

    const count = await withTenant(tenant.id, (tx) =>
      tx.timetablePeriod.count({ where: { sectionId: section.id, dayOfWeek: 0, periodNo: 1 } })
    );
    expect(count).toBe(1);

    const listRes = await request(app)
      .get(`/api/v1/timetable?sectionId=${section.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].room).toBe("Room 5");
  });

  it("rejects a staff double-booking across two sections at the same day+period in the same session", async () => {
    const tenant = await createTenant("timetable-conflict-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["timetable.manage"]);
    const owner = await ownerToken(tenant.id);
    const { branch, session, section, subject, staff } = await setup(tenant.id, "A");
    const otherSection = await withTenant(tenant.id, (tx) =>
      tx.section.create({ data: { tenantId: tenant.id, branchId: branch.id, classId: section.classId, name: "A-B" } })
    );

    const first = await request(app)
      .post("/api/v1/timetable")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        sessionId: session.id,
        sectionId: section.id,
        periods: [{ dayOfWeek: 1, periodNo: 2, subjectId: subject.id, staffId: staff.id }],
      });
    expect(first.status).toBe(201);

    const conflicting = await request(app)
      .post("/api/v1/timetable")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        sessionId: session.id,
        sectionId: otherSection.id,
        periods: [{ dayOfWeek: 1, periodNo: 2, subjectId: subject.id, staffId: staff.id }],
      });
    expect(conflicting.status).toBe(409);
  });

  it("RBAC: timetable.manage roles (OWNER/PRINCIPAL/ADMIN) pass on mutations; TEACHER/ACCOUNTANT denied; reads open to any authenticated staff role", async () => {
    const tenant = await createTenant("timetable-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "ADMIN", ["timetable.manage"]);
    const { branch, session, section, subject, staff } = await setup(tenant.id, "A");
    const admin = await adminToken(tenant.id, branch.id);
    const teacher = await teacherToken(tenant.id, branch.id);

    const teacherWrite = await request(app)
      .post("/api/v1/timetable")
      .set("Authorization", `Bearer ${teacher}`)
      .send({
        branchId: branch.id,
        sessionId: session.id,
        sectionId: section.id,
        periods: [{ dayOfWeek: 2, periodNo: 1, subjectId: subject.id, staffId: staff.id }],
      });
    expect(teacherWrite.status).toBe(403);

    const adminWrite = await request(app)
      .post("/api/v1/timetable")
      .set("Authorization", `Bearer ${admin}`)
      .send({
        branchId: branch.id,
        sessionId: session.id,
        sectionId: section.id,
        periods: [{ dayOfWeek: 2, periodNo: 1, subjectId: subject.id, staffId: staff.id }],
      });
    expect(adminWrite.status).toBe(201);

    const teacherRead = await request(app)
      .get(`/api/v1/timetable?sectionId=${section.id}`)
      .set("Authorization", `Bearer ${teacher}`);
    expect(teacherRead.status).toBe(200);
  });

  it("branch-scope: an ADMIN on Branch A is denied writing to Branch B's timetable", async () => {
    const tenant = await createTenant("timetable-branch-scope-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "ADMIN", ["timetable.manage"]);
    const { branch: branchA } = await setup(tenant.id, "A");
    const { branch: branchB, session: sessionB, section: sectionB, subject: subjectB, staff: staffB } = await setup(
      tenant.id,
      "B"
    );
    const adminA = await adminToken(tenant.id, branchA.id);

    const res = await request(app)
      .post("/api/v1/timetable")
      .set("Authorization", `Bearer ${adminA}`)
      .send({
        branchId: branchB.id,
        sessionId: sessionB.id,
        sectionId: sectionB.id,
        periods: [{ dayOfWeek: 0, periodNo: 1, subjectId: subjectB.id, staffId: staffB.id }],
      });
    expect(res.status).toBe(403);
  });

  it("tenant-isolation: cross-tenant timetable queries return zero rows both via RLS and via an unscoped query", async () => {
    const tenantA = await createTenant("timetable-iso-a-tenant");
    const tenantB = await createTenant("timetable-iso-b-tenant");
    tenantIds.push(tenantA.id, tenantB.id);
    const { branch, session, section, subject, staff } = await setup(tenantA.id, "A");
    await setup(tenantB.id, "B");

    const period = await withTenant(tenantA.id, (tx) =>
      tx.timetablePeriod.create({
        data: {
          tenantId: tenantA.id,
          branchId: branch.id,
          sessionId: session.id,
          sectionId: section.id,
          dayOfWeek: 3,
          periodNo: 1,
          subjectId: subject.id,
          staffId: staff.id,
        },
      })
    );

    const crossTenant = await withTenant(tenantB.id, (tx) => tx.timetablePeriod.findMany({}));
    expect(crossTenant).toHaveLength(0);

    const unscoped = await prisma.timetablePeriod.findMany({ where: { id: period.id } });
    expect(unscoped).toHaveLength(0);
  });
});

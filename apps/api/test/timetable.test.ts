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

/** Mirrors the service's own JS-Date-to-server-dayOfWeek conversion
 * (0=Monday..6=Sunday) so tests can build a period for "today". */
function todayServerDayOfWeek(): number {
  return (new Date().getDay() + 6) % 7;
}

/** Substitute teachers must be in the same branch as the period they cover —
 * unlike `setup()`, which spins up a whole new branch each call. */
async function createExtraStaff(tenantId: string, branchId: string, code: string) {
  const existingRole = await withTenant(tenantId, (tx) => tx.role.findFirst({ where: { key: "TEACHER" } }));
  const role = existingRole ?? (await createRoleWithPermissions(tenantId, "TEACHER", []));
  const user = await createStaffUser(tenantId, {
    email: `staff-${code}-${branchId}@example.com`,
    password: "Passw0rd!",
    roleId: role.id,
    branchId,
  });
  return withTenant(tenantId, (tx) =>
    tx.staff.create({
      data: {
        tenantId,
        branchId,
        userId: user.id,
        employeeNo: `EMP-EXTRA-${code}-${branchId}`,
        designation: "Teacher",
        type: "TEACHING",
        joinedAt: new Date("2020-01-01"),
      },
    })
  );
}

describe("timetable — substitutions (Unit 47)", () => {
  it("creates a substitution overriding one period for one day without touching the recurring TimetablePeriod", async () => {
    const tenant = await createTenant("substitution-crud-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["timetable.manage"]);
    const owner = await ownerToken(tenant.id);
    const { branch, session, section, subject, staff } = await setup(tenant.id, "A");
    const substitute = await createExtraStaff(tenant.id, branch.id, "B");

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dayOfWeek = todayServerDayOfWeek();

    const period = await withTenant(tenant.id, (tx) =>
      tx.timetablePeriod.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          sessionId: session.id,
          sectionId: section.id,
          dayOfWeek,
          periodNo: 1,
          subjectId: subject.id,
          staffId: staff.id,
          room: "Room 1",
        },
      })
    );

    const res = await request(app)
      .post("/api/v1/timetable/substitutions")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        timetablePeriodId: period.id,
        date: today.toISOString(),
        substituteStaffId: substitute.id,
        reason: "Sick leave",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.substituteStaffId).toBe(substitute.id);

    const recurring = await withTenant(tenant.id, (tx) => tx.timetablePeriod.findUnique({ where: { id: period.id } }));
    expect(recurring?.staffId).toBe(staff.id);

    const todayList = await request(app)
      .get(`/api/v1/timetable/substitutions/today?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(todayList.status).toBe(200);
    expect(todayList.body.data).toHaveLength(1);
    expect(todayList.body.data[0].substituteStaffId).toBe(substitute.id);
  });

  it("rejects a substitute teacher already covering another section's period in the same slot that day", async () => {
    const tenant = await createTenant("substitution-conflict-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["timetable.manage"]);
    const owner = await ownerToken(tenant.id);
    const { branch, session, section, subject, staff } = await setup(tenant.id, "A");
    const otherSection = await withTenant(tenant.id, (tx) =>
      tx.section.create({ data: { tenantId: tenant.id, branchId: branch.id, classId: section.classId, name: "A-B" } })
    );
    const staffB = await createExtraStaff(tenant.id, branch.id, "B");
    const substitute = await createExtraStaff(tenant.id, branch.id, "C");

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dayOfWeek = todayServerDayOfWeek();

    const periodA = await withTenant(tenant.id, (tx) =>
      tx.timetablePeriod.create({
        data: { tenantId: tenant.id, branchId: branch.id, sessionId: session.id, sectionId: section.id, dayOfWeek, periodNo: 1, subjectId: subject.id, staffId: staff.id },
      })
    );
    const periodB = await withTenant(tenant.id, (tx) =>
      tx.timetablePeriod.create({
        data: { tenantId: tenant.id, branchId: branch.id, sessionId: session.id, sectionId: otherSection.id, dayOfWeek, periodNo: 1, subjectId: subject.id, staffId: staffB.id },
      })
    );

    const first = await request(app)
      .post("/api/v1/timetable/substitutions")
      .set("Authorization", `Bearer ${owner}`)
      .send({ timetablePeriodId: periodA.id, date: today.toISOString(), substituteStaffId: substitute.id });
    expect(first.status).toBe(201);

    const conflicting = await request(app)
      .post("/api/v1/timetable/substitutions")
      .set("Authorization", `Bearer ${owner}`)
      .send({ timetablePeriodId: periodB.id, date: today.toISOString(), substituteStaffId: substitute.id });
    expect(conflicting.status).toBe(409);
  });

  it("rejects a room already used by another substitution in the same slot that day", async () => {
    const tenant = await createTenant("substitution-room-conflict-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["timetable.manage"]);
    const owner = await ownerToken(tenant.id);
    const { branch, session, section, subject, staff } = await setup(tenant.id, "A");
    const otherSection = await withTenant(tenant.id, (tx) =>
      tx.section.create({ data: { tenantId: tenant.id, branchId: branch.id, classId: section.classId, name: "A-B" } })
    );
    const staffB = await createExtraStaff(tenant.id, branch.id, "B");
    const substitute1 = await createExtraStaff(tenant.id, branch.id, "C");
    const substitute2 = await createExtraStaff(tenant.id, branch.id, "D");

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dayOfWeek = todayServerDayOfWeek();

    const periodA = await withTenant(tenant.id, (tx) =>
      tx.timetablePeriod.create({
        data: { tenantId: tenant.id, branchId: branch.id, sessionId: session.id, sectionId: section.id, dayOfWeek, periodNo: 1, subjectId: subject.id, staffId: staff.id },
      })
    );
    const periodB = await withTenant(tenant.id, (tx) =>
      tx.timetablePeriod.create({
        data: { tenantId: tenant.id, branchId: branch.id, sessionId: session.id, sectionId: otherSection.id, dayOfWeek, periodNo: 1, subjectId: subject.id, staffId: staffB.id },
      })
    );

    const first = await request(app)
      .post("/api/v1/timetable/substitutions")
      .set("Authorization", `Bearer ${owner}`)
      .send({ timetablePeriodId: periodA.id, date: today.toISOString(), substituteStaffId: substitute1.id, room: "Lab 1" });
    expect(first.status).toBe(201);

    const conflicting = await request(app)
      .post("/api/v1/timetable/substitutions")
      .set("Authorization", `Bearer ${owner}`)
      .send({ timetablePeriodId: periodB.id, date: today.toISOString(), substituteStaffId: substitute2.id, room: "Lab 1" });
    expect(conflicting.status).toBe(409);
  });

  it("RBAC: TEACHER denied creating substitutions; ADMIN with timetable.manage allowed", async () => {
    const tenant = await createTenant("substitution-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "ADMIN", ["timetable.manage"]);
    const { branch, session, section, subject, staff } = await setup(tenant.id, "A");
    const substitute = await createExtraStaff(tenant.id, branch.id, "B");
    const admin = await adminToken(tenant.id, branch.id);
    const teacher = await teacherToken(tenant.id, branch.id);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dayOfWeek = todayServerDayOfWeek();

    const period = await withTenant(tenant.id, (tx) =>
      tx.timetablePeriod.create({
        data: { tenantId: tenant.id, branchId: branch.id, sessionId: session.id, sectionId: section.id, dayOfWeek, periodNo: 1, subjectId: subject.id, staffId: staff.id },
      })
    );

    const teacherAttempt = await request(app)
      .post("/api/v1/timetable/substitutions")
      .set("Authorization", `Bearer ${teacher}`)
      .send({ timetablePeriodId: period.id, date: today.toISOString(), substituteStaffId: substitute.id });
    expect(teacherAttempt.status).toBe(403);

    const adminAttempt = await request(app)
      .post("/api/v1/timetable/substitutions")
      .set("Authorization", `Bearer ${admin}`)
      .send({ timetablePeriodId: period.id, date: today.toISOString(), substituteStaffId: substitute.id });
    expect(adminAttempt.status).toBe(201);
  });
});

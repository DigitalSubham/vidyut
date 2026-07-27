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

async function setup(tenantId: string, code: string) {
  const branch = await createBranch(tenantId, code);
  const classA = await withTenant(tenantId, (tx) =>
    tx.class.create({ data: { tenantId, branchId: branch.id, name: `Class ${code}-5`, order: 5 } })
  );
  const classB = await withTenant(tenantId, (tx) =>
    tx.class.create({ data: { tenantId, branchId: branch.id, name: `Class ${code}-6`, order: 6 } })
  );
  const sectionA = await withTenant(tenantId, (tx) =>
    tx.section.create({ data: { tenantId, branchId: branch.id, classId: classA.id, name: `${code}5-A` } })
  );
  const sectionB = await withTenant(tenantId, (tx) =>
    tx.section.create({ data: { tenantId, branchId: branch.id, classId: classB.id, name: `${code}6-A` } })
  );
  const fromSession = await withTenant(tenantId, (tx) =>
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
  const toSession = await withTenant(tenantId, (tx) =>
    tx.academicSession.create({
      data: {
        tenantId,
        branchId: branch.id,
        name: `2026-27 ${code}`,
        startDate: new Date("2026-04-01"),
        endDate: new Date("2027-03-31"),
        isCurrent: false,
      },
    })
  );
  const students = await Promise.all(
    ["S1", "S2", "S3"].map((tag) =>
      withTenant(tenantId, (tx) =>
        tx.student.create({
          data: {
            tenantId,
            branchId: branch.id,
            admissionNo: `ADM-${code}-${tag}`,
            firstName: tag,
            lastName: "Student",
            dob: new Date("2012-01-01"),
            gender: "M",
            address: "Patna",
          },
        })
      )
    )
  );
  for (const student of students) {
    await withTenant(tenantId, (tx) =>
      tx.enrollment.create({
        data: {
          tenantId,
          branchId: branch.id,
          studentId: student.id,
          sessionId: fromSession.id,
          classId: classA.id,
          sectionId: sectionA.id,
        },
      })
    );
  }
  return { branch, classA, classB, sectionA, sectionB, fromSession, toSession, students };
}

describe("academic-year rollover — preview/commit, idempotency, tenant/branch isolation", () => {
  it("preview never writes anything and proposes the default next class", async () => {
    const tenant = await createTenant("rollover-preview-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["session.manage"]);
    const owner = await ownerToken(tenant.id);
    const { branch, classB, fromSession, toSession, students } = await setup(tenant.id, "P");

    const res = await request(app)
      .post("/api/v1/academic/rollover/preview")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, fromSessionId: fromSession.id, toSessionId: toSession.id });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(students.length);
    for (const row of res.body.data) {
      expect(row.proposedClassId).toBe(classB.id);
    }

    const enrollmentCount = await withTenant(tenant.id, (tx) =>
      tx.enrollment.count({ where: { sessionId: toSession.id } })
    );
    expect(enrollmentCount).toBe(0); // preview wrote nothing
  });

  it("commit creates the decided Enrollment rows (mixed promote/repeat/withdraw) and flips isCurrent", async () => {
    const tenant = await createTenant("rollover-commit-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["session.manage"]);
    const owner = await ownerToken(tenant.id);
    const { branch, classA, classB, sectionA, sectionB, fromSession, toSession, students } = await setup(
      tenant.id,
      "C"
    );

    const res = await request(app)
      .post("/api/v1/academic/rollover/commit")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        fromSessionId: fromSession.id,
        toSessionId: toSession.id,
        decisions: [
          { studentId: students[0]!.id, action: "PROMOTE", targetClassId: classB.id, targetSectionId: sectionB.id },
          { studentId: students[1]!.id, action: "REPEAT", targetClassId: classA.id, targetSectionId: sectionA.id },
          { studentId: students[2]!.id, action: "WITHDRAW" },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.outcomes).toHaveLength(3);

    const newEnrollments = await withTenant(tenant.id, (tx) =>
      tx.enrollment.findMany({ where: { sessionId: toSession.id } })
    );
    expect(newEnrollments).toHaveLength(2); // promote + repeat, not the withdrawn student
    expect(newEnrollments.find((e) => e.studentId === students[0]!.id)?.classId).toBe(classB.id);
    expect(newEnrollments.find((e) => e.studentId === students[1]!.id)?.classId).toBe(classA.id);
    expect(newEnrollments.some((e) => e.studentId === students[2]!.id)).toBe(false);

    // Old session's original enrollments are untouched — same rows, same class.
    const oldEnrollments = await withTenant(tenant.id, (tx) =>
      tx.enrollment.findMany({ where: { sessionId: fromSession.id } })
    );
    expect(oldEnrollments).toHaveLength(3);
    expect(oldEnrollments.every((e) => e.classId === classA.id)).toBe(true);

    const [refreshedFrom, refreshedTo] = await withTenant(tenant.id, (tx) =>
      Promise.all([
        tx.academicSession.findUnique({ where: { id: fromSession.id } }),
        tx.academicSession.findUnique({ where: { id: toSession.id } }),
      ])
    );
    expect(refreshedFrom!.isCurrent).toBe(false);
    expect(refreshedTo!.isCurrent).toBe(true);
  });

  it("re-running commit for an already-migrated student is a clean no-op, never a duplicate Enrollment", async () => {
    const tenant = await createTenant("rollover-idempotent-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["session.manage"]);
    const owner = await ownerToken(tenant.id);
    const { branch, classB, sectionB, fromSession, toSession, students } = await setup(tenant.id, "I");

    const decisions = [
      { studentId: students[0]!.id, action: "PROMOTE" as const, targetClassId: classB.id, targetSectionId: sectionB.id },
    ];

    const first = await request(app)
      .post("/api/v1/academic/rollover/commit")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, fromSessionId: fromSession.id, toSessionId: toSession.id, decisions });
    expect(first.status).toBe(200);
    expect(first.body.data.outcomes[0].status).toBe("MIGRATED");

    const second = await request(app)
      .post("/api/v1/academic/rollover/commit")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, fromSessionId: fromSession.id, toSessionId: toSession.id, decisions });
    expect(second.status).toBe(200);
    expect(second.body.data.outcomes[0].status).toBe("ALREADY_MIGRATED");

    const count = await withTenant(tenant.id, (tx) =>
      tx.enrollment.count({ where: { studentId: students[0]!.id, sessionId: toSession.id } })
    );
    expect(count).toBe(1); // never duplicated
  });

  it("RBAC: session.manage is required", async () => {
    const tenant = await createTenant("rollover-rbac-permission-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "PRINCIPAL", []); // no session.manage
    const { branch, fromSession, toSession } = await setup(tenant.id, "R");
    const principal = await principalToken(tenant.id, branch.id);

    const res = await request(app)
      .post("/api/v1/academic/rollover/preview")
      .set("Authorization", `Bearer ${principal}`)
      .send({ branchId: branch.id, fromSessionId: fromSession.id, toSessionId: toSession.id });
    expect(res.status).toBe(403);
  });

  it("branch-scope denies a PRINCIPAL on a different branch even with session.manage", async () => {
    const tenant = await createTenant("rollover-rbac-branch-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "PRINCIPAL", ["session.manage"]);
    const { branch, fromSession, toSession } = await setup(tenant.id, "R");
    const otherBranch = await createBranch(tenant.id, "OTHER");

    const principalWrongBranch = await signAccessToken({
      sub: "principal-2",
      tenantId: tenant.id,
      roles: ["PRINCIPAL"],
      branchIds: [otherBranch.id],
    });
    const res = await request(app)
      .post("/api/v1/academic/rollover/preview")
      .set("Authorization", `Bearer ${principalWrongBranch}`)
      .send({ branchId: branch.id, fromSessionId: fromSession.id, toSessionId: toSession.id });
    expect(res.status).toBe(403);
  });
});

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

async function setupTenantWithClass(namePrefix: string) {
  const tenant = await createTenant(namePrefix);
  tenantIds.push(tenant.id);
  await createRoleWithPermissions(tenant.id, "OWNER", ["student.view", "student.edit"]);
  const branch = await createBranch(tenant.id, "A");
  const session = await withTenant(tenant.id, (tx) =>
    tx.academicSession.create({
      data: { tenantId: tenant.id, branchId: branch.id, name: "2025-26", startDate: new Date("2025-04-01"), endDate: new Date("2026-03-31"), isCurrent: true },
    })
  );
  const klass = await withTenant(tenant.id, (tx) => tx.class.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "5", order: 5 } }));
  const section = await withTenant(tenant.id, (tx) =>
    tx.section.create({ data: { tenantId: tenant.id, branchId: branch.id, classId: klass.id, name: "A" } })
  );
  return { tenant, branch, session, klass, section };
}

describe("student lifecycle — sibling linking (scope #1, Open Question 1: tag only, no auto-discount)", () => {
  it("links two students into a sibling group and lists them for each other", async () => {
    const { tenant, branch, session, klass, section } = await setupTenantWithClass("lifecycle-siblings-tenant");
    const owner = await ownerToken(tenant.id);

    const s1 = await withTenant(tenant.id, (tx) =>
      tx.student.create({ data: { tenantId: tenant.id, branchId: branch.id, admissionNo: "ADM-SIB1", firstName: "A", lastName: "One", dob: new Date("2012-01-01"), gender: "M", address: "Patna" } })
    );
    const s2 = await withTenant(tenant.id, (tx) =>
      tx.student.create({ data: { tenantId: tenant.id, branchId: branch.id, admissionNo: "ADM-SIB2", firstName: "A", lastName: "Two", dob: new Date("2014-01-01"), gender: "F", address: "Patna" } })
    );
    void session;
    void klass;
    void section;

    const linkRes = await request(app)
      .post("/api/v1/students/link-siblings")
      .set("Authorization", `Bearer ${owner}`)
      .send({ studentIds: [s1.id, s2.id] });
    expect(linkRes.status).toBe(200);

    const siblingsRes = await request(app)
      .get(`/api/v1/students/${s1.id}/siblings`)
      .set("Authorization", `Bearer ${owner}`);
    expect(siblingsRes.status).toBe(200);
    expect(siblingsRes.body.data).toHaveLength(1);
    expect(siblingsRes.body.data[0].id).toBe(s2.id);
  });
});

describe("student lifecycle — cross-branch transfer (scope #2, Open Question 2: history stays put)", () => {
  it("moves the student and the current-session Enrollment to the target branch/class, leaving old attendance history untouched", async () => {
    const { tenant, branch: fromBranch, session, klass: fromClass, section: fromSection } = await setupTenantWithClass("lifecycle-transfer-tenant");
    const owner = await ownerToken(tenant.id);
    const toBranch = await createBranch(tenant.id, "B");
    await withTenant(tenant.id, (tx) =>
      tx.academicSession.create({
        data: { tenantId: tenant.id, branchId: toBranch.id, name: "2025-26", startDate: new Date("2025-04-01"), endDate: new Date("2026-03-31"), isCurrent: true },
      })
    );
    const toClass = await withTenant(tenant.id, (tx) => tx.class.create({ data: { tenantId: tenant.id, branchId: toBranch.id, name: "5", order: 5 } }));
    const toSection = await withTenant(tenant.id, (tx) =>
      tx.section.create({ data: { tenantId: tenant.id, branchId: toBranch.id, classId: toClass.id, name: "A" } })
    );

    const student = await withTenant(tenant.id, (tx) =>
      tx.student.create({ data: { tenantId: tenant.id, branchId: fromBranch.id, admissionNo: "ADM-TRF1", firstName: "T", lastName: "One", dob: new Date("2012-01-01"), gender: "M", address: "Patna" } })
    );
    await withTenant(tenant.id, (tx) =>
      tx.enrollment.create({ data: { tenantId: tenant.id, branchId: fromBranch.id, studentId: student.id, sessionId: session.id, classId: fromClass.id, sectionId: fromSection.id } })
    );
    // A real attendance record in the OLD branch, before the transfer — must survive untouched.
    const oldAttendance = await withTenant(tenant.id, (tx) =>
      tx.attendanceRecord.create({
        data: { tenantId: tenant.id, branchId: fromBranch.id, sessionId: session.id, sectionId: fromSection.id, studentId: student.id, date: new Date("2025-06-01"), status: "PRESENT", source: "WEB" },
      })
    );

    const transferRes = await request(app)
      .post(`/api/v1/students/${student.id}/transfer`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ targetBranchId: toBranch.id, targetClassId: toClass.id, targetSectionId: toSection.id });
    expect(transferRes.status).toBe(200);
    expect(transferRes.body.data.branchId).toBe(toBranch.id);

    const enrollment = await withTenant(tenant.id, (tx) =>
      tx.enrollment.findUnique({ where: { studentId_sessionId: { studentId: student.id, sessionId: session.id } } })
    );
    expect(enrollment?.branchId).toBe(toBranch.id);
    expect(enrollment?.classId).toBe(toClass.id);

    // Old attendance record's branchId is provably untouched.
    const preservedAttendance = await withTenant(tenant.id, (tx) => tx.attendanceRecord.findUnique({ where: { id: oldAttendance.id } }));
    expect(preservedAttendance?.branchId).toBe(fromBranch.id);
  });
});

describe("student lifecycle — alumni transition + readmission (scope #3/#4)", () => {
  it("marks a student ALUMNI, lists them in the alumni filter, then readmits them into a fresh enrollment", async () => {
    const { tenant, branch, session, klass, section } = await setupTenantWithClass("lifecycle-alumni-tenant");
    const owner = await ownerToken(tenant.id);

    const student = await withTenant(tenant.id, (tx) =>
      tx.student.create({ data: { tenantId: tenant.id, branchId: branch.id, admissionNo: "ADM-ALM1", firstName: "L", lastName: "One", dob: new Date("2010-01-01"), gender: "M", address: "Patna" } })
    );
    await withTenant(tenant.id, (tx) =>
      tx.enrollment.create({ data: { tenantId: tenant.id, branchId: branch.id, studentId: student.id, sessionId: session.id, classId: klass.id, sectionId: section.id } })
    );

    const markRes = await request(app)
      .post(`/api/v1/students/${student.id}/mark-alumni`)
      .set("Authorization", `Bearer ${owner}`);
    expect(markRes.status).toBe(200);
    expect(markRes.body.data.status).toBe("ALUMNI");

    const alumniRes = await request(app)
      .get(`/api/v1/students/alumni?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(alumniRes.status).toBe(200);
    expect(alumniRes.body.data.map((s: { id: string }) => s.id)).toContain(student.id);

    // Readmission is distinct from Unit 33's rollover-time REPEAT — a standalone flow.
    const readmitRes = await request(app)
      .post(`/api/v1/students/${student.id}/readmit`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ classId: klass.id, sectionId: section.id });
    expect(readmitRes.status).toBe(200);
    expect(readmitRes.body.data.status).toBe("ACTIVE");

    const enrollment = await withTenant(tenant.id, (tx) =>
      tx.enrollment.findUnique({ where: { studentId_sessionId: { studentId: student.id, sessionId: session.id } } })
    );
    expect(enrollment?.status).toBe("ACTIVE");
  });
});

describe("student lifecycle — timeline log (scope #5)", () => {
  it("records and lists append-only timeline entries", async () => {
    const { tenant, branch } = await setupTenantWithClass("lifecycle-timeline-tenant");
    const owner = await ownerToken(tenant.id);

    const student = await withTenant(tenant.id, (tx) =>
      tx.student.create({ data: { tenantId: tenant.id, branchId: branch.id, admissionNo: "ADM-TML1", firstName: "T", lastName: "L", dob: new Date("2012-01-01"), gender: "F", address: "Patna" } })
    );

    const createRes = await request(app)
      .post(`/api/v1/students/${student.id}/timeline`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ type: "ACHIEVEMENT", body: "Won inter-school debate" });
    expect(createRes.status).toBe(201);

    const listRes = await request(app)
      .get(`/api/v1/students/${student.id}/timeline`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].type).toBe("ACHIEVEMENT");
  });
});

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

async function ownerToken(tenantId: string, branchIds: string[] = []) {
  return signAccessToken({ sub: "owner-1", tenantId, roles: ["OWNER"], branchIds });
}

async function setup(tenantId: string, code: string) {
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
  const section = await withTenant(tenantId, (tx) =>
    tx.section.create({ data: { tenantId, branchId: branch.id, classId: cls.id, name: `${code}-A` } })
  );
  const subject = await withTenant(tenantId, (tx) =>
    tx.subject.create({ data: { tenantId, branchId: branch.id, name: "Maths", code: "MATH" } })
  );
  const staffUser = await withTenant(tenantId, (tx) =>
    tx.user.create({ data: { tenantId, name: "Teacher", email: `t-${branch.id}@school.test`, status: "ACTIVE" } })
  );
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
  const period = await withTenant(tenantId, (tx) =>
    tx.timetablePeriod.create({
      data: {
        tenantId,
        branchId: branch.id,
        sessionId: session.id,
        sectionId: section.id,
        dayOfWeek: 1,
        periodNo: 1,
        subjectId: subject.id,
        staffId: staff.id,
      },
    })
  );
  return { branch, cls, session, section, period };
}

async function enrollStudent(
  tenantId: string,
  branchId: string,
  classId: string,
  sectionId: string,
  sessionId: string,
  tag: string
) {
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
    tx.enrollment.create({ data: { tenantId, branchId, studentId: student.id, sessionId, classId, sectionId } })
  );
  return student;
}

describe("Unit 44 — Attendance Depth", () => {
  it("period-wise attendance coexists with daily attendance for the same student/day", async () => {
    const tenant = await createTenant("period-attendance-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["attendance.mark", "attendance.view"]);
    const { branch, cls, session, section, period } = await setup(tenant.id, "PA");
    const owner = await ownerToken(tenant.id, [branch.id]);
    const student = await enrollStudent(tenant.id, branch.id, cls.id, section.id, session.id, "PA1");

    const daily = await request(app)
      .post("/api/v1/attendance")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        sectionId: section.id,
        date: "2026-07-20",
        records: [{ studentId: student.id, status: "PRESENT" }],
      });
    expect(daily.status).toBe(201);

    const periodWise = await request(app)
      .post("/api/v1/attendance")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        sectionId: section.id,
        date: "2026-07-20",
        periodId: period.id,
        records: [{ studentId: student.id, status: "ABSENT" }],
      });
    expect(periodWise.status).toBe(201);

    const rows = await withTenant(tenant.id, (tx) =>
      tx.attendanceRecord.findMany({ where: { studentId: student.id }, orderBy: { periodId: "asc" } })
    );
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.periodId === null)?.status).toBe("PRESENT");
    expect(rows.find((r) => r.periodId === period.id)?.status).toBe("ABSENT");

    // Re-marking the same period upserts, doesn't duplicate.
    const rePeriod = await request(app)
      .post("/api/v1/attendance")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        sectionId: section.id,
        date: "2026-07-20",
        periodId: period.id,
        records: [{ studentId: student.id, status: "LATE" }],
      });
    expect(rePeriod.status).toBe(201);
    const afterRepick = await withTenant(tenant.id, (tx) =>
      tx.attendanceRecord.findMany({ where: { studentId: student.id, periodId: period.id } })
    );
    expect(afterRepick).toHaveLength(1);
    expect(afterRepick[0]?.status).toBe("LATE");

    // Listing filtered by periodId returns only the period-wise row.
    const listRes = await request(app)
      .get("/api/v1/attendance")
      .query({ branchId: branch.id, periodId: period.id })
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].periodId).toBe(period.id);
  });

  it("device-scan: a device token creates/updates daily attendance without a user JWT", async () => {
    const tenant = await createTenant("device-scan-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["branch.manage", "attendance.view"]);
    const { branch, cls, session, section } = await setup(tenant.id, "DS");
    const owner = await ownerToken(tenant.id, [branch.id]);
    const student = await enrollStudent(tenant.id, branch.id, cls.id, section.id, session.id, "DS1");

    const rotateRes = await request(app)
      .post(`/api/v1/attendance/device-token/${branch.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(rotateRes.status).toBe(200);
    const deviceToken = rotateRes.body.data.deviceToken as string;
    expect(deviceToken).toBeTruthy();

    const scanRes = await request(app)
      .post("/api/v1/attendance/device-scan")
      .send({ deviceToken, admissionNo: student.admissionNo, timestamp: "2026-07-21T04:00:00.000Z" });
    expect(scanRes.status).toBe(201);
    expect(scanRes.body.data.status).toBe("PRESENT");
    expect(scanRes.body.data.source).toBe("BIOMETRIC");

    // A second scan the same day updates, doesn't duplicate.
    const scanRes2 = await request(app)
      .post("/api/v1/attendance/device-scan")
      .send({ deviceToken, admissionNo: student.admissionNo, timestamp: "2026-07-21T09:00:00.000Z" });
    expect(scanRes2.status).toBe(201);

    const rows = await withTenant(tenant.id, (tx) =>
      tx.attendanceRecord.findMany({ where: { studentId: student.id, periodId: null } })
    );
    expect(rows).toHaveLength(1);

    // Wrong device token is rejected.
    const badToken = await request(app)
      .post("/api/v1/attendance/device-scan")
      .send({ deviceToken: "not-a-real-token", admissionNo: student.admissionNo });
    expect(badToken.status).toBe(401);
  });

  it("analytics: returns a real trend and chronic-absentee list against seeded data", async () => {
    const tenant = await createTenant("attendance-analytics-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["attendance.mark", "attendance.view"]);
    const { branch, cls, session, section } = await setup(tenant.id, "AN");
    const owner = await ownerToken(tenant.id, [branch.id]);
    const chronic = await enrollStudent(tenant.id, branch.id, cls.id, section.id, session.id, "AN-chronic");
    const regular = await enrollStudent(tenant.id, branch.id, cls.id, section.id, session.id, "AN-regular");

    const days = ["2026-07-20", "2026-07-21", "2026-07-22"];
    for (const day of days) {
      await request(app)
        .post("/api/v1/attendance")
        .set("Authorization", `Bearer ${owner}`)
        .send({
          branchId: branch.id,
          sectionId: section.id,
          date: day,
          records: [
            { studentId: chronic.id, status: "ABSENT" },
            { studentId: regular.id, status: "PRESENT" },
          ],
        });
    }

    const analyticsRes = await request(app)
      .get("/api/v1/attendance/analytics")
      .query({ branchId: branch.id, from: "2026-07-20", to: "2026-07-22", minAbsences: 3 })
      .set("Authorization", `Bearer ${owner}`);
    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.data.trend).toHaveLength(3);
    for (const point of analyticsRes.body.data.trend) {
      expect(point.attendancePercent).toBeCloseTo(50, 0);
    }
    expect(analyticsRes.body.data.chronicAbsentees).toHaveLength(1);
    expect(analyticsRes.body.data.chronicAbsentees[0].studentId).toBe(chronic.id);
  });
});

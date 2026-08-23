import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { prisma, withTenant } from "@vidyut/db";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/core/auth/jwt";
import { getRepeatableJobs } from "../src/core/jobs";
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

describe("GET /reports/* — standard reports, KPI summary, schedule", () => {
  it("attendance/fees/exams/admissions/staff reports return numbers that match a direct recomputation", async () => {
    const tenant = await createTenant("reports-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["dashboard.owner"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const cls = await withTenant(tenant.id, (tx) =>
      tx.class.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "Class A", order: 1 } })
    );
    const session = await withTenant(tenant.id, (tx) =>
      tx.academicSession.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          name: "2025-26",
          startDate: new Date("2025-04-01"),
          endDate: new Date("2026-03-31"),
          isCurrent: true,
        },
      })
    );
    const section = await withTenant(tenant.id, (tx) =>
      tx.section.create({ data: { tenantId: tenant.id, branchId: branch.id, classId: cls.id, name: "A-A" } })
    );
    const student = await withTenant(tenant.id, (tx) =>
      tx.student.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          admissionNo: "ADM-1",
          firstName: "S",
          lastName: "One",
          dob: new Date("2012-01-01"),
          gender: "M",
          address: "Patna",
        },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.enrollment.create({
        data: { tenantId: tenant.id, branchId: branch.id, studentId: student.id, sessionId: session.id, classId: cls.id, sectionId: section.id },
      })
    );

    // Attendance: 2 records, 1 present.
    const today = new Date();
    await withTenant(tenant.id, (tx) =>
      tx.attendanceRecord.create({
        data: { tenantId: tenant.id, branchId: branch.id, sessionId: session.id, sectionId: section.id, studentId: student.id, date: today, status: "PRESENT", markedById: "seed-user", source: "WEB" },
      })
    );

    // Fees: one invoice, half collected.
    const feeHead = await withTenant(tenant.id, (tx) =>
      tx.feeHead.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "Tuition", type: "TUITION" } })
    );
    const invoice = await withTenant(tenant.id, (tx) =>
      tx.invoice.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          studentId: student.id,
          sessionId: session.id,
          number: "INV-1",
          periodLabel: "This month",
          dueDate: today,
          items: { create: { tenantId: tenant.id, feeHeadId: feeHead.id, amount: 100000 } },
        },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.payment.create({
        data: { tenantId: tenant.id, branchId: branch.id, studentId: student.id, invoiceId: invoice.id, amount: 40000, mode: "CASH", status: "SUCCESS", idempotencyKey: "reports-test-1" },
      })
    );

    // Exams: one exam, one subject, one passing entry.
    const subject = await withTenant(tenant.id, (tx) =>
      tx.subject.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "Maths", code: "MATH" } })
    );
    const exam = await withTenant(tenant.id, (tx) =>
      tx.exam.create({ data: { tenantId: tenant.id, branchId: branch.id, sessionId: session.id, name: "Unit Test", type: "UNIT_TEST", gradingScheme: "MARKS" } })
    );
    const examSubject = await withTenant(tenant.id, (tx) =>
      tx.examSubject.create({ data: { tenantId: tenant.id, examId: exam.id, classId: cls.id, subjectId: subject.id, maxMarks: 100, passMarks: 33 } })
    );
    await withTenant(tenant.id, (tx) =>
      tx.marksEntry.create({
        data: { tenantId: tenant.id, branchId: branch.id, examSubjectId: examSubject.id, studentId: student.id, marks: 80, enteredById: "seed-user" },
      })
    );

    // Admissions: one enquiry.
    await withTenant(tenant.id, (tx) =>
      tx.enquiry.create({ data: { tenantId: tenant.id, branchId: branch.id, childName: "C", guardianName: "G", phone: "+919812340099", source: "walk-in" } })
    );

    // Staff: one staff member.
    const staffUser = await withTenant(tenant.id, (tx) =>
      tx.user.create({ data: { tenantId: tenant.id, name: "T One", phone: "+919812340098", status: "ACTIVE" } })
    );
    await withTenant(tenant.id, (tx) =>
      tx.staff.create({
        data: { tenantId: tenant.id, branchId: branch.id, userId: staffUser.id, employeeNo: "EMP-1", designation: "Teacher", type: "TEACHING", joinedAt: new Date("2020-01-01") },
      })
    );

    const from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();
    const q = `branchId=${branch.id}&from=${from}&to=${to}`;

    const attendanceRes = await request(app).get(`/api/v1/reports/attendance?${q}`).set("Authorization", `Bearer ${owner}`);
    expect(attendanceRes.status).toBe(200);
    expect(attendanceRes.body.data).toHaveLength(1);
    expect(attendanceRes.body.data[0].attendancePercent).toBe(100);

    const feesRes = await request(app).get(`/api/v1/reports/fees?${q}`).set("Authorization", `Bearer ${owner}`);
    expect(feesRes.status).toBe(200);
    expect(feesRes.body.data[0].invoiced).toBe(100000);
    expect(feesRes.body.data[0].collected).toBe(40000);

    const examsRes = await request(app).get(`/api/v1/reports/exams?${q}`).set("Authorization", `Bearer ${owner}`);
    expect(examsRes.status).toBe(200);
    expect(examsRes.body.data[0].totalEntries).toBe(1);
    expect(examsRes.body.data[0].averagePercent).toBe(80);
    expect(examsRes.body.data[0].passPercent).toBe(100);

    const admissionsRes = await request(app).get(`/api/v1/reports/admissions?${q}`).set("Authorization", `Bearer ${owner}`);
    expect(admissionsRes.status).toBe(200);
    expect(admissionsRes.body.data).toHaveLength(1);
    expect(admissionsRes.body.data[0].type).toBe("enquiry");

    const staffRes = await request(app).get(`/api/v1/reports/staff?${q}`).set("Authorization", `Bearer ${owner}`);
    expect(staffRes.status).toBe(200);
    expect(staffRes.body.data).toHaveLength(1);
    expect(staffRes.body.data[0].employeeNo).toBe("EMP-1");

    // CSV export — same query, different format, real header row + one data row.
    const csvRes = await request(app).get(`/api/v1/reports/staff?${q}&format=csv`).set("Authorization", `Bearer ${owner}`);
    expect(csvRes.status).toBe(200);
    expect(csvRes.text.split("\n")).toHaveLength(2);
    expect(csvRes.text).toContain("EMP-1");

    // KPI summary merges the same headline figures.
    const kpiRes = await request(app).get(`/api/v1/reports/kpi-summary?branchId=${branch.id}`).set("Authorization", `Bearer ${owner}`);
    expect(kpiRes.status).toBe(200);
    expect(kpiRes.body.data.staff.headcount).toBe(1);
    expect(kpiRes.body.data.admissions.enquiries).toBe(1);
  });

  it("RBAC: dashboard.owner/dashboard.principal roles pass; ADMIN denied", async () => {
    const tenant = await createTenant("reports-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "ADMIN", []);
    const branch = await createBranch(tenant.id, "A");
    const admin = await signAccessToken({ sub: "admin-1", tenantId: tenant.id, roles: ["ADMIN"], branchIds: [branch.id] });

    const res = await request(app).get(
      `/api/v1/reports/attendance?branchId=${branch.id}&from=2025-01-01&to=2025-01-31`
    ).set("Authorization", `Bearer ${admin}`);
    expect(res.status).toBe(403);
  });

  it("POST /reports/schedule registers a real BullMQ repeatable job on the requested cadence", async () => {
    const tenant = await createTenant("reports-schedule-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["dashboard.owner"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");

    const res = await request(app)
      .post("/api/v1/reports/schedule")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, reportType: "fees", cadence: "MONTHLY", recipientEmail: "owner@example.com" });
    expect(res.status).toBe(201);
    expect(res.body.data.jobId).toBeTruthy();

    const repeatable = await getRepeatableJobs();
    const match = repeatable.find((j) => j.name === "reports.scheduledEmail" && j.pattern === "0 9 1 * *");
    expect(match).toBeDefined();
  });
});

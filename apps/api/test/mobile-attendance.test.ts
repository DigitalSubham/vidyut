import type { Worker } from "bullmq";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, withTenant } from "@vidyut/db";
import { startWorker } from "@vidyut/worker";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/core/auth/jwt";
import { cleanupTenant, createBranch, createRoleWithPermissions, createTenant } from "./helpers";

const app = createApp();
const tenantIds: string[] = [];
let worker: Worker;

beforeAll(() => {
  worker = startWorker();
});

afterAll(async () => {
  await worker.close();
  for (const id of tenantIds) {
    await cleanupTenant(id);
  }
  await prisma.$disconnect();
});

async function ownerToken(tenantId: string) {
  return signAccessToken({ sub: "owner-1", tenantId, roles: ["OWNER"], branchIds: [] });
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
  return { branch, cls, session, section };
}

async function enrollStudentWithGuardian(
  tenantId: string,
  branchId: string,
  classId: string,
  sectionId: string,
  sessionId: string,
  tag: string,
  phone: string
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
  const guardian = await withTenant(tenantId, (tx) =>
    tx.guardian.create({ data: { tenantId, name: `Guardian ${tag}`, relation: "MOTHER", phone } })
  );
  await withTenant(tenantId, (tx) =>
    tx.studentGuardian.create({
      data: { tenantId, studentId: student.id, guardianId: guardian.id, isPrimary: true, canPay: true },
    })
  );
  return { student, guardian };
}

describe("mobile attendance sync — offline client-id upsert + absence alerts", () => {
  it("a client-generated id upserts cleanly (idempotent re-sync)", async () => {
    const tenant = await createTenant("mobile-attendance-clientid-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["attendance.mark"]);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, session, section } = await setup(tenant.id, "A");
    const { student } = await enrollStudentWithGuardian(
      tenant.id,
      branch.id,
      cls.id,
      section.id,
      session.id,
      "S1",
      "+919812340080"
    );

    const clientId = "client-generated-cuid-abc123";
    const firstSync = await request(app)
      .post("/api/v1/attendance")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        sectionId: section.id,
        date: "2025-06-15",
        source: "APP",
        records: [{ id: clientId, studentId: student.id, status: "PRESENT" }],
      });
    expect(firstSync.status).toBe(201);
    expect(firstSync.body.data[0].id).toBe(clientId);

    // A retried sync (e.g. after a dropped connection) with the same client id — no duplicate.
    const retrySync = await request(app)
      .post("/api/v1/attendance")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        sectionId: section.id,
        date: "2025-06-15",
        source: "APP",
        records: [{ id: clientId, studentId: student.id, status: "PRESENT" }],
      });
    expect(retrySync.status).toBe(201);

    const count = await withTenant(tenant.id, (tx) => tx.attendanceRecord.count({ where: { studentId: student.id } }));
    expect(count).toBe(1);
  });

  it("marking a student ABSENT enqueues exactly one alert per eligible guardian; re-marking ABSENT doesn't duplicate it", async () => {
    const tenant = await createTenant("mobile-attendance-alert-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["attendance.mark"]);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, session, section } = await setup(tenant.id, "A");
    const { student } = await enrollStudentWithGuardian(
      tenant.id,
      branch.id,
      cls.id,
      section.id,
      session.id,
      "S1",
      "+919812340081"
    );
    // Unit 32: the guardian has no linked User (no push-capable account), so
    // the alert falls back to SMS — same SmsWallet-gated path as Unit 14's
    // fee reminders, needs a funded wallet or it fails cleanly instead.
    await prisma.smsWallet.create({ data: { tenantId: tenant.id, balancePaise: 10_000 } });

    const markAbsent = await request(app)
      .post("/api/v1/attendance")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        sectionId: section.id,
        date: "2025-06-16",
        source: "APP",
        records: [{ studentId: student.id, status: "ABSENT" }],
      });
    expect(markAbsent.status).toBe(201);

    // Give the fan-out students.absenceAlert job a moment to complete.
    await new Promise((resolve) => setTimeout(resolve, 500));

    const logsAfterFirst = await withTenant(tenant.id, (tx) =>
      tx.notificationLog.findMany({ where: { branchId: branch.id, templateKey: "attendance.absence" } })
    );
    expect(logsAfterFirst).toHaveLength(1);
    expect(logsAfterFirst[0]?.status).toBe("SENT");

    // Re-marking the same day ABSENT again shouldn't fire a second alert.
    const remarkAbsent = await request(app)
      .post("/api/v1/attendance")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        sectionId: section.id,
        date: "2025-06-16",
        source: "APP",
        records: [{ studentId: student.id, status: "ABSENT" }],
      });
    expect(remarkAbsent.status).toBe(201);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const logsAfterRemark = await withTenant(tenant.id, (tx) =>
      tx.notificationLog.findMany({ where: { branchId: branch.id, templateKey: "attendance.absence" } })
    );
    expect(logsAfterRemark).toHaveLength(1);
  });
});

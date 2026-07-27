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

async function principalToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "principal-1", tenantId, roles: ["PRINCIPAL"], branchIds: [branchId] });
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
  const students = await Promise.all(
    ["S1", "S2"].map((tag) =>
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
        data: { tenantId, branchId: branch.id, studentId: student.id, sessionId: session.id, classId: cls.id, sectionId: section.id },
      })
    );
  }
  return { branch, cls, subject, section, session, students };
}

describe("idempotent sync retry — full-batch retry after a dropped response", () => {
  it("retrying the exact same POST /attendance batch twice never duplicates rows", async () => {
    const tenant = await createTenant("offline-sync-retry-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["attendance.mark"]);
    const owner = await ownerToken(tenant.id);
    const { branch, section, students } = await setup(tenant.id, "R");

    const body = {
      branchId: branch.id,
      sectionId: section.id,
      date: "2025-06-20",
      source: "APP",
      records: students.map((s) => ({ studentId: s.id, status: "PRESENT" as const })),
    };

    // Simulates the client never seeing the first response (network drop)
    // and retrying the identical batch — same records, no client ids.
    const first = await request(app).post("/api/v1/attendance").set("Authorization", `Bearer ${owner}`).send(body);
    const retry = await request(app).post("/api/v1/attendance").set("Authorization", `Bearer ${owner}`).send(body);

    expect(first.status).toBe(201);
    expect(retry.status).toBe(201);

    const count = await withTenant(tenant.id, (tx) =>
      tx.attendanceRecord.count({ where: { sectionId: section.id, date: new Date("2025-06-20") } })
    );
    expect(count).toBe(students.length); // exactly one row per student, not doubled
  });
});

describe("delta sync — ?since= param", () => {
  it("GET /attendance?since= returns only rows updated at/after that instant", async () => {
    const tenant = await createTenant("offline-sync-delta-attendance-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["attendance.mark", "attendance.view"]);
    const owner = await ownerToken(tenant.id);
    const { branch, section, students } = await setup(tenant.id, "D");

    await request(app)
      .post("/api/v1/attendance")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        sectionId: section.id,
        date: "2025-06-21",
        source: "APP",
        records: [{ studentId: students[0]!.id, status: "PRESENT" }],
      });

    const cutoff = new Date();
    await new Promise((resolve) => setTimeout(resolve, 20));

    await request(app)
      .post("/api/v1/attendance")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        sectionId: section.id,
        date: "2025-06-22",
        source: "APP",
        records: [{ studentId: students[1]!.id, status: "PRESENT" }],
      });

    const sinceRes = await request(app)
      .get(`/api/v1/attendance?branchId=${branch.id}&since=${cutoff.toISOString()}`)
      .set("Authorization", `Bearer ${owner}`);

    expect(sinceRes.status).toBe(200);
    expect(sinceRes.body.data).toHaveLength(1);
    expect(sinceRes.body.data[0].studentId).toBe(students[1]!.id);

    const fullRes = await request(app)
      .get(`/api/v1/attendance?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(fullRes.body.data).toHaveLength(2); // omitting since= keeps existing full-fetch behavior
  });

  it("GET /homework?since= returns only homework created/updated at/after that instant", async () => {
    const tenant = await createTenant("offline-sync-delta-homework-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "PRINCIPAL", ["homework.manage"]);
    const { branch, subject, section } = await setup(tenant.id, "H");
    const principal = await principalToken(tenant.id, branch.id);

    const createFirst = await request(app)
      .post("/api/v1/homework")
      .set("Authorization", `Bearer ${principal}`)
      .send({
        branchId: branch.id,
        sectionId: section.id,
        subjectId: subject.id,
        title: "Old homework",
        description: "Before the cutoff",
        dueDate: "2025-07-01",
      });
    expect(createFirst.status).toBe(201);

    const cutoff = new Date();
    await new Promise((resolve) => setTimeout(resolve, 20));

    const createSecond = await request(app)
      .post("/api/v1/homework")
      .set("Authorization", `Bearer ${principal}`)
      .send({
        branchId: branch.id,
        sectionId: section.id,
        subjectId: subject.id,
        title: "New homework",
        description: "After the cutoff",
        dueDate: "2025-07-02",
      });
    expect(createSecond.status).toBe(201);

    const sinceRes = await request(app)
      .get(`/api/v1/homework?sectionId=${section.id}&since=${cutoff.toISOString()}`)
      .set("Authorization", `Bearer ${principal}`);

    expect(sinceRes.status).toBe(200);
    expect(sinceRes.body.data).toHaveLength(1);
    expect(sinceRes.body.data[0].title).toBe("New homework");
  });
});

describe("announcement SMS fallback for phone-only guardians (Unit 32)", () => {
  it("falls back to SMS (wallet-debited) for a class-audience guardian with no linked User account", async () => {
    const tenant = await createTenant("offline-sync-announcement-sms-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["announcement.send"]);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, section, session, students } = await setup(tenant.id, "N");
    await prisma.smsWallet.create({ data: { tenantId: tenant.id, balancePaise: 10_000 } });

    const guardian = await withTenant(tenant.id, (tx) =>
      tx.guardian.create({
        data: { tenantId: tenant.id, name: "Parent N", relation: "FATHER", phone: "+919812340099" },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.studentGuardian.create({
        data: { tenantId: tenant.id, studentId: students[0]!.id, guardianId: guardian.id, isPrimary: true, canPay: true },
      })
    );
    void section;
    void session;

    const res = await request(app)
      .post("/api/v1/announcements")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        title: "Exam schedule",
        body: "Exams start Monday",
        audience: { classIds: [cls.id] },
      });
    expect(res.status).toBe(201);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const log = await withTenant(tenant.id, (tx) =>
      tx.notificationLog.findFirst({
        where: { toPhone: guardian.phone, templateKey: "announcement.published" },
      })
    );
    expect(log).toBeTruthy();
    expect(log!.channel).toBe("SMS");
    expect(log!.status).toBe("SENT");

    const wallet = await prisma.smsWallet.findUnique({ where: { tenantId: tenant.id } });
    expect(wallet!.balancePaise).toBe(10_000 - 20);
  });
});

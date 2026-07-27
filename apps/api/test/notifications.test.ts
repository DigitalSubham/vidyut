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

async function accountantToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "accountant-1", tenantId, roles: ["ACCOUNTANT"], branchIds: [branchId] });
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
    tx.guardian.create({ data: { tenantId, name: `Guardian ${tag}`, relation: "FATHER", phone } })
  );
  await withTenant(tenantId, (tx) =>
    tx.studentGuardian.create({
      data: { tenantId, studentId: student.id, guardianId: guardian.id, isPrimary: true, canPay: true },
    })
  );
  return { student, guardian };
}

async function createOverdueInvoice(
  tenantId: string,
  branchId: string,
  sessionId: string,
  studentId: string,
  tag: string
) {
  const feeHead = await withTenant(tenantId, (tx) =>
    tx.feeHead.create({ data: { tenantId, branchId, name: `Tuition ${tag}`, type: "TUITION" } })
  );
  return withTenant(tenantId, (tx) =>
    tx.invoice.create({
      data: {
        tenantId,
        branchId,
        studentId,
        sessionId,
        number: `INV-${tag}`,
        periodLabel: `Period ${tag}`,
        dueDate: new Date("2020-01-01"), // well overdue
        items: { create: { tenantId, feeHeadId: feeHead.id, amount: 100000 } },
      },
    })
  );
}

async function waitForJob(jobId: string, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await request(app).get(`/api/v1/jobs/${jobId}`);
    const state = res.body.data?.state;
    if (state === "failed" || (state === "completed" && res.body.data?.returnValue != null)) {
      return res.body.data;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Job ${jobId} did not settle within ${timeoutMs}ms`);
}

describe("fee reminders — scan, wallet deduction, notification log", () => {
  it("sends a reminder for an overdue invoice with sufficient wallet balance, deducting the cost", async () => {
    const tenant = await createTenant("reminders-happy-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["notification.send", "fee.view"]);
    const owner = await ownerToken(tenant.id);
    await prisma.moduleToggle.create({ data: { tenantId: tenant.id, moduleKey: "fees", enabled: true } });
    await prisma.smsWallet.create({ data: { tenantId: tenant.id, balancePaise: 10000 } });

    const ctx = await setup(tenant.id, "A");
    const enrolled = await enrollStudentWithGuardian(
      tenant.id,
      ctx.branch.id,
      ctx.cls.id,
      ctx.section.id,
      ctx.session.id,
      "S2",
      "+919812340061"
    );
    await createOverdueInvoice(tenant.id, ctx.branch.id, ctx.session.id, enrolled.student.id, "1");

    const triggerRes = await request(app)
      .post("/api/v1/fees/reminders/run")
      .set("Authorization", `Bearer ${owner}`);
    expect(triggerRes.status).toBe(202);
    const scanJobId = triggerRes.body.data.jobId as string;
    const scanResult = await waitForJob(scanJobId);
    expect(scanResult.state).toBe("completed");
    expect(scanResult.returnValue.remindersEnqueued).toBeGreaterThanOrEqual(1);

    // Give the fan-out fees.reminderSend job(s) a moment to complete.
    await new Promise((resolve) => setTimeout(resolve, 500));

    const logs = await withTenant(tenant.id, (tx) =>
      tx.notificationLog.findMany({ where: { branchId: ctx.branch.id, templateKey: "fee.reminder" } })
    );
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs.some((l) => l.status === "SENT")).toBe(true);

    const wallet = await prisma.smsWallet.findUnique({ where: { tenantId: tenant.id } });
    expect(wallet!.balancePaise).toBeLessThan(10000);

    const walletTxns = await prisma.walletTxn.findMany({ where: { tenantId: tenant.id, type: "DEBIT" } });
    expect(walletTxns.length).toBeGreaterThanOrEqual(1);
  });

  it("skips sending and logs FAILED when the wallet balance is insufficient", async () => {
    const tenant = await createTenant("reminders-poorwallet-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["notification.send"]);
    const owner = await ownerToken(tenant.id);
    await prisma.moduleToggle.create({ data: { tenantId: tenant.id, moduleKey: "fees", enabled: true } });
    await prisma.smsWallet.create({ data: { tenantId: tenant.id, balancePaise: 0 } });

    const ctx = await setup(tenant.id, "A");
    const enrolled = await enrollStudentWithGuardian(
      tenant.id,
      ctx.branch.id,
      ctx.cls.id,
      ctx.section.id,
      ctx.session.id,
      "P1",
      "+919812340070"
    );
    await createOverdueInvoice(tenant.id, ctx.branch.id, ctx.session.id, enrolled.student.id, "P1");

    const triggerRes = await request(app)
      .post("/api/v1/fees/reminders/run")
      .set("Authorization", `Bearer ${owner}`);
    const scanResult = await waitForJob(triggerRes.body.data.jobId);
    expect(scanResult.state).toBe("completed");

    await new Promise((resolve) => setTimeout(resolve, 500));

    const logs = await withTenant(tenant.id, (tx) =>
      tx.notificationLog.findMany({ where: { branchId: ctx.branch.id, templateKey: "fee.reminder" } })
    );
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs.every((l) => l.status === "FAILED")).toBe(true);

    const wallet = await prisma.smsWallet.findUnique({ where: { tenantId: tenant.id } });
    expect(wallet!.balancePaise).toBe(0);
  });

  it("cross-tenant notification logs are invisible even to an unscoped query", async () => {
    const tenantA = await createTenant("reminders-isolation-a");
    const tenantB = await createTenant("reminders-isolation-b");
    tenantIds.push(tenantA.id, tenantB.id);
    const ctx = await setup(tenantA.id, "A");

    await withTenant(tenantA.id, (tx) =>
      tx.notificationLog.create({
        data: {
          tenantId: tenantA.id,
          branchId: ctx.branch.id,
          channel: "SMS",
          templateKey: "fee.reminder",
          toPhone: "+919812340099",
          status: "SENT",
        },
      })
    );

    const scoped = await withTenant(tenantB.id, (tx) => tx.notificationLog.findMany());
    expect(scoped).toHaveLength(0);

    const unscoped = await prisma.notificationLog.findMany({ where: { tenantId: tenantA.id } });
    expect(unscoped).toHaveLength(0);
  });

  it("RBAC: notification.send gates the manual trigger; fee.view gates the log list", async () => {
    const tenant = await createTenant("reminders-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "ACCOUNTANT", []);
    const branch = await createBranch(tenant.id, "A");
    const accountant = await accountantToken(tenant.id, branch.id);

    const triggerRes = await request(app)
      .post("/api/v1/fees/reminders/run")
      .set("Authorization", `Bearer ${accountant}`);
    expect(triggerRes.status).toBe(403);
    expect(triggerRes.body.error.code).toBe("FORBIDDEN");

    const listRes = await request(app)
      .get(`/api/v1/notifications?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${accountant}`);
    expect(listRes.status).toBe(403);
    expect(listRes.body.error.code).toBe("FORBIDDEN");
  });
});

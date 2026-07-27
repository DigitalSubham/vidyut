import { randomUUID } from "node:crypto";
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
    tx.enrollment.create({
      data: { tenantId, branchId, studentId: student.id, sessionId, classId, sectionId },
    })
  );
  return student;
}

describe("invoice generation", () => {
  it("expands fee-assignment + structure items into due-dated invoices, idempotently", async () => {
    const tenant = await createTenant("payments-generate-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["fee.setup", "fee.view"]);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, session, section } = await setup(tenant.id, "A");
    await enrollStudent(tenant.id, branch.id, cls.id, section.id, session.id, "S1");

    const feeHead = await withTenant(tenant.id, (tx) =>
      tx.feeHead.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "Tuition", type: "TUITION" } })
    );
    const structure = await withTenant(tenant.id, (tx) =>
      tx.feeStructure.create({
        data: { tenantId: tenant.id, branchId: branch.id, sessionId: session.id, classId: cls.id, name: "Structure A" },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.feeStructureItem.create({
        data: {
          tenantId: tenant.id,
          structureId: structure.id,
          feeHeadId: feeHead.id,
          amount: 500000,
          frequency: "MONTHLY",
          dueDayOfMonth: 5,
        },
      })
    );

    const assignRes = await request(app)
      .post(`/api/v1/fee-structures/${structure.id}/assign`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ classId: cls.id });
    expect(assignRes.status).toBe(200);
    expect(assignRes.body.data.assigned).toBe(1);

    const firstGen = await request(app)
      .post(`/api/v1/fee-structures/${structure.id}/generate-invoices`)
      .set("Authorization", `Bearer ${owner}`);
    expect(firstGen.status).toBe(200);
    expect(firstGen.body.data.invoicesCreated).toBe(12);
    expect(firstGen.body.data.itemsCreated).toBe(12);

    const secondGen = await request(app)
      .post(`/api/v1/fee-structures/${structure.id}/generate-invoices`)
      .set("Authorization", `Bearer ${owner}`);
    expect(secondGen.status).toBe(200);
    expect(secondGen.body.data.invoicesCreated).toBe(0);
    expect(secondGen.body.data.itemsCreated).toBe(0);

    const invoiceCount = await withTenant(tenant.id, (tx) =>
      tx.invoice.count({ where: { branchId: branch.id } })
    );
    expect(invoiceCount).toBe(12);
  });
});

describe("payments — idempotent counter collection, invoice status, receipt", () => {
  it("a payment is idempotent on repeated Idempotency-Key, updates invoice status, and creates a receipt", async () => {
    const tenant = await createTenant("payments-collect-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["fee.setup", "fees.collect", "fee.view"]);
    await createRoleWithPermissions(tenant.id, "PRINCIPAL", []);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, session, section } = await setup(tenant.id, "A");
    const student = await enrollStudent(tenant.id, branch.id, cls.id, section.id, session.id, "S1");

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
          number: "INV-TEST-1",
          periodLabel: "Apr 2025",
          dueDate: new Date("2025-04-05"),
          items: { create: { tenantId: tenant.id, feeHeadId: feeHead.id, amount: 100000 } },
        },
      })
    );

    const idempotencyKey = randomUUID();
    const firstPay = await request(app)
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${owner}`)
      .set("Idempotency-Key", idempotencyKey)
      .send({ branchId: branch.id, studentId: student.id, invoiceId: invoice.id, amount: 60000, mode: "CASH" });
    expect(firstPay.status).toBe(201);
    const paymentId = firstPay.body.data.id as string;

    const replayPay = await request(app)
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${owner}`)
      .set("Idempotency-Key", idempotencyKey)
      .send({ branchId: branch.id, studentId: student.id, invoiceId: invoice.id, amount: 60000, mode: "CASH" });
    expect(replayPay.status).toBe(200);
    expect(replayPay.body.data.id).toBe(paymentId);

    const paymentCount = await withTenant(tenant.id, (tx) => tx.payment.count({ where: { invoiceId: invoice.id } }));
    expect(paymentCount).toBe(1);

    const afterPartial = await withTenant(tenant.id, (tx) => tx.invoice.findUnique({ where: { id: invoice.id } }));
    expect(afterPartial?.status).toBe("PARTIAL");

    const secondPay = await request(app)
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${owner}`)
      .set("Idempotency-Key", randomUUID())
      .send({ branchId: branch.id, studentId: student.id, invoiceId: invoice.id, amount: 40000, mode: "UPI" });
    expect(secondPay.status).toBe(201);

    const afterFull = await withTenant(tenant.id, (tx) => tx.invoice.findUnique({ where: { id: invoice.id } }));
    expect(afterFull?.status).toBe("PAID");

    const receipt = await withTenant(tenant.id, (tx) => tx.receipt.findUnique({ where: { paymentId } }));
    expect(receipt).not.toBeNull();

    const principal = await principalToken(tenant.id, branch.id);
    const principalPay = await request(app)
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${principal}`)
      .set("Idempotency-Key", randomUUID())
      .send({ branchId: branch.id, studentId: student.id, invoiceId: invoice.id, amount: 1000, mode: "CASH" });
    expect(principalPay.status).toBe(403);
    expect(principalPay.body.error.code).toBe("FORBIDDEN");

    const missingKey = await request(app)
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, studentId: student.id, invoiceId: invoice.id, amount: 1000, mode: "CASH" });
    expect(missingKey.status).toBe(400);
    expect(missingKey.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("the fee ledger merges invoices and payments in chronological order", async () => {
    const tenant = await createTenant("payments-ledger-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["fee.setup", "fees.collect", "fee.view"]);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, session, section } = await setup(tenant.id, "A");
    const student = await enrollStudent(tenant.id, branch.id, cls.id, section.id, session.id, "S1");
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
          number: "INV-LEDGER-1",
          periodLabel: "Apr 2025",
          dueDate: new Date("2025-04-05"),
          items: { create: { tenantId: tenant.id, feeHeadId: feeHead.id, amount: 100000 } },
        },
      })
    );
    await request(app)
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${owner}`)
      .set("Idempotency-Key", randomUUID())
      .send({ branchId: branch.id, studentId: student.id, invoiceId: invoice.id, amount: 100000, mode: "CASH" });

    const ledgerRes = await request(app)
      .get(`/api/v1/students/${student.id}/fee-ledger`)
      .set("Authorization", `Bearer ${owner}`);
    expect(ledgerRes.status).toBe(200);
    expect(ledgerRes.body.data).toHaveLength(2);
    expect(ledgerRes.body.data.some((e: { type: string }) => e.type === "invoice")).toBe(true);
    expect(ledgerRes.body.data.some((e: { type: string }) => e.type === "payment")).toBe(true);
  });

  it("dues + defaulter reports report accurate outstanding amounts", async () => {
    const tenant = await createTenant("payments-reports-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "ACCOUNTANT", ["fee.setup", "fees.collect", "fee.reports"]);
    const { branch, cls, session, section } = await setup(tenant.id, "A");
    const student = await enrollStudent(tenant.id, branch.id, cls.id, section.id, session.id, "S1");
    const feeHead = await withTenant(tenant.id, (tx) =>
      tx.feeHead.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "Tuition", type: "TUITION" } })
    );

    // Overdue, unpaid.
    await withTenant(tenant.id, (tx) =>
      tx.invoice.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          studentId: student.id,
          sessionId: session.id,
          number: "INV-OVERDUE-1",
          periodLabel: "Apr 2025",
          dueDate: new Date("2020-01-01"),
          items: { create: { tenantId: tenant.id, feeHeadId: feeHead.id, amount: 100000 } },
        },
      })
    );
    // Not yet due, unpaid.
    await withTenant(tenant.id, (tx) =>
      tx.invoice.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          studentId: student.id,
          sessionId: session.id,
          number: "INV-FUTURE-1",
          periodLabel: "May 2099",
          dueDate: new Date("2099-01-01"),
          items: { create: { tenantId: tenant.id, feeHeadId: feeHead.id, amount: 50000 } },
        },
      })
    );

    const accountantWithBranch = await signAccessToken({
      sub: "accountant-2",
      tenantId: tenant.id,
      roles: ["ACCOUNTANT"],
      branchIds: [branch.id],
    });

    const duesRes = await request(app)
      .get(`/api/v1/fees/reports/dues?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${accountantWithBranch}`);
    expect(duesRes.status).toBe(200);
    expect(duesRes.body.data).toHaveLength(1);
    expect(duesRes.body.data[0].outstanding).toBe(150000);

    const defaultersRes = await request(app)
      .get(`/api/v1/fees/reports/defaulters?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${accountantWithBranch}`);
    expect(defaultersRes.status).toBe(200);
    expect(defaultersRes.body.data).toHaveLength(1);
    expect(defaultersRes.body.data[0].outstanding).toBe(100000);
  });

  it("opening balance seeds a collectible PENDING invoice, and rejects a duplicate", async () => {
    const tenant = await createTenant("payments-openingbalance-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["fee.setup"]);
    const owner = await ownerToken(tenant.id);
    const { branch, cls, session, section } = await setup(tenant.id, "A");
    const student = await enrollStudent(tenant.id, branch.id, cls.id, section.id, session.id, "S1");

    const res = await request(app)
      .post(`/api/v1/students/${student.id}/opening-balance`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, amount: 250000, dueDate: "2025-04-15" });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("PENDING");
    expect(res.body.data.items).toHaveLength(1);

    const duplicate = await request(app)
      .post(`/api/v1/students/${student.id}/opening-balance`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, amount: 100000, dueDate: "2025-04-15" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("CONFLICT");
  });

  it("cross-tenant invoices/payments are invisible even to an unscoped query", async () => {
    const tenantA = await createTenant("payments-isolation-a");
    const tenantB = await createTenant("payments-isolation-b");
    tenantIds.push(tenantA.id, tenantB.id);
    const { branch, cls, session, section } = await setup(tenantA.id, "A");
    const student = await enrollStudent(tenantA.id, branch.id, cls.id, section.id, session.id, "S1");
    const feeHead = await withTenant(tenantA.id, (tx) =>
      tx.feeHead.create({ data: { tenantId: tenantA.id, branchId: branch.id, name: "Tuition", type: "TUITION" } })
    );
    await withTenant(tenantA.id, (tx) =>
      tx.invoice.create({
        data: {
          tenantId: tenantA.id,
          branchId: branch.id,
          studentId: student.id,
          sessionId: session.id,
          number: "INV-ISO-1",
          periodLabel: "Iso",
          dueDate: new Date("2025-04-05"),
          items: { create: { tenantId: tenantA.id, feeHeadId: feeHead.id, amount: 100000 } },
        },
      })
    );

    const scoped = await withTenant(tenantB.id, (tx) => tx.invoice.findMany());
    expect(scoped).toHaveLength(0);

    const unscoped = await prisma.invoice.findMany({ where: { tenantId: tenantA.id } });
    expect(unscoped).toHaveLength(0);
  });

  it("branch-scope: an ACCOUNTANT on Branch A is denied Branch B's invoices", async () => {
    const tenant = await createTenant("payments-branchscope-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "ACCOUNTANT", ["fee.view"]);
    const branchA = await createBranch(tenant.id, "A");
    const branchB = await createBranch(tenant.id, "B");
    const accountantA = await accountantToken(tenant.id, branchA.id);

    const res = await request(app)
      .get(`/api/v1/invoices?branchId=${branchB.id}`)
      .set("Authorization", `Bearer ${accountantA}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

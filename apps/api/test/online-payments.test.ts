import { createHmac, randomUUID } from "node:crypto";
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
const WEBHOOK_SECRET = "dev-razorpay-webhook-secret-change-me";

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

async function enableOnlinePayment(tenantId: string) {
  await prisma.moduleToggle.create({ data: { tenantId, moduleKey: "online_payment", enabled: true } });
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
    tx.enrollment.create({ data: { tenantId, branchId, studentId: student.id, sessionId, classId, sectionId } })
  );
  return student;
}

function signWebhook(body: string): string {
  return createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
}

describe("online payment initiation — module gate + self-scope", () => {
  it("is blocked with 403 MODULE_DISABLED when online_payment isn't enabled for the tenant", async () => {
    const tenant = await createTenant("online-gate-tenant");
    tenantIds.push(tenant.id);
    const { branch, cls, session, section } = await setup(tenant.id, "A");
    const student = await enrollStudent(tenant.id, branch.id, cls.id, section.id, session.id, "S1");
    const owner = await ownerToken(tenant.id);

    const res = await request(app)
      .post("/api/v1/payments/online/initiate")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, studentId: student.id, amount: 50000, mode: "UPI" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("MODULE_DISABLED");
  });

  it("a PARENT can initiate for their own linked child, but not for another student", async () => {
    const tenant = await createTenant("online-selfscope-tenant");
    tenantIds.push(tenant.id);
    await enableOnlinePayment(tenant.id);
    const { branch, cls, session, section } = await setup(tenant.id, "A");
    const ownChild = await enrollStudent(tenant.id, branch.id, cls.id, section.id, session.id, "Own");
    const otherChild = await enrollStudent(tenant.id, branch.id, cls.id, section.id, session.id, "Other");

    const parentUser = await withTenant(tenant.id, (tx) =>
      tx.user.create({ data: { tenantId: tenant.id, name: "Parent", phone: "+919812340050", status: "ACTIVE" } })
    );
    const guardian = await withTenant(tenant.id, (tx) =>
      tx.guardian.create({
        data: { tenantId: tenant.id, userId: parentUser.id, name: "Parent", relation: "FATHER", phone: "+919812340050" },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.studentGuardian.create({
        data: { tenantId: tenant.id, studentId: ownChild.id, guardianId: guardian.id, isPrimary: true, canPay: true },
      })
    );

    const parentToken = await signAccessToken({
      sub: parentUser.id,
      tenantId: tenant.id,
      roles: ["PARENT"],
      branchIds: [],
    });

    const ownRes = await request(app)
      .post("/api/v1/payments/online/initiate")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ branchId: branch.id, studentId: ownChild.id, amount: 50000, mode: "UPI" });
    expect(ownRes.status).toBe(201);
    expect(ownRes.body.data.gatewayOrderId).toBeTypeOf("string");

    const otherRes = await request(app)
      .post("/api/v1/payments/online/initiate")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ branchId: branch.id, studentId: otherChild.id, amount: 50000, mode: "UPI" });
    expect(otherRes.status).toBe(403);
    expect(otherRes.body.error.code).toBe("FORBIDDEN");
  });
});

describe("razorpay webhook — real HMAC verification", () => {
  it("a validly-signed payment.captured event completes the payment; an invalid signature is rejected", async () => {
    const tenant = await createTenant("online-webhook-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["fees.collect"]);
    await enableOnlinePayment(tenant.id);
    const { branch, cls, session, section } = await setup(tenant.id, "A");
    const student = await enrollStudent(tenant.id, branch.id, cls.id, section.id, session.id, "S1");
    const owner = await ownerToken(tenant.id);

    const initiateRes = await request(app)
      .post("/api/v1/payments/online/initiate")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, studentId: student.id, amount: 75000, mode: "UPI" });
    expect(initiateRes.status).toBe(201);
    const { paymentId } = initiateRes.body.data as { paymentId: string };

    const bodyObj = {
      event: "payment.captured",
      payload: {
        payment: { entity: { id: "pay_stub_1", order_id: "order_stub", notes: { tenantId: tenant.id, paymentId } } },
      },
    };
    const bodyStr = JSON.stringify(bodyObj);

    const badSigRes = await request(app)
      .post("/api/v1/webhooks/razorpay")
      .set("Content-Type", "application/json")
      .set("X-Razorpay-Signature", "not-a-real-signature")
      .send(bodyStr);
    expect(badSigRes.status).toBe(400);

    const stillPending = await withTenant(tenant.id, (tx) => tx.payment.findUnique({ where: { id: paymentId } }));
    expect(stillPending?.status).toBe("PENDING");

    const goodSig = signWebhook(bodyStr);
    const goodRes = await request(app)
      .post("/api/v1/webhooks/razorpay")
      .set("Content-Type", "application/json")
      .set("X-Razorpay-Signature", goodSig)
      .send(bodyStr);
    expect(goodRes.status).toBe(204);

    const succeeded = await withTenant(tenant.id, (tx) => tx.payment.findUnique({ where: { id: paymentId } }));
    expect(succeeded?.status).toBe("SUCCESS");

    const receipt = await withTenant(tenant.id, (tx) => tx.receipt.findUnique({ where: { paymentId } }));
    expect(receipt).not.toBeNull();
  });

  it("a payment.failed event sets status FAILED", async () => {
    const tenant = await createTenant("online-webhook-failed-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["fees.collect"]);
    await enableOnlinePayment(tenant.id);
    const { branch, cls, session, section } = await setup(tenant.id, "A");
    const student = await enrollStudent(tenant.id, branch.id, cls.id, section.id, session.id, "S1");
    const owner = await ownerToken(tenant.id);

    const initiateRes = await request(app)
      .post("/api/v1/payments/online/initiate")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, studentId: student.id, amount: 30000, mode: "CARD" });
    const { paymentId } = initiateRes.body.data as { paymentId: string };

    const bodyStr = JSON.stringify({
      event: "payment.failed",
      payload: { payment: { entity: { id: "pay_stub_2", order_id: "order_stub", notes: { tenantId: tenant.id, paymentId } } } },
    });

    const res = await request(app)
      .post("/api/v1/webhooks/razorpay")
      .set("Content-Type", "application/json")
      .set("X-Razorpay-Signature", signWebhook(bodyStr))
      .send(bodyStr);
    expect(res.status).toBe(204);

    const failed = await withTenant(tenant.id, (tx) => tx.payment.findUnique({ where: { id: paymentId } }));
    expect(failed?.status).toBe("FAILED");
  });
});

describe("refunds — request -> approve/reject, RBAC, branch-scope, tenant-isolation", () => {
  it("approving a refund request sets Payment.status REFUNDED and reduces the invoice's paid total", async () => {
    const tenant = await createTenant("online-refund-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["fee.setup", "fees.collect", "fee.refund"]);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
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
          number: "INV-REFUND-1",
          periodLabel: "Apr 2025",
          dueDate: new Date("2025-04-05"),
          items: { create: { tenantId: tenant.id, feeHeadId: feeHead.id, amount: 100000 } },
        },
      })
    );

    const payRes = await request(app)
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${owner}`)
      .set("Idempotency-Key", randomUUID())
      .send({ branchId: branch.id, studentId: student.id, invoiceId: invoice.id, amount: 100000, mode: "CASH" });
    expect(payRes.status).toBe(201);
    const paymentId = payRes.body.data.id as string;

    const afterPaid = await withTenant(tenant.id, (tx) => tx.invoice.findUnique({ where: { id: invoice.id } }));
    expect(afterPaid?.status).toBe("PAID");

    const requestRes = await request(app)
      .post(`/api/v1/payments/${paymentId}/refund-request`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ amount: 100000, reason: "Duplicate payment" });
    expect(requestRes.status).toBe(201);
    expect(requestRes.body.data.status).toBe("PENDING");
    const refundRequestId = requestRes.body.data.id as string;

    const teacher = await signAccessToken({ sub: "teacher-1", tenantId: tenant.id, roles: ["TEACHER"], branchIds: [branch.id] });
    const teacherDecide = await request(app)
      .patch(`/api/v1/refund-requests/${refundRequestId}/decide`)
      .set("Authorization", `Bearer ${teacher}`)
      .send({ status: "APPROVED" });
    expect(teacherDecide.status).toBe(403);
    expect(teacherDecide.body.error.code).toBe("FORBIDDEN");

    const decideRes = await request(app)
      .patch(`/api/v1/refund-requests/${refundRequestId}/decide`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ status: "APPROVED" });
    expect(decideRes.status).toBe(200);
    expect(decideRes.body.data.status).toBe("APPROVED");

    const refundedPayment = await withTenant(tenant.id, (tx) => tx.payment.findUnique({ where: { id: paymentId } }));
    expect(refundedPayment?.status).toBe("REFUNDED");

    const afterRefund = await withTenant(tenant.id, (tx) => tx.invoice.findUnique({ where: { id: invoice.id } }));
    expect(afterRefund?.status).toBe("PENDING");
  });

  it("branch-scope: an ACCOUNTANT on Branch A is denied deciding a Branch B refund request", async () => {
    const tenant = await createTenant("online-refund-branchscope-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["fee.setup", "fees.collect", "fee.refund"]);
    await createRoleWithPermissions(tenant.id, "ACCOUNTANT", ["fee.refund"]);
    const owner = await ownerToken(tenant.id);
    const branchA = await setup(tenant.id, "A");
    const branchB = await setup(tenant.id, "B");
    const studentB = await enrollStudent(
      tenant.id,
      branchB.branch.id,
      branchB.cls.id,
      branchB.section.id,
      branchB.session.id,
      "SB"
    );
    const feeHeadB = await withTenant(tenant.id, (tx) =>
      tx.feeHead.create({ data: { tenantId: tenant.id, branchId: branchB.branch.id, name: "Tuition", type: "TUITION" } })
    );
    const invoiceB = await withTenant(tenant.id, (tx) =>
      tx.invoice.create({
        data: {
          tenantId: tenant.id,
          branchId: branchB.branch.id,
          studentId: studentB.id,
          sessionId: branchB.session.id,
          number: "INV-B-1",
          periodLabel: "Apr 2025",
          dueDate: new Date("2025-04-05"),
          items: { create: { tenantId: tenant.id, feeHeadId: feeHeadB.id, amount: 50000 } },
        },
      })
    );
    const payRes = await request(app)
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${owner}`)
      .set("Idempotency-Key", randomUUID())
      .send({ branchId: branchB.branch.id, studentId: studentB.id, invoiceId: invoiceB.id, amount: 50000, mode: "CASH" });
    const refundRes = await request(app)
      .post(`/api/v1/payments/${payRes.body.data.id}/refund-request`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ amount: 50000, reason: "Test" });

    const accountantA = await accountantToken(tenant.id, branchA.branch.id);
    const decideRes = await request(app)
      .patch(`/api/v1/refund-requests/${refundRes.body.data.id}/decide`)
      .set("Authorization", `Bearer ${accountantA}`)
      .send({ status: "APPROVED" });
    expect(decideRes.status).toBe(403);
    expect(decideRes.body.error.code).toBe("FORBIDDEN");
  });

  it("cross-tenant refund requests are invisible even to an unscoped query", async () => {
    const tenantA = await createTenant("online-refund-isolation-a");
    const tenantB = await createTenant("online-refund-isolation-b");
    tenantIds.push(tenantA.id, tenantB.id);
    await createRoleWithPermissions(tenantA.id, "OWNER", ["fee.setup", "fees.collect", "fee.refund"]);
    const owner = await ownerToken(tenantA.id);
    const { branch, cls, session, section } = await setup(tenantA.id, "A");
    const student = await enrollStudent(tenantA.id, branch.id, cls.id, section.id, session.id, "S1");
    const feeHead = await withTenant(tenantA.id, (tx) =>
      tx.feeHead.create({ data: { tenantId: tenantA.id, branchId: branch.id, name: "Tuition", type: "TUITION" } })
    );
    const invoice = await withTenant(tenantA.id, (tx) =>
      tx.invoice.create({
        data: {
          tenantId: tenantA.id,
          branchId: branch.id,
          studentId: student.id,
          sessionId: session.id,
          number: "INV-ISO-1",
          periodLabel: "Apr 2025",
          dueDate: new Date("2025-04-05"),
          items: { create: { tenantId: tenantA.id, feeHeadId: feeHead.id, amount: 20000 } },
        },
      })
    );
    const payRes = await request(app)
      .post("/api/v1/payments")
      .set("Authorization", `Bearer ${owner}`)
      .set("Idempotency-Key", randomUUID())
      .send({ branchId: branch.id, studentId: student.id, invoiceId: invoice.id, amount: 20000, mode: "CASH" });
    await withTenant(tenantA.id, (tx) =>
      tx.refundRequest.create({
        data: {
          tenantId: tenantA.id,
          branchId: branch.id,
          paymentId: payRes.body.data.id,
          amount: 20000,
          reason: "Iso test",
          requestedById: "owner-1",
        },
      })
    );

    const scoped = await withTenant(tenantB.id, (tx) => tx.refundRequest.findMany());
    expect(scoped).toHaveLength(0);

    const unscoped = await prisma.refundRequest.findMany({ where: { tenantId: tenantA.id } });
    expect(unscoped).toHaveLength(0);
  });
});

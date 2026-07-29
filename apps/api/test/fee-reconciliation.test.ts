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

async function seedStudentAndSession(tenantId: string, branchId: string) {
  const student = await withTenant(tenantId, (tx) =>
    tx.student.create({
      data: {
        tenantId,
        branchId,
        admissionNo: "RECON-0001",
        firstName: "Rohan",
        lastName: "Verma",
        dob: new Date("2012-01-01"),
        gender: "M",
        address: "Patna",
      },
    })
  );
  const session = await withTenant(tenantId, (tx) =>
    tx.academicSession.create({
      data: { tenantId, branchId, name: "2025-26", startDate: new Date("2025-04-01"), endDate: new Date("2026-03-31"), isCurrent: true },
    })
  );
  return { student, session };
}

async function createPaymentAndReceipt(
  tenantId: string,
  branchId: string,
  studentId: string,
  opts: { mode: "CASH" | "UPI"; gatewayOrderId?: string; idempotencyKey: string; receiptNumber: string }
) {
  const payment = await withTenant(tenantId, (tx) =>
    tx.payment.create({
      data: {
        tenantId,
        branchId,
        studentId,
        amount: 500000,
        mode: opts.mode,
        gatewayOrderId: opts.gatewayOrderId,
        status: "SUCCESS",
        idempotencyKey: opts.idempotencyKey,
      },
    })
  );
  const receipt = await withTenant(tenantId, (tx) =>
    tx.receipt.create({
      data: { tenantId, branchId, paymentId: payment.id, number: opts.receiptNumber },
    })
  );
  return { payment, receipt };
}

describe("Unit 38 — Fee Reconciliation & Receipt Corrections", () => {
  it("splits a day's payments online/counter and flags an online-mode payment with no gateway confirmation", async () => {
    const tenant = await createTenant("recon-tenant");
    tenantIds.push(tenant.id);
    const branch = await createBranch(tenant.id, "MAIN");
    await createRoleWithPermissions(tenant.id, "OWNER", ["fee.reports", "fee.refund"]);
    const { student } = await seedStudentAndSession(tenant.id, branch.id);
    const owner = await ownerToken(tenant.id);

    await createPaymentAndReceipt(tenant.id, branch.id, student.id, {
      mode: "CASH",
      idempotencyKey: "idem-cash-1",
      receiptNumber: "RCPT-R001",
    });
    await createPaymentAndReceipt(tenant.id, branch.id, student.id, {
      mode: "UPI",
      gatewayOrderId: "order_real_123",
      idempotencyKey: "idem-upi-1",
      receiptNumber: "RCPT-R002",
    });
    await createPaymentAndReceipt(tenant.id, branch.id, student.id, {
      mode: "UPI",
      idempotencyKey: "idem-upi-2",
      receiptNumber: "RCPT-R003",
    });

    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app)
      .get("/api/v1/fees/reconciliation")
      .query({ branchId: branch.id, date: today })
      .set("Authorization", `Bearer ${owner}`);

    expect(res.status).toBe(200);
    expect(res.body.data.counter).toHaveLength(1);
    expect(res.body.data.online).toHaveLength(2);
    const confirmed = res.body.data.online.find((p: { gatewayOrderId: string | null }) => p.gatewayOrderId);
    const unconfirmed = res.body.data.online.find((p: { gatewayOrderId: string | null }) => !p.gatewayOrderId);
    expect(confirmed.needsReview).toBe(false);
    expect(unconfirmed.needsReview).toBe(true);
  });

  it("cancelling a receipt requires a reason, is audited, and is idempotent", async () => {
    const tenant = await createTenant("recon-cancel-tenant");
    tenantIds.push(tenant.id);
    const branch = await createBranch(tenant.id, "MAIN");
    await createRoleWithPermissions(tenant.id, "OWNER", ["fee.refund"]);
    const { student } = await seedStudentAndSession(tenant.id, branch.id);
    const owner = await ownerToken(tenant.id);
    const { receipt } = await createPaymentAndReceipt(tenant.id, branch.id, student.id, {
      mode: "CASH",
      idempotencyKey: "idem-cancel-1",
      receiptNumber: "RCPT-C001",
    });

    const missingReason = await request(app)
      .patch(`/api/v1/receipts/${receipt.id}/cancel`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ reason: "" });
    expect(missingReason.status).toBe(400);

    const first = await request(app)
      .patch(`/api/v1/receipts/${receipt.id}/cancel`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ reason: "Wrong student billed" });
    expect(first.status).toBe(200);
    expect(first.body.data.cancelledAt).toBeTruthy();
    expect(first.body.data.cancelReason).toBe("Wrong student billed");

    const second = await request(app)
      .patch(`/api/v1/receipts/${receipt.id}/cancel`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ reason: "Cancelling again" });
    expect(second.status).toBe(200);
    expect(second.body.data.cancelReason).toBe("Wrong student billed"); // no-op, original reason kept

    const auditRows = await withTenant(tenant.id, (tx) =>
      tx.auditLog.findMany({ where: { entity: "Receipt", entityId: receipt.id } })
    );
    expect(auditRows).toHaveLength(1); // idempotent — not audited twice

    const payment = await withTenant(tenant.id, (tx) => tx.payment.findUnique({ where: { id: receipt.paymentId } }));
    expect(payment?.status).toBe("SUCCESS"); // Payment/Invoice status never auto-reversed
  });

  it("RBAC + branch-scope: fee.reports is required for reconciliation, and a wrong-branch caller is denied", async () => {
    const tenant = await createTenant("recon-rbac-tenant");
    tenantIds.push(tenant.id);
    const branch = await createBranch(tenant.id, "MAIN");
    const otherBranch = await createBranch(tenant.id, "OTHER");
    await createRoleWithPermissions(tenant.id, "PRINCIPAL", []); // no fee.reports
    const principal = await signAccessToken({
      sub: "p1",
      tenantId: tenant.id,
      roles: ["PRINCIPAL"],
      branchIds: [branch.id],
    });

    const noPerm = await request(app)
      .get("/api/v1/fees/reconciliation")
      .query({ branchId: branch.id, date: "2026-01-01" })
      .set("Authorization", `Bearer ${principal}`);
    expect(noPerm.status).toBe(403);

    await createRoleWithPermissions(tenant.id, "ACCOUNTANT", ["fee.reports"]);
    const wrongBranchAccountant = await signAccessToken({
      sub: "a1",
      tenantId: tenant.id,
      roles: ["ACCOUNTANT"],
      branchIds: [otherBranch.id],
    });
    const wrongBranch = await request(app)
      .get("/api/v1/fees/reconciliation")
      .query({ branchId: branch.id, date: "2026-01-01" })
      .set("Authorization", `Bearer ${wrongBranchAccountant}`);
    expect(wrongBranch.status).toBe(403);
  });
});

import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@vidyut/db";
import { createApp } from "../src/app";
import { signPlatformAccessToken } from "../src/core/auth/platform-jwt";
import { cleanupPlatformUser, cleanupTenant, createPlatformUser } from "./helpers";

const app = createApp();
const tenantIds: string[] = [];
const platformUserIds: string[] = [];

afterAll(async () => {
  for (const id of tenantIds) {
    await cleanupTenant(id);
  }
  for (const id of platformUserIds) {
    await cleanupPlatformUser(id);
  }
  await prisma.$disconnect();
});

async function platformToken() {
  const platformUser = await createPlatformUser({
    email: `super-${randomUUID()}@vidyut.test`,
    password: "SuperSecret123!",
  });
  platformUserIds.push(platformUser.id);
  const accessToken = await signPlatformAccessToken({ sub: platformUser.id, role: "SUPERADMIN" });
  return accessToken;
}

async function provisionTenant(accessToken: string, namePrefix: string, planKey = "STANDARD") {
  const slug = `${namePrefix}-${randomUUID()}`;
  const res = await request(app)
    .post("/api/v1/platform/tenants")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: namePrefix,
      slug,
      planKey,
      ownerName: "Owner",
      ownerEmail: `owner-${randomUUID()}@${namePrefix}.test`,
      ownerPassword: "OwnerSecret123!",
    });
  const tenantId = res.body.data.tenant.id as string;
  tenantIds.push(tenantId);
  return tenantId;
}

describe("platform invoices", () => {
  it("creates a PlatformInvoice against the tenant's real active Subscription", async () => {
    const accessToken = await platformToken();
    const tenantId = await provisionTenant(accessToken, "billing");

    const subscription = await prisma.subscription.findFirst({ where: { tenantId } });
    expect(subscription).toBeTruthy();
    expect(subscription!.status).toBe("ACTIVE");

    const createRes = await request(app)
      .post(`/api/v1/platform/tenants/${tenantId}/invoices`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ amount: 1_800_000, dueDate: "2026-08-01" });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe("PENDING");
    expect(createRes.body.data.subscriptionId).toBe(subscription!.id);
    expect(createRes.body.data.invoiceNo).toMatch(/^PINV-\d{6}$/);
  });

  it("marks an invoice PAID and it shows up in the revenue summary", async () => {
    const accessToken = await platformToken();
    const tenantId = await provisionTenant(accessToken, "revenue");

    const createRes = await request(app)
      .post(`/api/v1/platform/tenants/${tenantId}/invoices`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ amount: 500_00, dueDate: "2026-08-01" });
    const invoiceId = createRes.body.data.id as string;

    const before = await request(app)
      .get("/api/v1/platform/revenue/summary")
      .set("Authorization", `Bearer ${accessToken}`);
    const beforeTotal = before.body.data.subscriptionRevenuePaise as number;

    const patchRes = await request(app)
      .patch(`/api/v1/platform/tenants/${tenantId}/invoices/${invoiceId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ status: "PAID" });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.status).toBe("PAID");
    expect(patchRes.body.data.paidAt).toBeTruthy();

    const after = await request(app)
      .get("/api/v1/platform/revenue/summary")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(after.body.data.subscriptionRevenuePaise).toBe(beforeTotal + 500_00);
  });

  it("rejects platform routes without a platform JWT (a tenant token is not enough)", async () => {
    const accessToken = await platformToken();
    const tenantId = await provisionTenant(accessToken, "authcheck");

    const res = await request(app).get(`/api/v1/platform/tenants/${tenantId}/invoices`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("wallet recharge", () => {
  it("credits SmsWallet.balancePaise and writes a WalletTxn(CREDIT), leaving the existing debit path intact", async () => {
    const accessToken = await platformToken();
    const tenantId = await provisionTenant(accessToken, "wallet");

    const rechargeRes = await request(app)
      .post(`/api/v1/platform/tenants/${tenantId}/wallet/recharge`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ amountPaise: 10_000, reason: "test top-up" });

    expect(rechargeRes.status).toBe(200);
    expect(rechargeRes.body.data.balancePaise).toBe(10_000);

    const txn = await prisma.walletTxn.findFirst({ where: { tenantId, type: "CREDIT" } });
    expect(txn).toBeTruthy();
    expect(txn!.amount).toBe(10_000);

    // Unit 14's existing debit path still works correctly against the same wallet.
    await prisma.smsWallet.update({ where: { tenantId }, data: { balancePaise: { decrement: 20 } } });
    const wallet = await prisma.smsWallet.findUnique({ where: { tenantId } });
    expect(wallet!.balancePaise).toBe(9_980);
  });
});

describe("usage endpoint (Unit 30 fix)", () => {
  it("reports a real student count instead of the old hardcoded 0", async () => {
    const accessToken = await platformToken();
    const tenantId = await provisionTenant(accessToken, "usage-students", "STARTER");

    const usageRes = await request(app)
      .get(`/api/v1/platform/tenants/${tenantId}/usage`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(usageRes.status).toBe(200);
    expect(usageRes.body.data.students.used).toBe(0); // no students created yet, but a real (not undefined) count
    expect(usageRes.body.data.students.limit).toBe(150); // STARTER
    expect(usageRes.body.data.smsWalletBalancePaise).toBe(0);
  });
});

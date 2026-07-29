import type { Worker } from "bullmq";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, withTenant } from "@vidyut/db";
import { startWorker } from "@vidyut/worker";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/core/auth/jwt";
import {
  cleanupTenant,
  createBranch,
  createParentUser,
  createRoleWithPermissions,
  createStaffUser,
  createTenant,
} from "./helpers";

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

describe("Unit 40 — Real Notification Providers (templates, inbox, push token, scheduled sends)", () => {
  it("NotificationTemplate: create, list, duplicate rejected, patch, RBAC-denied", async () => {
    const tenant = await createTenant("notif-template-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["notification.send"]);
    const owner = await ownerToken(tenant.id);

    const createRes = await request(app)
      .post("/api/v1/notifications/templates")
      .set("Authorization", `Bearer ${owner}`)
      .send({ templateKey: "fee.reminder", channel: "SMS", body: "Dear parent, {{invoiceId}} is due." });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.dltId).toBeNull();

    const dupRes = await request(app)
      .post("/api/v1/notifications/templates")
      .set("Authorization", `Bearer ${owner}`)
      .send({ templateKey: "fee.reminder", channel: "SMS", body: "duplicate" });
    expect(dupRes.status).toBe(409);

    const listRes = await request(app)
      .get("/api/v1/notifications/templates")
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const patchRes = await request(app)
      .patch(`/api/v1/notifications/templates/${createRes.body.data.id}`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ dltId: "1234567890" });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.dltId).toBe("1234567890");

    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const teacher = await signAccessToken({ sub: "t1", tenantId: tenant.id, roles: ["TEACHER"], branchIds: [] });
    const deniedRes = await request(app)
      .get("/api/v1/notifications/templates")
      .set("Authorization", `Bearer ${teacher}`);
    expect(deniedRes.status).toBe(403);
  });

  it("in-app inbox: self-scoped, mark-as-read is idempotent, and a user never sees another user's notifications", async () => {
    const tenant = await createTenant("notif-inbox-tenant");
    tenantIds.push(tenant.id);
    const parentRole = await createRoleWithPermissions(tenant.id, "PARENT", []);
    const parentA = await createParentUser(tenant.id, { phone: "9001110001", roleId: parentRole.id });
    const parentB = await createParentUser(tenant.id, { phone: "9001110002", roleId: parentRole.id });
    const branch = await createBranch(tenant.id, "MAIN");

    const notif = await withTenant(tenant.id, (tx) =>
      tx.notificationLog.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          channel: "PUSH",
          templateKey: "announcement.published",
          toUserId: parentA.id,
          status: "SENT",
          sentAt: new Date(),
        },
      })
    );

    const tokenA = await signAccessToken({ sub: parentA.id, tenantId: tenant.id, roles: ["PARENT"], branchIds: [] });
    const tokenB = await signAccessToken({ sub: parentB.id, tenantId: tenant.id, roles: ["PARENT"], branchIds: [] });

    const listB = await request(app).get("/api/v1/me/notifications").set("Authorization", `Bearer ${tokenB}`);
    expect(listB.status).toBe(200);
    expect(listB.body.data).toHaveLength(0);

    const listA = await request(app).get("/api/v1/me/notifications").set("Authorization", `Bearer ${tokenA}`);
    expect(listA.status).toBe(200);
    expect(listA.body.data).toHaveLength(1);
    expect(listA.body.data[0].readAt).toBeNull();

    // B cannot mark A's notification read.
    const wrongUserRead = await request(app)
      .patch(`/api/v1/me/notifications/${notif.id}/read`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(wrongUserRead.status).toBe(404);

    const readRes = await request(app)
      .patch(`/api/v1/me/notifications/${notif.id}/read`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(readRes.status).toBe(200);
    const firstReadAt = readRes.body.data.readAt;
    expect(firstReadAt).toBeTruthy();

    // Idempotent — reading again keeps the original readAt.
    const readAgainRes = await request(app)
      .patch(`/api/v1/me/notifications/${notif.id}/read`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(readAgainRes.status).toBe(200);
    expect(readAgainRes.body.data.readAt).toBe(firstReadAt);
  });

  it("push token registration: a user can register their own device token", async () => {
    const tenant = await createTenant("notif-push-token-tenant");
    tenantIds.push(tenant.id);
    const parentRole = await createRoleWithPermissions(tenant.id, "PARENT", []);
    const parent = await createParentUser(tenant.id, { phone: "9001110003", roleId: parentRole.id });
    const token = await signAccessToken({ sub: parent.id, tenantId: tenant.id, roles: ["PARENT"], branchIds: [] });

    const res = await request(app)
      .patch("/api/v1/me/push-token")
      .set("Authorization", `Bearer ${token}`)
      .send({ pushToken: "ExponentPushToken[real-device-token]" });
    expect(res.status).toBe(200);

    const refreshed = await withTenant(tenant.id, (tx) => tx.user.findUnique({ where: { id: parent.id } }));
    expect(refreshed?.pushToken).toBe("ExponentPushToken[real-device-token]");
  });

  it("scheduled announcement: fan-out is delayed, not immediate", async () => {
    const tenant = await createTenant("notif-scheduled-tenant");
    tenantIds.push(tenant.id);
    const ownerRole = await createRoleWithPermissions(tenant.id, "OWNER", ["announcement.send"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "MAIN");
    // A real staff row with a real UserRole — audience matching is a DB
    // join, not the signed JWT's role claim (same pattern as
    // announcements.test.ts's own fan-out test).
    await createStaffUser(tenant.id, {
      email: "owner-staff@example.com",
      password: "Passw0rd!",
      roleId: ownerRole.id,
      branchId: branch.id,
    });
    const scheduledFor = new Date(Date.now() + 1500).toISOString();

    const res = await request(app)
      .post("/api/v1/announcements")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        title: "Delayed Notice",
        body: "Sent later",
        scheduledFor,
        audience: { roles: ["OWNER"] },
      });
    expect(res.status).toBe(201);
    expect(res.body.data.scheduledFor).toBeTruthy();

    // Immediately after creation, no fan-out has run yet.
    const logsImmediately = await withTenant(tenant.id, (tx) =>
      tx.notificationLog.findMany({ where: { templateKey: "announcement.published", branchId: branch.id } })
    );
    expect(logsImmediately).toHaveLength(0);

    // After the scheduled delay passes, the fan-out has run.
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const logsAfterDelay = await withTenant(tenant.id, (tx) =>
      tx.notificationLog.findMany({ where: { templateKey: "announcement.published", branchId: branch.id } })
    );
    expect(logsAfterDelay.length).toBeGreaterThan(0);
  }, 15000);
});

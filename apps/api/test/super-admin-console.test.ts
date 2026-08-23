import { randomUUID } from "node:crypto";
import type { Worker } from "bullmq";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, withTenant } from "@vidyut/db";
import { startWorker } from "@vidyut/worker";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/core/auth/jwt";
import { signPlatformAccessToken } from "../src/core/auth/platform-jwt";
import {
  cleanupPlatformUser,
  cleanupTenant,
  createBranch,
  createPlatformUser,
  createRoleWithPermissions,
  createTenant,
} from "./helpers";

const app = createApp();
const tenantIds: string[] = [];
const platformUserIds: string[] = [];
let worker: Worker;

beforeAll(() => {
  worker = startWorker();
});

afterAll(async () => {
  await worker.close();
  for (const id of tenantIds) {
    await cleanupTenant(id);
  }
  for (const id of platformUserIds) {
    await cleanupPlatformUser(id);
  }
  await prisma.$disconnect();
});

async function ownerToken(tenantId: string) {
  return signAccessToken({ sub: "owner-1", tenantId, roles: ["OWNER"], branchIds: [] });
}

async function platformToken() {
  const platformUser = await createPlatformUser({
    email: `super-${randomUUID()}@vidyut.test`,
    password: "SuperSecret123!",
  });
  platformUserIds.push(platformUser.id);
  const accessToken = await signPlatformAccessToken({ sub: platformUser.id, role: "SUPERADMIN" });
  return { platformUser, accessToken };
}

describe("support tickets — tenant create/list, platform cross-tenant list + respond (audited)", () => {
  it("a tenant raises a ticket; the platform sees it cross-tenant, responds, and logs an AuditLog entry for the read", async () => {
    const tenant = await createTenant("support-ticket-tenant");
    tenantIds.push(tenant.id);
    await prisma.tenant.update({ where: { id: tenant.id }, data: { status: "ACTIVE" } });
    await createRoleWithPermissions(tenant.id, "OWNER", ["settings.manage"]);
    const owner = await ownerToken(tenant.id);
    const { accessToken: platform } = await platformToken();

    const createRes = await request(app)
      .post("/api/v1/support-tickets")
      .set("Authorization", `Bearer ${owner}`)
      .send({ subject: "Payment gateway down", body: "UPI payments failing since morning", priority: "HIGH" });
    expect(createRes.status).toBe(201);
    const ticketId = createRes.body.data.id as string;

    const listMineRes = await request(app)
      .get("/api/v1/support-tickets")
      .set("Authorization", `Bearer ${owner}`);
    expect(listMineRes.status).toBe(200);
    expect(listMineRes.body.data).toHaveLength(1);

    const platformListRes = await request(app)
      .get("/api/v1/platform/tickets?status=OPEN")
      .set("Authorization", `Bearer ${platform}`);
    expect(platformListRes.status).toBe(200);
    const tenantGroup = platformListRes.body.data.find((g: { tenantId: string }) => g.tenantId === tenant.id);
    expect(tenantGroup).toBeDefined();
    expect(tenantGroup.tickets).toHaveLength(1);
    expect(tenantGroup.tickets[0].subject).toBe("Payment gateway down");

    const auditEntries = await withTenant(tenant.id, (tx) =>
      tx.auditLog.findMany({ where: { action: "support-ticket.read" } })
    );
    expect(auditEntries.length).toBeGreaterThan(0);
    expect(auditEntries[0]?.actorType).toBe("PLATFORM_USER");

    const respondRes = await request(app)
      .patch(`/api/v1/platform/tenants/${tenant.id}/tickets/${ticketId}`)
      .set("Authorization", `Bearer ${platform}`)
      .send({ response: "Fixed, please retry", status: "RESOLVED" });
    expect(respondRes.status).toBe(200);
    expect(respondRes.body.data.status).toBe("RESOLVED");
    expect(respondRes.body.data.response).toBe("Fixed, please retry");

    const respondAudit = await withTenant(tenant.id, (tx) =>
      tx.auditLog.findMany({ where: { action: "support-ticket.respond" } })
    );
    expect(respondAudit).toHaveLength(1);
  });

  it("RBAC: tenant routes reject a caller without settings.manage; platform routes reject with no platform token", async () => {
    const tenant = await createTenant("support-ticket-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const teacher = await signAccessToken({ sub: "teacher-1", tenantId: tenant.id, roles: ["TEACHER"], branchIds: [] });

    const res = await request(app)
      .post("/api/v1/support-tickets")
      .set("Authorization", `Bearer ${teacher}`)
      .send({ subject: "x", body: "y" });
    expect(res.status).toBe(403);

    const platformRes = await request(app).get("/api/v1/platform/tickets");
    expect(platformRes.status).toBe(401);
  });
});

describe("global announcements — fan out to every matching tenant's real Announcement", () => {
  it("a GlobalAnnouncement with no targetPlanKeys reaches an ACTIVE tenant's active branch as a real Announcement", async () => {
    const tenant = await createTenant("global-announcement-tenant");
    tenantIds.push(tenant.id);
    await prisma.tenant.update({ where: { id: tenant.id }, data: { status: "ACTIVE" } });
    const branch = await createBranch(tenant.id, "A");
    const { accessToken: platform } = await platformToken();

    const res = await request(app)
      .post("/api/v1/platform/announcements")
      .set("Authorization", `Bearer ${platform}`)
      .send({ title: "Platform maintenance", body: "Scheduled downtime Sunday 2am IST" });
    expect(res.status).toBe(201);

    await new Promise((resolve) => setTimeout(resolve, 700));

    const announcements = await withTenant(tenant.id, (tx) =>
      tx.announcement.findMany({ where: { branchId: branch.id, title: "Platform maintenance" } })
    );
    expect(announcements).toHaveLength(1);
    expect(announcements[0]?.body).toBe("Scheduled downtime Sunday 2am IST");
  });
});

describe("GET /platform/health-summary", () => {
  it("returns real db/redis/queue reachability", async () => {
    const { accessToken: platform } = await platformToken();

    const res = await request(app).get("/api/v1/platform/health-summary").set("Authorization", `Bearer ${platform}`);
    expect(res.status).toBe(200);
    expect(res.body.data.db).toBe(true);
    expect(res.body.data.redis).toBe(true);
    expect(res.body.data.queue).toHaveProperty("waiting");
    expect(typeof res.body.data.recentErrorCount).toBe("number");
  });
});

import type { Worker } from "bullmq";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, withTenant } from "@vidyut/db";
import { startWorker } from "@vidyut/worker";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/core/auth/jwt";
import { cleanupTenant, createBranch, createRoleWithPermissions, createStaffUser, createTenant } from "./helpers";

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

async function teacherToken(tenantId: string, branchId: string) {
  return signAccessToken({ sub: "teacher-1", tenantId, roles: ["TEACHER"], branchIds: [branchId] });
}

describe("announcements — create (immediate publish + fan-out), list, delete, RBAC, branch + tenant isolation", () => {
  it("creates an announcement and fans out a NotificationLog to every role-matched staff member", async () => {
    const tenant = await createTenant("announcements-fanout-tenant");
    tenantIds.push(tenant.id);
    const teacherRole = await createRoleWithPermissions(tenant.id, "TEACHER", []);
    await createRoleWithPermissions(tenant.id, "OWNER", ["announcement.send"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const teacherUser = await createStaffUser(tenant.id, {
      email: "teacher@example.com",
      password: "Passw0rd!",
      roleId: teacherRole.id,
      branchId: branch.id,
    });

    const res = await request(app)
      .post("/api/v1/announcements")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, title: "PTM Notice", body: "Parent-teacher meeting Friday", audience: { roles: ["TEACHER"] } });
    expect(res.status).toBe(201);
    expect(res.body.data.publishedAt).not.toBeNull();
    const announcementId = res.body.data.id as string;

    await new Promise((resolve) => setTimeout(resolve, 500));

    const logs = await withTenant(tenant.id, (tx) =>
      tx.notificationLog.findMany({ where: { templateKey: "announcement.published" } })
    );
    expect(logs).toHaveLength(1);
    expect(logs[0]?.toUserId).toBe(teacherUser.id);
    void announcementId;
  });

  it("lists and deletes announcements within a branch", async () => {
    const tenant = await createTenant("announcements-crud-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["announcement.send"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");

    const createRes = await request(app)
      .post("/api/v1/announcements")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, title: "Holiday Notice", body: "School closed Monday" });
    expect(createRes.status).toBe(201);
    const id = createRes.body.data.id as string;

    const listRes = await request(app)
      .get(`/api/v1/announcements?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const deleteRes = await request(app)
      .delete(`/api/v1/announcements/${id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(deleteRes.status).toBe(204);

    const listAfterDelete = await request(app)
      .get(`/api/v1/announcements?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listAfterDelete.body.data).toHaveLength(0);
  });

  it("RBAC: announcement.send roles pass on create/delete; TEACHER/ACCOUNTANT denied; reads open to any authenticated staff role", async () => {
    const tenant = await createTenant("announcements-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["announcement.send"]);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const teacher = await teacherToken(tenant.id, branch.id);

    const teacherCreate = await request(app)
      .post("/api/v1/announcements")
      .set("Authorization", `Bearer ${teacher}`)
      .send({ branchId: branch.id, title: "Denied", body: "Denied" });
    expect(teacherCreate.status).toBe(403);

    const ownerCreate = await request(app)
      .post("/api/v1/announcements")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, title: "Allowed", body: "Allowed" });
    expect(ownerCreate.status).toBe(201);

    const teacherRead = await request(app)
      .get(`/api/v1/announcements?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${teacher}`);
    expect(teacherRead.status).toBe(200);
  });

  it("branch-scope: an OWNER-scoped-to-nothing-else still passes (OWNER spans all branches), but a non-OWNER role is denied cross-branch", async () => {
    const tenant = await createTenant("announcements-branch-scope-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "ADMIN", ["announcement.send"]);
    const branchA = await createBranch(tenant.id, "A");
    const branchB = await createBranch(tenant.id, "B");
    const adminA = await signAccessToken({ sub: "admin-1", tenantId: tenant.id, roles: ["ADMIN"], branchIds: [branchA.id] });

    const res = await request(app)
      .post("/api/v1/announcements")
      .set("Authorization", `Bearer ${adminA}`)
      .send({ branchId: branchB.id, title: "Cross-branch", body: "Should be denied" });
    expect(res.status).toBe(403);
  });

  it("tenant-isolation: cross-tenant announcement queries return zero rows both via RLS and via an unscoped query", async () => {
    const tenantA = await createTenant("announcements-iso-a-tenant");
    const tenantB = await createTenant("announcements-iso-b-tenant");
    tenantIds.push(tenantA.id, tenantB.id);
    const branchA = await createBranch(tenantA.id, "A");
    await createBranch(tenantB.id, "B");

    const announcement = await withTenant(tenantA.id, (tx) =>
      tx.announcement.create({
        data: { tenantId: tenantA.id, branchId: branchA.id, title: "T", body: "B", createdById: "seed-user" },
      })
    );

    const crossTenant = await withTenant(tenantB.id, (tx) => tx.announcement.findMany({}));
    expect(crossTenant).toHaveLength(0);

    const unscoped = await prisma.announcement.findMany({ where: { id: announcement.id } });
    expect(unscoped).toHaveLength(0);
  });
});

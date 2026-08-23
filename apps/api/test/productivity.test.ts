import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { prisma, withTenant } from "@vidyut/db";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/core/auth/jwt";
import { cleanupTenant, createBranch, createRoleWithPermissions, createStaffUser, createTenant } from "./helpers";

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

describe("productivity — staff task assignment (scope #1)", () => {
  it("assigns and completes a task", async () => {
    const tenant = await createTenant("productivity-task-tenant");
    tenantIds.push(tenant.id);
    const ownerRole = await createRoleWithPermissions(tenant.id, "OWNER", ["task.manage"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const staffUser = await createStaffUser(tenant.id, { email: "teacher@task-test.com", password: "Passw0rd!", roleId: ownerRole.id, branchId: branch.id });
    const staff = await withTenant(tenant.id, (tx) =>
      tx.staff.create({
        data: { tenantId: tenant.id, branchId: branch.id, userId: staffUser.id, employeeNo: "EMP-T1", designation: "Teacher", type: "TEACHING", joinedAt: new Date("2024-01-01") },
      })
    );

    const createRes = await request(app)
      .post("/api/v1/productivity/staff-tasks")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, assignedToId: staff.id, title: "Prepare exam hall seating" });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe("OPEN");
    const taskId = createRes.body.data.id as string;

    const completeRes = await request(app)
      .post(`/api/v1/productivity/staff-tasks/${taskId}/complete`)
      .set("Authorization", `Bearer ${owner}`);
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe("DONE");

    const listRes = await request(app)
      .get(`/api/v1/productivity/staff-tasks?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.body.data).toHaveLength(1);
  });

  it("RBAC: a caller without task.manage is denied", async () => {
    const tenant = await createTenant("productivity-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const branch = await createBranch(tenant.id, "A");
    const teacher = await signAccessToken({ sub: "t-1", tenantId: tenant.id, roles: ["TEACHER"], branchIds: [branch.id] });

    const res = await request(app)
      .post("/api/v1/productivity/staff-tasks")
      .set("Authorization", `Bearer ${teacher}`)
      .send({ branchId: branch.id, assignedToId: "x", title: "Y" });
    expect(res.status).toBe(403);
  });
});

describe("productivity — polls reuse Unit 49's Survey model (scope #2, isPoll flag)", () => {
  it("creates a Survey with isPoll: true via the existing surveys endpoint", async () => {
    const tenant = await createTenant("productivity-poll-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["engagement.manage"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");

    const res = await request(app)
      .post("/api/v1/surveys")
      .set("Authorization", `Bearer ${owner}`)
      .send({
        branchId: branch.id,
        title: "Favorite sport day event?",
        audience: { roles: ["STUDENT"] },
        isPoll: true,
        questions: [{ questionText: "Pick one", type: "SINGLE_CHOICE", options: ["Kabaddi", "Cricket"], order: 0 }],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.isPoll).toBe(true);
  });
});

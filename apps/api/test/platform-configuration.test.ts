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

async function ownerToken(tenantId: string, branchIds: string[] = []) {
  return signAccessToken({ sub: "owner-1", tenantId, roles: ["OWNER"], branchIds });
}

describe("Unit 36 — Platform Configuration (settings, branch, user, role management)", () => {
  it("settings.manage: an OWNER can edit the school profile; numbering prefixes take effect on the next admission/invoice number", async () => {
    const tenant = await createTenant("settings-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["settings.manage"]);
    const owner = await ownerToken(tenant.id);

    const res = await request(app)
      .patch("/api/v1/tenants/me/profile")
      .set("Authorization", `Bearer ${owner}`)
      .send({ name: "Renamed School", admissionNoPrefix: "ADM-", invoiceNoPrefix: "SCH-INV-" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Renamed School");
    expect(res.body.data.admissionNoPrefix).toBe("ADM-");

    const refreshed = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    expect(refreshed?.invoiceNoPrefix).toBe("SCH-INV-");
  });

  it("settings.manage is required to edit the profile", async () => {
    const tenant = await createTenant("settings-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", []); // no settings.manage
    const owner = await ownerToken(tenant.id);

    const res = await request(app)
      .patch("/api/v1/tenants/me/profile")
      .set("Authorization", `Bearer ${owner}`)
      .send({ name: "Nope" });
    expect(res.status).toBe(403);
  });

  it("branch.manage: an OWNER can add a second branch and later deactivate it", async () => {
    const tenant = await createTenant("branch-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["branch.manage"]);
    const owner = await ownerToken(tenant.id);

    const createRes = await request(app)
      .post("/api/v1/academic/branches")
      .set("Authorization", `Bearer ${owner}`)
      .send({ name: "Second Campus", code: "B2" });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.code).toBe("B2");

    const listRes = await request(app)
      .get("/api/v1/academic/branches")
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((b: { code: string }) => b.code === "B2")).toBe(true);

    const patchRes = await request(app)
      .patch(`/api/v1/academic/branches/${createRes.body.data.id}`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ isActive: false });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.isActive).toBe(false);
  });

  it("branch.manage is required to create a branch", async () => {
    const tenant = await createTenant("branch-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "PRINCIPAL", []); // no branch.manage
    const principal = await signAccessToken({
      sub: "p1",
      tenantId: tenant.id,
      roles: ["PRINCIPAL"],
      branchIds: [],
    });

    const res = await request(app)
      .post("/api/v1/academic/branches")
      .set("Authorization", `Bearer ${principal}`)
      .send({ name: "Nope", code: "NB" });
    expect(res.status).toBe(403);
  });

  it("user.manage: an OWNER can invite a staff user, then deactivate them", async () => {
    const tenant = await createTenant("user-invite-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["user.manage"]);
    await createRoleWithPermissions(tenant.id, "ADMIN", []);
    const branch = await createBranch(tenant.id, "MAIN");
    const owner = await ownerToken(tenant.id, [branch.id]);

    const inviteRes = await request(app)
      .post("/api/v1/users/invite")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, name: "New Admin", email: "new-admin@example.com", role: "ADMIN" });
    expect(inviteRes.status).toBe(201);
    expect(inviteRes.body.data.email).toBe("new-admin@example.com");
    expect(inviteRes.body.data.devTempPassword).toBeTruthy();

    const created = await withTenant(tenant.id, (tx) =>
      tx.user.findUnique({ where: { id: inviteRes.body.data.userId }, include: { userRoles: true } })
    );
    expect(created?.status).toBe("INVITED");
    expect(created?.userRoles).toHaveLength(1);

    const patchRes = await request(app)
      .patch(`/api/v1/users/${inviteRes.body.data.userId}`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ status: "INACTIVE" });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.status).toBe("INACTIVE");
  });

  it("user.manage: inviting a duplicate email is rejected with CONFLICT", async () => {
    const tenant = await createTenant("user-dup-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["user.manage"]);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const branch = await createBranch(tenant.id, "MAIN");
    const owner = await ownerToken(tenant.id, [branch.id]);

    const input = { branchId: branch.id, name: "Dup", email: "dup@example.com", role: "TEACHER" };
    const first = await request(app).post("/api/v1/users/invite").set("Authorization", `Bearer ${owner}`).send(input);
    expect(first.status).toBe(201);

    const second = await request(app).post("/api/v1/users/invite").set("Authorization", `Bearer ${owner}`).send(input);
    expect(second.status).toBe(409);
  });

  it("role.manage: an OWNER can create one custom role, set its permissions, and system roles reject edits", async () => {
    const tenant = await createTenant("role-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["role.manage"]);
    const systemRole = await createRoleWithPermissions(tenant.id, "TEACHER", ["attendance.mark"]);
    const owner = await ownerToken(tenant.id);

    const createRes = await request(app)
      .post("/api/v1/roles")
      .set("Authorization", `Bearer ${owner}`)
      .send({ name: "Librarian", permissions: ["student.view"] });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.isSystem).toBe(false);
    expect(createRes.body.data.key).toBe("CUSTOM");

    const patchRes = await request(app)
      .patch(`/api/v1/roles/${createRes.body.data.id}/permissions`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ permissions: ["student.view", "fee.view"] });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.rolePermissions).toHaveLength(2);

    // A second custom role for the same tenant is rejected — one per tenant today.
    const secondCustom = await request(app)
      .post("/api/v1/roles")
      .set("Authorization", `Bearer ${owner}`)
      .send({ name: "Another custom role", permissions: [] });
    expect(secondCustom.status).toBe(409);

    // Role.isSystem rows reject a permission-edit attempt.
    const systemEditRes = await request(app)
      .patch(`/api/v1/roles/${systemRole.id}/permissions`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ permissions: ["fee.view"] });
    expect(systemEditRes.status).toBe(403);
  });

  it("role.manage is required to create a role", async () => {
    const tenant = await createTenant("role-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", []); // no role.manage
    const owner = await ownerToken(tenant.id);

    const res = await request(app)
      .post("/api/v1/roles")
      .set("Authorization", `Bearer ${owner}`)
      .send({ name: "Nope", permissions: [] });
    expect(res.status).toBe(403);
  });
});

import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { prisma, withTenant } from "@vidyut/db";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/core/auth/jwt";
import {
  cleanupTenant,
  createBranch,
  createParentUser,
  createRoleWithPermissions,
  createTenant,
} from "./helpers";

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

describe("Unit 39 — DPDP Consent, Retention & Delete-on-Request", () => {
  it("consent: inviting a guardian without consent=true is rejected; with consent=true it sets consentedAt", async () => {
    const tenant = await createTenant("dpdp-consent-tenant");
    tenantIds.push(tenant.id);
    const branch = await createBranch(tenant.id, "MAIN");
    await createRoleWithPermissions(tenant.id, "OWNER", ["guardian.manage"]);
    await createRoleWithPermissions(tenant.id, "PARENT", []);
    const owner = await ownerToken(tenant.id);

    const guardian = await withTenant(tenant.id, (tx) =>
      tx.guardian.create({
        data: { tenantId: tenant.id, name: "Test Guardian", relation: "FATHER", phone: "9990001111" },
      })
    );

    const missingConsent = await request(app)
      .post(`/api/v1/guardians/${guardian.id}/invite`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ consent: false });
    expect(missingConsent.status).toBe(400);

    const withConsent = await request(app)
      .post(`/api/v1/guardians/${guardian.id}/invite`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ consent: true });
    expect(withConsent.status).toBe(200);

    const refreshed = await withTenant(tenant.id, (tx) => tx.guardian.findUnique({ where: { id: guardian.id } }));
    expect(refreshed?.consentedAt).toBeTruthy();
    void branch;
  });

  it("delete-on-request: self-scoped create, OWNER reject with a note, and OWNER execute anonymizes only identity fields", async () => {
    const tenant = await createTenant("dpdp-delete-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["settings.manage"]);
    const parentRole = await createRoleWithPermissions(tenant.id, "PARENT", []);
    const owner = await ownerToken(tenant.id);

    const parentUser = await createParentUser(tenant.id, { phone: "9998887770", roleId: parentRole.id });
    const parentToken = await signAccessToken({
      sub: parentUser.id,
      tenantId: tenant.id,
      roles: ["PARENT"],
      branchIds: [],
    });

    const createRes = await request(app)
      .post("/api/v1/me/data-delete-request")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({ reason: "No longer a parent at this school" });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.requestedById).toBe(parentUser.id);
    expect(createRes.body.data.status).toBe("PENDING");

    const listRes = await request(app)
      .get("/api/v1/data-deletion-requests")
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((r: { id: string }) => r.id === createRes.body.data.id)).toBe(true);

    // A non-OWNER (parent themselves) cannot list/reject/execute.
    const parentListRes = await request(app)
      .get("/api/v1/data-deletion-requests")
      .set("Authorization", `Bearer ${parentToken}`);
    expect(parentListRes.status).toBe(403);

    const executeRes = await request(app)
      .post(`/api/v1/data-deletion-requests/${createRes.body.data.id}/execute`)
      .set("Authorization", `Bearer ${owner}`);
    expect(executeRes.status).toBe(200);
    expect(executeRes.body.data.status).toBe("EXECUTED");

    const refreshedUser = await withTenant(tenant.id, (tx) => tx.user.findUnique({ where: { id: parentUser.id } }));
    expect(refreshedUser?.phone).toBeNull();
    expect(refreshedUser?.name).toBe("Deleted User");
    expect(refreshedUser?.status).toBe("INACTIVE");

    // Cannot execute (or reject) an already-decided request.
    const reExecute = await request(app)
      .post(`/api/v1/data-deletion-requests/${createRes.body.data.id}/execute`)
      .set("Authorization", `Bearer ${owner}`);
    expect(reExecute.status).toBe(409);
  });

  it("reject requires a note and marks the request REJECTED without touching the user", async () => {
    const tenant = await createTenant("dpdp-reject-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["settings.manage"]);
    const parentRole = await createRoleWithPermissions(tenant.id, "PARENT", []);
    const owner = await ownerToken(tenant.id);
    const parentUser = await createParentUser(tenant.id, { phone: "9998887771", roleId: parentRole.id });
    const parentToken = await signAccessToken({
      sub: parentUser.id,
      tenantId: tenant.id,
      roles: ["PARENT"],
      branchIds: [],
    });

    const createRes = await request(app)
      .post("/api/v1/me/data-delete-request")
      .set("Authorization", `Bearer ${parentToken}`)
      .send({});

    const missingNote = await request(app)
      .patch(`/api/v1/data-deletion-requests/${createRes.body.data.id}/reject`)
      .set("Authorization", `Bearer ${owner}`)
      .send({});
    expect(missingNote.status).toBe(400);

    const rejectRes = await request(app)
      .patch(`/api/v1/data-deletion-requests/${createRes.body.data.id}/reject`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ reviewNote: "Active fee dues pending, cannot delete yet" });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe("REJECTED");

    const refreshedUser = await withTenant(tenant.id, (tx) => tx.user.findUnique({ where: { id: parentUser.id } }));
    expect(refreshedUser?.phone).toBe("9998887771"); // untouched
  });

  it("tenant-isolation: OWNER of tenant A cannot see tenant B's deletion requests", async () => {
    const tenantA = await createTenant("dpdp-iso-a");
    const tenantB = await createTenant("dpdp-iso-b");
    tenantIds.push(tenantA.id, tenantB.id);
    await createRoleWithPermissions(tenantA.id, "OWNER", ["settings.manage"]);
    const parentRoleB = await createRoleWithPermissions(tenantB.id, "PARENT", []);
    const ownerA = await ownerToken(tenantA.id);
    const parentUserB = await createParentUser(tenantB.id, { phone: "9998887772", roleId: parentRoleB.id });
    const parentTokenB = await signAccessToken({
      sub: parentUserB.id,
      tenantId: tenantB.id,
      roles: ["PARENT"],
      branchIds: [],
    });

    await request(app)
      .post("/api/v1/me/data-delete-request")
      .set("Authorization", `Bearer ${parentTokenB}`)
      .send({});

    const listRes = await request(app)
      .get("/api/v1/data-deletion-requests")
      .set("Authorization", `Bearer ${ownerA}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(0);
  });
});

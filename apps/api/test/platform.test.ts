import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@vidyut/db";
import { createApp } from "../src/app";
import { signPlatformAccessToken } from "../src/core/auth/platform-jwt";
import { isModuleEnabled, assertWithinLimit } from "../src/core/entitlements";
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
  return { platformUser, accessToken };
}

describe("platform auth", () => {
  it("logs a super-admin in with email+password", async () => {
    const password = "SuperSecret123!";
    const email = `login-${randomUUID()}@vidyut.test`;
    const platformUser = await createPlatformUser({ email, password });
    platformUserIds.push(platformUser.id);

    const res = await request(app).post("/api/v1/platform/auth/login").send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTypeOf("string");
  });

  it("rejects tenant routes with no platform token", async () => {
    const res = await request(app).get("/api/v1/platform/tenants");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("tenant provisioning", () => {
  it("creates a correctly-provisioned tenant the owner can log into", async () => {
    const { accessToken } = await platformToken();
    const slug = `acme-${randomUUID()}`;

    const createRes = await request(app)
      .post("/api/v1/platform/tenants")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Acme School",
        slug,
        planKey: "STANDARD",
        ownerName: "Acme Owner",
        ownerEmail: `owner-${randomUUID()}@acme.test`,
        ownerPassword: "OwnerSecret123!",
      });

    expect(createRes.status).toBe(201);
    const tenantId = createRes.body.data.tenant.id as string;
    tenantIds.push(tenantId);
    expect(createRes.body.data.tenant.appType).toBe("SHARED");
    expect(createRes.body.data.owner.email).toContain("@acme.test");

    // Owner can actually log in — proves roles/permissions were seeded correctly.
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        tenantSlug: slug,
        email: createRes.body.data.owner.email,
        password: "OwnerSecret123!",
      });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeTypeOf("string");

    const payload = JSON.parse(
      Buffer.from(loginRes.body.data.accessToken.split(".")[1], "base64url").toString("utf8")
    );
    expect(payload.roles).toContain("OWNER");

    // Modules matching the STANDARD plan's defaults are enabled; Pro-only ones aren't.
    expect(await isModuleEnabled(tenantId, "exams_reportcards")).toBe(true);
    expect(await isModuleEnabled(tenantId, "multi_branch")).toBe(false);
  });

  it("creates an AppBuild + enqueues a stub job for a dedicated-app plan", async () => {
    const { accessToken } = await platformToken();
    const slug = `enterprise-${randomUUID()}`;

    const createRes = await request(app)
      .post("/api/v1/platform/tenants")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Big Group",
        slug,
        planKey: "ENTERPRISE",
        ownerName: "Big Owner",
        ownerEmail: `owner-${randomUUID()}@big.test`,
        ownerPassword: "OwnerSecret123!",
      });

    expect(createRes.status).toBe(201);
    tenantIds.push(createRes.body.data.tenant.id);
    expect(createRes.body.data.tenant.appType).toBe("DEDICATED");
    expect(createRes.body.data.appBuild).toBeTruthy();
    expect(createRes.body.data.appBuild.storeStatus).toBe("PENDING");
  });

  it("rejects a duplicate slug with 409 CONFLICT", async () => {
    const { accessToken } = await platformToken();
    const slug = `dupe-${randomUUID()}`;
    const payload = {
      name: "Dupe School",
      slug,
      planKey: "STARTER",
      ownerName: "Owner",
      ownerEmail: `owner-${randomUUID()}@dupe.test`,
      ownerPassword: "OwnerSecret123!",
    };

    const first = await request(app)
      .post("/api/v1/platform/tenants")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(payload);
    tenantIds.push(first.body.data.tenant.id);

    const second = await request(app)
      .post("/api/v1/platform/tenants")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ...payload, ownerEmail: `owner2-${randomUUID()}@dupe.test` });

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("CONFLICT");
  });
});

describe("suspension", () => {
  it("blocks tenant API access with 403 TENANT_SUSPENDED once suspended", async () => {
    const { accessToken: platformAccessToken } = await platformToken();
    const slug = `suspend-${randomUUID()}`;

    const createRes = await request(app)
      .post("/api/v1/platform/tenants")
      .set("Authorization", `Bearer ${platformAccessToken}`)
      .send({
        name: "Suspend School",
        slug,
        planKey: "STARTER",
        ownerName: "Owner",
        ownerEmail: `owner-${randomUUID()}@suspend.test`,
        ownerPassword: "OwnerSecret123!",
      });
    const tenantId = createRes.body.data.tenant.id as string;
    tenantIds.push(tenantId);
    const ownerEmail = createRes.body.data.owner.email as string;

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ tenantSlug: slug, email: ownerEmail, password: "OwnerSecret123!" });
    const tenantAccessToken = loginRes.body.data.accessToken as string;

    const okRes = await request(app)
      .get("/api/v1/sample/protected")
      .set("Authorization", `Bearer ${tenantAccessToken}`);
    expect(okRes.status).not.toBe(403);

    const suspendRes = await request(app)
      .patch(`/api/v1/platform/tenants/${tenantId}`)
      .set("Authorization", `Bearer ${platformAccessToken}`)
      .send({ status: "SUSPENDED" });
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.status).toBe("SUSPENDED");

    const blockedRes = await request(app)
      .get("/api/v1/sample/protected")
      .set("Authorization", `Bearer ${tenantAccessToken}`);
    expect(blockedRes.status).toBe(403);
    expect(blockedRes.body.error.code).toBe("TENANT_SUSPENDED");
  });
});

describe("plan change re-seeds toggles; module override persists", () => {
  it("resets toggles on plan change, and a later unrelated action doesn't wipe an override", async () => {
    const { accessToken } = await platformToken();
    const slug = `planchange-${randomUUID()}`;

    const createRes = await request(app)
      .post("/api/v1/platform/tenants")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Plan Change School",
        slug,
        planKey: "STARTER",
        ownerName: "Owner",
        ownerEmail: `owner-${randomUUID()}@planchange.test`,
        ownerPassword: "OwnerSecret123!",
      });
    const tenantId = createRes.body.data.tenant.id as string;
    tenantIds.push(tenantId);

    expect(await isModuleEnabled(tenantId, "exams_reportcards")).toBe(false); // not in STARTER

    const upgradeRes = await request(app)
      .patch(`/api/v1/platform/tenants/${tenantId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ planKey: "STANDARD" });
    expect(upgradeRes.status).toBe(200);
    expect(await isModuleEnabled(tenantId, "exams_reportcards")).toBe(true); // in STANDARD

    // Grant an add-on the STANDARD plan doesn't include by default.
    const overrideRes = await request(app)
      .patch(`/api/v1/platform/tenants/${tenantId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ moduleOverride: { moduleKey: "multi_branch", enabled: true } });
    expect(overrideRes.status).toBe(200);
    expect(await isModuleEnabled(tenantId, "multi_branch")).toBe(true);

    // An unrelated status patch must not wipe the override.
    const unrelatedRes = await request(app)
      .patch(`/api/v1/platform/tenants/${tenantId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ status: "ACTIVE" });
    expect(unrelatedRes.status).toBe(200);
    expect(await isModuleEnabled(tenantId, "multi_branch")).toBe(true);
  });
});

describe("usage endpoint", () => {
  it("returns accurate counts vs plan limits", async () => {
    const { accessToken } = await platformToken();
    const slug = `usage-${randomUUID()}`;

    const createRes = await request(app)
      .post("/api/v1/platform/tenants")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Usage School",
        slug,
        planKey: "STARTER",
        ownerName: "Owner",
        ownerEmail: `owner-${randomUUID()}@usage.test`,
        ownerPassword: "OwnerSecret123!",
      });
    const tenantId = createRes.body.data.tenant.id as string;
    tenantIds.push(tenantId);

    const usageRes = await request(app)
      .get(`/api/v1/platform/tenants/${tenantId}/usage`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(usageRes.status).toBe(200);
    expect(usageRes.body.data.users.used).toBe(1); // just the owner
    expect(usageRes.body.data.users.limit).toBe(15); // STARTER
    expect(usageRes.body.data.branches.used).toBe(1);
    expect(usageRes.body.data.branches.limit).toBe(1);
  });
});

describe("entitlement enforcement", () => {
  it("assertWithinLimit throws LIMIT_EXCEEDED once a plan's limit is reached", async () => {
    const { accessToken } = await platformToken();
    const slug = `limit-${randomUUID()}`;

    const createRes = await request(app)
      .post("/api/v1/platform/tenants")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Limit School",
        slug,
        planKey: "STARTER", // branchLimit: 1
        ownerName: "Owner",
        ownerEmail: `owner-${randomUUID()}@limit.test`,
        ownerPassword: "OwnerSecret123!",
      });
    const tenantId = createRes.body.data.tenant.id as string;
    tenantIds.push(tenantId);

    await expect(assertWithinLimit(tenantId, "branches", 1)).rejects.toThrow();
    await expect(assertWithinLimit(tenantId, "branches", 0)).resolves.toBeUndefined();
  });
});

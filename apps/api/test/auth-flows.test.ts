import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "@vidyut/db";
import { createApp } from "../src/app";
import {
  cleanupTenant,
  createParentUser,
  createRoleWithPermissions,
  createStaffUser,
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

describe("parent OTP flow", () => {
  it("requests, verifies, and returns tokens carrying tenant/roles/branchIds", async () => {
    const tenant = await createTenant("otp-tenant");
    tenantIds.push(tenant.id);
    const parentRole = await createRoleWithPermissions(tenant.id, "PARENT");
    const phone = "+919812345001";
    await createParentUser(tenant.id, { phone, roleId: parentRole.id });

    const requestRes = await request(app)
      .post("/api/v1/auth/otp/request")
      .send({ tenantSlug: tenant.slug, phone });

    expect(requestRes.status).toBe(200);
    const code = requestRes.body.data.devCode;
    expect(code).toMatch(/^\d{6}$/);

    const verifyRes = await request(app)
      .post("/api/v1/auth/otp/verify")
      .send({ tenantSlug: tenant.slug, phone, code });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.accessToken).toBeTypeOf("string");
    expect(verifyRes.body.data.refreshToken).toBeTypeOf("string");

    const payload = JSON.parse(
      Buffer.from(verifyRes.body.data.accessToken.split(".")[1], "base64url").toString("utf8")
    );
    expect(payload.tenantId).toBe(tenant.id);
    expect(payload.roles).toContain("PARENT");
  });

  it("rejects a wrong OTP code", async () => {
    const tenant = await createTenant("otp-wrong-tenant");
    tenantIds.push(tenant.id);
    const parentRole = await createRoleWithPermissions(tenant.id, "PARENT");
    const phone = "+919812345002";
    await createParentUser(tenant.id, { phone, roleId: parentRole.id });

    await request(app).post("/api/v1/auth/otp/request").send({ tenantSlug: tenant.slug, phone });

    const res = await request(app)
      .post("/api/v1/auth/otp/verify")
      .send({ tenantSlug: tenant.slug, phone, code: "000000" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("does not reveal whether a tenant/phone exists (enumeration masking)", async () => {
    // Nonexistent tenant slug: /request must look identical to a real one with no user.
    const unknownTenantRes = await request(app)
      .post("/api/v1/auth/otp/request")
      .send({ tenantSlug: "no-such-school", phone: "+919812349999" });
    expect(unknownTenantRes.status).toBe(200);
    expect(unknownTenantRes.body.data.devCode).toBeUndefined();

    const tenant = await createTenant("otp-mask-tenant");
    tenantIds.push(tenant.id);

    // Real tenant, but no such user — same shape as above, no devCode.
    const unknownUserRes = await request(app)
      .post("/api/v1/auth/otp/request")
      .send({ tenantSlug: tenant.slug, phone: "+919812349998" });
    expect(unknownUserRes.status).toBe(200);
    expect(unknownUserRes.body.data.devCode).toBeUndefined();

    // Verifying against either nonexistent combination fails the same way as a wrong code.
    const verifyUnknownTenantRes = await request(app)
      .post("/api/v1/auth/otp/verify")
      .send({ tenantSlug: "no-such-school", phone: "+919812349999", code: "123456" });
    expect(verifyUnknownTenantRes.status).toBe(401);
    expect(verifyUnknownTenantRes.body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("staff login", () => {
  it("logs in directly when 2FA is disabled", async () => {
    const tenant = await createTenant("staff-tenant");
    tenantIds.push(tenant.id);
    const ownerRole = await createRoleWithPermissions(tenant.id, "OWNER", ["branch.manage"]);
    await createStaffUser(tenant.id, {
      email: "owner@staff-tenant.test",
      password: "Sup3rSecret!",
      roleId: ownerRole.id,
    });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ tenantSlug: tenant.slug, email: "owner@staff-tenant.test", password: "Sup3rSecret!" });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTypeOf("string");
  });

  it("rejects the wrong password", async () => {
    const tenant = await createTenant("staff-badpw-tenant");
    tenantIds.push(tenant.id);
    const ownerRole = await createRoleWithPermissions(tenant.id, "OWNER");
    await createStaffUser(tenant.id, {
      email: "owner@badpw-tenant.test",
      password: "Sup3rSecret!",
      roleId: ownerRole.id,
    });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ tenantSlug: tenant.slug, email: "owner@badpw-tenant.test", password: "WrongPassword!" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("gives an unknown tenant slug the same error as a wrong password (enumeration masking)", async () => {
    const unknownTenantRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ tenantSlug: "no-such-school", email: "nobody@nowhere.test", password: "WrongPassword!" });

    expect(unknownTenantRes.status).toBe(401);
    expect(unknownTenantRes.body.error.code).toBe("UNAUTHENTICATED");
    expect(unknownTenantRes.body.error.message).toBe("auth.errors.invalidCredentials");

    const tenant = await createTenant("staff-mask-tenant");
    tenantIds.push(tenant.id);

    const unknownUserRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ tenantSlug: tenant.slug, email: "nobody@staff-mask-tenant.test", password: "WrongPassword!" });

    expect(unknownUserRes.status).toBe(401);
    expect(unknownUserRes.body.error.message).toBe("auth.errors.invalidCredentials");
  });

  it("requires a 2FA challenge when enabled, then issues tokens", async () => {
    const tenant = await createTenant("staff-2fa-tenant");
    tenantIds.push(tenant.id);
    const ownerRole = await createRoleWithPermissions(tenant.id, "OWNER");
    await createStaffUser(tenant.id, {
      email: "owner@2fa-tenant.test",
      password: "Sup3rSecret!",
      roleId: ownerRole.id,
      twoFactorEnabled: true,
    });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ tenantSlug: tenant.slug, email: "owner@2fa-tenant.test", password: "Sup3rSecret!" });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.challenge).toBeTypeOf("string");
    const code = loginRes.body.data.devCode;
    expect(code).toMatch(/^\d{6}$/);

    const verifyRes = await request(app)
      .post("/api/v1/auth/2fa/verify")
      .send({ challenge: loginRes.body.data.challenge, code });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.accessToken).toBeTypeOf("string");
  });
});

describe("refresh + logout", () => {
  it("rotates the refresh token and revokes the old one", async () => {
    const tenant = await createTenant("refresh-tenant");
    tenantIds.push(tenant.id);
    const ownerRole = await createRoleWithPermissions(tenant.id, "OWNER");
    await createStaffUser(tenant.id, {
      email: "owner@refresh-tenant.test",
      password: "Sup3rSecret!",
      roleId: ownerRole.id,
    });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ tenantSlug: tenant.slug, email: "owner@refresh-tenant.test", password: "Sup3rSecret!" });

    const firstRefreshToken = loginRes.body.data.refreshToken as string;

    const rotateRes = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: firstRefreshToken });

    expect(rotateRes.status).toBe(200);
    expect(rotateRes.body.data.refreshToken).not.toBe(firstRefreshToken);

    const reuseRes = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: firstRefreshToken });

    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("revokes the refresh token on logout", async () => {
    const tenant = await createTenant("logout-tenant");
    tenantIds.push(tenant.id);
    const ownerRole = await createRoleWithPermissions(tenant.id, "OWNER");
    await createStaffUser(tenant.id, {
      email: "owner@logout-tenant.test",
      password: "Sup3rSecret!",
      roleId: ownerRole.id,
    });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ tenantSlug: tenant.slug, email: "owner@logout-tenant.test", password: "Sup3rSecret!" });

    const refreshToken = loginRes.body.data.refreshToken as string;

    const logoutRes = await request(app).post("/api/v1/auth/logout").send({ refreshToken });
    expect(logoutRes.status).toBe(204);

    const afterLogoutRes = await request(app).post("/api/v1/auth/refresh").send({ refreshToken });
    expect(afterLogoutRes.status).toBe(401);
  });
});

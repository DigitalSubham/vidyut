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

describe("GET /me/data-export (Unit 34 — DPDP export)", () => {
  it("returns a PARENT's own data, correctly scoped to only their own children", async () => {
    const tenant = await createTenant("data-export-tenant");
    tenantIds.push(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const cls = await withTenant(tenant.id, (tx) =>
      tx.class.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "Class A", order: 1 } })
    );
    const section = await withTenant(tenant.id, (tx) =>
      tx.section.create({ data: { tenantId: tenant.id, branchId: branch.id, classId: cls.id, name: "A-1" } })
    );

    const ownStudent = await withTenant(tenant.id, (tx) =>
      tx.student.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          admissionNo: "ADM-OWN",
          firstName: "Own",
          lastName: "Child",
          dob: new Date("2012-01-01"),
          gender: "M",
          address: "Patna",
        },
      })
    );
    const otherStudent = await withTenant(tenant.id, (tx) =>
      tx.student.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          admissionNo: "ADM-OTHER",
          firstName: "Other",
          lastName: "Child",
          dob: new Date("2012-01-01"),
          gender: "F",
          address: "Patna",
        },
      })
    );
    void section;

    const parentUser = await withTenant(tenant.id, (tx) =>
      tx.user.create({ data: { tenantId: tenant.id, name: "Parent", phone: "+919812340055", status: "ACTIVE" } })
    );
    const guardian = await withTenant(tenant.id, (tx) =>
      tx.guardian.create({
        data: { tenantId: tenant.id, name: "Parent", relation: "FATHER", phone: "+919812340055", userId: parentUser.id },
      })
    );
    await withTenant(tenant.id, (tx) =>
      tx.studentGuardian.create({
        data: { tenantId: tenant.id, studentId: ownStudent.id, guardianId: guardian.id, isPrimary: true, canPay: true },
      })
    );

    const token = await signAccessToken({ sub: parentUser.id, tenantId: tenant.id, roles: ["PARENT"], branchIds: [] });

    const res = await request(app).get("/api/v1/me/data-export").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(parentUser.id);
    expect(res.body.data.students).toHaveLength(1);
    expect(res.body.data.students[0].student.id).toBe(ownStudent.id);
    expect(res.body.data.students[0].student.id).not.toBe(otherStudent.id);
  });
});

describe("GET /tenants/me/subscription (Unit 34 — closes the subscription.view RBAC gap)", () => {
  it("returns the tenant's real active Subscription + Plan for an OWNER with subscription.view", async () => {
    const tenant = await createTenant("subscription-view-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["subscription.view"]);
    const plan = await prisma.plan.findFirstOrThrow({ where: { key: "STANDARD" } });
    await prisma.subscription.create({
      data: { tenantId: tenant.id, planId: plan.id, status: "ACTIVE", currentPeriodEnd: new Date("2027-01-01") },
    });
    const owner = await ownerToken(tenant.id);

    const res = await request(app).get("/api/v1/tenants/me/subscription").set("Authorization", `Bearer ${owner}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ACTIVE");
    expect(res.body.data.plan.key).toBe("STANDARD");
  });

  it("denies a role without subscription.view", async () => {
    const tenant = await createTenant("subscription-view-denied-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", []); // no subscription.view
    const plan = await prisma.plan.findFirstOrThrow({ where: { key: "STANDARD" } });
    await prisma.subscription.create({
      data: { tenantId: tenant.id, planId: plan.id, status: "ACTIVE", currentPeriodEnd: new Date("2027-01-01") },
    });
    const owner = await ownerToken(tenant.id);

    const res = await request(app).get("/api/v1/tenants/me/subscription").set("Authorization", `Bearer ${owner}`);
    expect(res.status).toBe(403);
  });
});

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

describe("front-office — visitors, gate passes, complaint desk, call/postal logs", () => {
  it("checks a visitor in and out", async () => {
    const tenant = await createTenant("frontoffice-visitor-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["frontoffice.manage"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");

    const checkInRes = await request(app)
      .post("/api/v1/front-office/visitors")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, name: "Ravi Kumar", purpose: "Admission enquiry" });
    expect(checkInRes.status).toBe(201);
    const visitorId = checkInRes.body.data.id as string;

    const checkOutRes = await request(app)
      .post(`/api/v1/front-office/visitors/${visitorId}/check-out`)
      .set("Authorization", `Bearer ${owner}`);
    expect(checkOutRes.status).toBe(200);
    expect(checkOutRes.body.data.checkOutAt).toBeTruthy();

    const listRes = await request(app)
      .get(`/api/v1/front-office/visitors?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.body.data).toHaveLength(1);
  });

  it("creates the walk-in complaint desk entry, call log, and postal log registers", async () => {
    const tenant = await createTenant("frontoffice-registers-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["frontoffice.manage"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");

    const complaintRes = await request(app)
      .post("/api/v1/front-office/complaints")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, raisedByName: "Walk-in Parent", category: "Fees", body: "Receipt not received" });
    expect(complaintRes.status).toBe(201);
    const complaintId = complaintRes.body.data.id as string;

    const resolveRes = await request(app)
      .post(`/api/v1/front-office/complaints/${complaintId}/resolve`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ resolution: "Receipt re-emailed" });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.status).toBe("RESOLVED");

    const callRes = await request(app)
      .post("/api/v1/front-office/call-log")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, direction: "INCOMING", callerName: "Parent", notes: "Asked about timing" });
    expect(callRes.status).toBe(201);

    const postalRes = await request(app)
      .post("/api/v1/front-office/postal-log")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, direction: "INWARD", description: "Board circular" });
    expect(postalRes.status).toBe(201);
  });

  it("RBAC: a caller without frontoffice.manage is denied", async () => {
    const tenant = await createTenant("frontoffice-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const branch = await createBranch(tenant.id, "A");
    const teacher = await signAccessToken({ sub: "t-1", tenantId: tenant.id, roles: ["TEACHER"], branchIds: [branch.id] });

    const res = await request(app)
      .post("/api/v1/front-office/visitors")
      .set("Authorization", `Bearer ${teacher}`)
      .send({ branchId: branch.id, name: "X", purpose: "Y" });
    expect(res.status).toBe(403);
  });
});

describe("front-office — gate pass approval alerts guardians (scope #2)", () => {
  it("approving a gate pass enqueues a real alert that lands as a NotificationLog", async () => {
    const tenant = await createTenant("frontoffice-gatepass-tenant");
    tenantIds.push(tenant.id);
    const ownerRole = await createRoleWithPermissions(tenant.id, "OWNER", ["frontoffice.manage"]);
    const ownerUser = await createStaffUser(tenant.id, { email: "owner@frontoffice-test.com", password: "Passw0rd!", roleId: ownerRole.id });
    const owner = await signAccessToken({ sub: ownerUser.id, tenantId: tenant.id, roles: ["OWNER"], branchIds: [] });
    const branch = await createBranch(tenant.id, "A");
    const student = await withTenant(tenant.id, (tx) =>
      tx.student.create({
        data: { tenantId: tenant.id, branchId: branch.id, admissionNo: "ADM-FO1", firstName: "F", lastName: "One", dob: new Date("2012-01-01"), gender: "M", address: "Patna" },
      })
    );
    const guardianUser = await withTenant(tenant.id, (tx) =>
      tx.user.create({ data: { tenantId: tenant.id, name: "Parent", phone: "+919812340088", status: "ACTIVE" } })
    );
    const guardian = await withTenant(tenant.id, (tx) =>
      tx.guardian.create({ data: { tenantId: tenant.id, name: "Parent", relation: "FATHER", phone: "+919812340088", userId: guardianUser.id } })
    );
    await withTenant(tenant.id, (tx) =>
      tx.studentGuardian.create({ data: { tenantId: tenant.id, studentId: student.id, guardianId: guardian.id, isPrimary: true, canPay: true } })
    );

    const gatePassRes = await request(app)
      .post("/api/v1/front-office/gate-passes")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, studentId: student.id, reason: "Doctor appointment" });
    expect(gatePassRes.status).toBe(201);

    await new Promise((resolve) => setTimeout(resolve, 700));

    const logs = await withTenant(tenant.id, (tx) =>
      tx.notificationLog.findMany({ where: { templateKey: "frontoffice.gatePass" } })
    );
    expect(logs.length).toBeGreaterThan(0);
  });
});

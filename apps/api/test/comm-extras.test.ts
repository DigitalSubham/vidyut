import type { Worker } from "bullmq";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, withTenant } from "@vidyut/db";
import { startWorker } from "@vidyut/worker";
import { createApp } from "../src/app";
import { signAccessToken } from "../src/core/auth/jwt";
import { enqueue } from "../src/core/jobs";
import { cleanupTenant, createBranch, createParentUser, createRoleWithPermissions, createTenant } from "./helpers";

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Unit 68 scope #1 — Guardian alternate contact fields", () => {
  it("creates and patches a guardian with alternatePhone/whatsappOptIn", async () => {
    const tenant = await createTenant("comm-guardian-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["guardian.manage"]);
    const owner = await ownerToken(tenant.id);

    const createRes = await request(app)
      .post("/api/v1/guardians")
      .set("Authorization", `Bearer ${owner}`)
      .send({ name: "Ram Kumar", relation: "FATHER", phone: "9000000001", alternatePhone: "9000000002", whatsappOptIn: true });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.alternatePhone).toBe("9000000002");
    expect(createRes.body.data.whatsappOptIn).toBe(true);

    const patchRes = await request(app)
      .patch(`/api/v1/guardians/${createRes.body.data.id}`)
      .set("Authorization", `Bearer ${owner}`)
      .send({ whatsappOptIn: false });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.whatsappOptIn).toBe(false);
  });
});

describe("Unit 68 scope #2 — CommunicationPreference is a real send-time gate", () => {
  it("a guardian who opts out of PUSH is skipped by the announcement fan-out (default is opted-in)", async () => {
    const tenant = await createTenant("comm-preference-tenant");
    tenantIds.push(tenant.id);
    const ownerRole = await createRoleWithPermissions(tenant.id, "OWNER", ["announcement.send"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const parentRole = await createRoleWithPermissions(tenant.id, "PARENT", []);
    const guardianUser = await createParentUser(tenant.id, { phone: "9000000010", roleId: parentRole.id, branchId: branch.id });
    void ownerRole;

    const klass = await withTenant(tenant.id, (tx) => tx.class.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "5", order: 5 } }));
    const student = await withTenant(tenant.id, (tx) =>
      tx.student.create({ data: { tenantId: tenant.id, branchId: branch.id, admissionNo: "ADM-CP1", firstName: "A", lastName: "B", dob: new Date("2012-01-01"), gender: "M", address: "Patna" } })
    );
    const guardian = await withTenant(tenant.id, (tx) =>
      tx.guardian.create({ data: { tenantId: tenant.id, userId: guardianUser.id, name: "G1", relation: "FATHER", phone: "9000000010" } })
    );
    await withTenant(tenant.id, (tx) =>
      tx.studentGuardian.create({ data: { tenantId: tenant.id, studentId: student.id, guardianId: guardian.id, isPrimary: true, canPay: true } })
    );

    // Opt out of PUSH before the announcement is sent.
    const optOutRes = await request(app)
      .put("/api/v1/me/communication-preferences")
      .set("Authorization", `Bearer ${await signAccessToken({ sub: guardianUser.id, tenantId: tenant.id, roles: ["PARENT"], branchIds: [] })}`)
      .send({ channel: "PUSH", optedIn: false });
    expect(optOutRes.status).toBe(200);

    const announceRes = await request(app)
      .post("/api/v1/announcements")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, title: "Notice", body: "Body", audience: { classIds: [klass.id] } });
    expect(announceRes.status).toBe(201);

    await sleep(3000);

    const logs = await withTenant(tenant.id, (tx) =>
      tx.notificationLog.findMany({ where: { toUserId: guardianUser.id, channel: "PUSH" } })
    );
    expect(logs).toHaveLength(0);
  }, 10000);
});

describe("Unit 68 scope #3 — Newsletter reuses the Announcement fan-out with a distinct template key", () => {
  it("sends a newsletter and it reaches guardians via a real Announcement + fanout", async () => {
    const tenant = await createTenant("comm-newsletter-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["announcement.send"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const parentRole = await createRoleWithPermissions(tenant.id, "PARENT", []);
    const guardianUser = await createParentUser(tenant.id, { phone: "9000000020", roleId: parentRole.id, branchId: branch.id });

    const klass = await withTenant(tenant.id, (tx) => tx.class.create({ data: { tenantId: tenant.id, branchId: branch.id, name: "6", order: 6 } }));
    const student = await withTenant(tenant.id, (tx) =>
      tx.student.create({ data: { tenantId: tenant.id, branchId: branch.id, admissionNo: "ADM-NL1", firstName: "C", lastName: "D", dob: new Date("2012-01-01"), gender: "F", address: "Patna" } })
    );
    const guardian = await withTenant(tenant.id, (tx) =>
      tx.guardian.create({ data: { tenantId: tenant.id, userId: guardianUser.id, name: "G2", relation: "MOTHER", phone: "9000000020" } })
    );
    await withTenant(tenant.id, (tx) =>
      tx.studentGuardian.create({ data: { tenantId: tenant.id, studentId: student.id, guardianId: guardian.id, isPrimary: true, canPay: true } })
    );
    void klass;

    const sendRes = await request(app)
      .post("/api/v1/newsletters")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, title: "Term Update", body: "Exams start next week" });
    expect(sendRes.status).toBe(201);
    expect(sendRes.body.data.sentAt).toBeTruthy();

    await sleep(3000);

    const logs = await withTenant(tenant.id, (tx) =>
      tx.notificationLog.findMany({ where: { toUserId: guardianUser.id, templateKey: "newsletter.sent" } })
    );
    expect(logs.length).toBeGreaterThan(0);

    const listRes = await request(app)
      .get(`/api/v1/newsletters?branchId=${branch.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listRes.body.data).toHaveLength(1);
  }, 10000);
});

describe("Unit 68 scope #4 — birthday automation defaults to on (confirmed with the user)", () => {
  it("sends a birthday greeting to a guardian whose child's dob is today", async () => {
    const tenant = await createTenant("comm-birthday-tenant");
    tenantIds.push(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const parentRole = await createRoleWithPermissions(tenant.id, "PARENT", []);
    const guardianUser = await createParentUser(tenant.id, { phone: "9000000030", roleId: parentRole.id, branchId: branch.id });

    const today = new Date();
    const dobThisYear = new Date(Date.UTC(2015, today.getUTCMonth(), today.getUTCDate()));
    const student = await withTenant(tenant.id, (tx) =>
      tx.student.create({ data: { tenantId: tenant.id, branchId: branch.id, admissionNo: "ADM-BDAY1", firstName: "E", lastName: "F", dob: dobThisYear, gender: "M", address: "Patna" } })
    );
    const guardian = await withTenant(tenant.id, (tx) =>
      tx.guardian.create({ data: { tenantId: tenant.id, userId: guardianUser.id, name: "G3", relation: "FATHER", phone: "9000000030" } })
    );
    await withTenant(tenant.id, (tx) =>
      tx.studentGuardian.create({ data: { tenantId: tenant.id, studentId: student.id, guardianId: guardian.id, isPrimary: true, canPay: true } })
    );

    await enqueue("comm.birthdayScan", { tenantId: tenant.id });

    await sleep(3000);

    const logs = await withTenant(tenant.id, (tx) =>
      tx.notificationLog.findMany({ where: { toUserId: guardianUser.id, templateKey: "birthday.greeting" } })
    );
    expect(logs.length).toBeGreaterThan(0);
  }, 10000);
});

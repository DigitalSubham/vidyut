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

async function makeStudent(tenantId: string, branchId: string, admissionNo: string) {
  return withTenant(tenantId, (tx) =>
    tx.student.create({
      data: { tenantId, branchId, admissionNo, firstName: "W", lastName: admissionNo, dob: new Date("2012-01-01"), gender: "M", address: "Patna" },
    })
  );
}

describe("wellbeing — health records, discipline log, awards, lost & found", () => {
  it("upserts a health record (one per student) and lists discipline incidents/awards", async () => {
    const tenant = await createTenant("wellbeing-basic-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["wellbeing.manage"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const student = await makeStudent(tenant.id, branch.id, "ADM-W1");

    const healthRes = await request(app)
      .post("/api/v1/wellbeing/health-records")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, studentId: student.id, condition: "Asthma", emergencyContact: "+919812340001" });
    expect(healthRes.status).toBe(200);

    // Upserting again for the same student updates, doesn't duplicate.
    const health2Res = await request(app)
      .post("/api/v1/wellbeing/health-records")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, studentId: student.id, condition: "Asthma, mild", emergencyContact: "+919812340001" });
    expect(health2Res.status).toBe(200);
    const allRecords = await withTenant(tenant.id, (tx) => tx.healthRecord.findMany({ where: { studentId: student.id } }));
    expect(allRecords).toHaveLength(1);
    expect(allRecords[0]!.condition).toBe("Asthma, mild");

    const disciplineRes = await request(app)
      .post("/api/v1/wellbeing/discipline-incidents")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, studentId: student.id, type: "MERIT", points: 5, note: "Helped a classmate" });
    expect(disciplineRes.status).toBe(201);

    const listDisciplineRes = await request(app)
      .get(`/api/v1/wellbeing/discipline-incidents?studentId=${student.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(listDisciplineRes.body.data).toHaveLength(1);

    const awardRes = await request(app)
      .post("/api/v1/wellbeing/awards")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, studentId: student.id, title: "Best Debater", awardedAt: "2026-01-15" });
    expect(awardRes.status).toBe(201);

    const lostFoundRes = await request(app)
      .post("/api/v1/wellbeing/lost-found")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, itemDescription: "Blue water bottle", foundLocation: "Playground", foundAt: "2026-02-01" });
    expect(lostFoundRes.status).toBe(201);
    const entryId = lostFoundRes.body.data.id as string;

    const claimRes = await request(app)
      .post(`/api/v1/wellbeing/lost-found/${entryId}/claim`)
      .set("Authorization", `Bearer ${owner}`);
    expect(claimRes.status).toBe(200);
    expect(claimRes.body.data.status).toBe("CLAIMED");
  });

  it("RBAC: a caller without wellbeing.manage is denied", async () => {
    const tenant = await createTenant("wellbeing-rbac-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "TEACHER", []);
    const branch = await createBranch(tenant.id, "A");
    const teacher = await signAccessToken({ sub: "t-1", tenantId: tenant.id, roles: ["TEACHER"], branchIds: [branch.id] });

    const res = await request(app)
      .post("/api/v1/wellbeing/awards")
      .set("Authorization", `Bearer ${teacher}`)
      .send({ branchId: branch.id, studentId: "x", title: "Y", awardedAt: "2026-01-01" });
    expect(res.status).toBe(403);
  });
});

describe("wellbeing — canteen wallet never goes negative (scope #4, same guard as SmsWallet)", () => {
  it("credits and debits correctly, rejecting a debit that would overdraw", async () => {
    const tenant = await createTenant("wellbeing-canteen-tenant");
    tenantIds.push(tenant.id);
    await createRoleWithPermissions(tenant.id, "OWNER", ["wellbeing.manage"]);
    const owner = await ownerToken(tenant.id);
    const branch = await createBranch(tenant.id, "A");
    const student = await makeStudent(tenant.id, branch.id, "ADM-W2");

    const creditRes = await request(app)
      .post("/api/v1/wellbeing/canteen-wallet/credit")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, studentId: student.id, amountPaise: 50000 });
    expect(creditRes.status).toBe(200);
    expect(creditRes.body.data.balancePaise).toBe(50000);

    const debitRes = await request(app)
      .post("/api/v1/wellbeing/canteen-wallet/debit")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, studentId: student.id, amountPaise: 20000, reason: "Lunch" });
    expect(debitRes.status).toBe(200);
    expect(debitRes.body.data.balancePaise).toBe(30000);

    // Overdraw attempt is rejected, balance unaffected.
    const overdraw = await request(app)
      .post("/api/v1/wellbeing/canteen-wallet/debit")
      .set("Authorization", `Bearer ${owner}`)
      .send({ branchId: branch.id, studentId: student.id, amountPaise: 100000 });
    expect(overdraw.status).toBe(422);

    const walletRes = await request(app)
      .get(`/api/v1/wellbeing/canteen-wallet?studentId=${student.id}`)
      .set("Authorization", `Bearer ${owner}`);
    expect(walletRes.body.data.balancePaise).toBe(30000);
    expect(walletRes.body.data.txns).toHaveLength(2);
  });
});
